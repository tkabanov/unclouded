import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { TIER, type TierSlug } from "@/lib/enums/tier";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import type { PlanCardAction, SubscriptionAction } from "@/lib/subscription/subscriptionActions";
import { ACTION_PENDING_LABELS, isActionAllowed } from "@/lib/subscription/subscriptionActions";
import {
  openBillingPortal,
  runSubscriptionAction,
  startCheckout,
  SUBSCRIPTION_ERROR_MESSAGES,
  resumeErrorMessage,
  type SubscriptionActionResult,
} from "@/lib/subscription/subscriptionApi";
import {
  cancelSuccessMessage,
  downgradeSuccessMessage,
  KEEP_PREMIUM_SUCCESS_MESSAGE,
  planDisplayName,
  premiumUpgradeSuccessMessage,
  resumeSuccessMessage,
  UPGRADE_PAYMENT_FAILED_MESSAGE,
} from "@/lib/subscription/subscriptionCopy";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import {
  resolveAccessEndsAt,
  resolveEffectiveTier,
  type BillingInterval,
  type SubscriptionOverview,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

export type SubscriptionDialog =
  | { kind: "cancel" }
  | { kind: "resume" }
  | { kind: "downgrade" }
  | { kind: "keepPremium" }
  | { kind: "premiumUpgrade" }
  | { kind: "checkout"; tier: TierSlug }
  | null;

export type UseSubscriptionFlowArgs = {
  record: SubscriptionRecord | null;
  interval: BillingInterval;
  applyOverview: (next: SubscriptionOverview | null) => void;
  /** Re-reads the profile so tier-gated UI elsewhere updates immediately. */
  onEntitlementChanged: () => Promise<void> | void;
  /** Clears the persistent checkout success banner (e.g. after scheduling a downgrade). */
  onClearCheckoutNotice?: () => void;
};

export type UseSubscriptionFlow = {
  dialog: SubscriptionDialog;
  pendingAction: SubscriptionAction | null;
  pendingLabelFor: (action: SubscriptionAction) => string | null;
  handlePlanCardAction: (action: PlanCardAction) => void;
  closeDialog: () => void;
  confirmDialog: () => void;
  updatePaymentMethod: () => void;
};

export function useSubscriptionFlow({
  record,
  interval,
  applyOverview,
  onEntitlementChanged,
  onClearCheckoutNotice,
}: UseSubscriptionFlowArgs): UseSubscriptionFlow {
  const [dialog, setDialog] = useState<SubscriptionDialog>(null);
  const [pendingAction, setPendingAction] = useState<SubscriptionAction | null>(null);
  // A ref, not the state value: two clicks in the same tick would both see a
  // stale `null` in the render closure and fire two requests.
  const inFlightRef = useRef<SubscriptionAction | null>(null);

  const effectiveTier = record ? resolveEffectiveTier(record) : TIER.FREE;
  const planName = planDisplayName(effectiveTier, record?.isFoundingMember ?? false);

  const closeDialog = useCallback(() => {
    // Never drop a dialog while its request is still running.
    if (inFlightRef.current) return;
    setDialog(null);
  }, []);

  const handlePlanCardAction = useCallback((action: PlanCardAction) => {
    switch (action.kind) {
      case "upgrade":
        setDialog({ kind: "checkout", tier: action.targetTier });
        break;
      case "upgradeToPremium":
        if (record && isActionAllowed("upgradeToPremium", { record })) {
          setDialog({ kind: "premiumUpgrade" });
          break;
        }
        if (record && isActionAllowed("startCheckout", { record })) {
          setDialog({ kind: "checkout", tier: TIER.PREMIUM });
          break;
        }
        toast.error(
          record?.status === "pastDue"
            ? "Fix your payment method before changing plans."
            : "We couldn't start your Premium upgrade. Open Subscription and try again, or contact support.",
        );
        break;
      case "cancel":
        setDialog({ kind: "cancel" });
        break;
      case "resume":
        setDialog({ kind: "resume" });
        break;
      case "downgradeToPro":
        setDialog({ kind: "downgrade" });
        break;
      case "keepPremium":
        setDialog({ kind: "keepPremium" });
        break;
      case "currentPlan":
      case "none":
      case "futurePlan":
        break;
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }, [record]);

  /** Serializes every action so a double-submit cannot reach the server twice. */
  const withPending = useCallback(
    async (action: SubscriptionAction, run: () => Promise<void>) => {
      if (inFlightRef.current) return;
      inFlightRef.current = action;
      setPendingAction(action);
      try {
        await run();
      } finally {
        inFlightRef.current = null;
        setPendingAction(null);
      }
    },
    [],
  );

  const settle = useCallback(
    async (result: SubscriptionActionResult) => {
      applyOverview(result.overview);
      await onEntitlementChanged();
      setDialog(null);
    },
    [applyOverview, onEntitlementChanged],
  );

  const confirmCancel = useCallback(
    () =>
      withPending("cancel", async () => {
        try {
          const result = await runSubscriptionAction("cancel", SUBSCRIPTION_ERROR_MESSAGES.cancel);
          const label =
            formatSubscriptionDate(result.activeUntil ?? record?.currentPeriodEnd) ??
            "the end of your billing period";
          await settle(result);
          toast.success(cancelSuccessMessage(planName, label));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : SUBSCRIPTION_ERROR_MESSAGES.cancel);
        }
      }),
    [planName, record?.currentPeriodEnd, settle, withPending],
  );

  const confirmResume = useCallback(
    () =>
      withPending("resume", async () => {
        const expiresLabel = formatSubscriptionDate(record ? resolveAccessEndsAt(record) : null);
        try {
          const result = await runSubscriptionAction("resume", resumeErrorMessage(expiresLabel));
          const label =
            formatSubscriptionDate(result.nextRenewalAt ?? record?.currentPeriodEnd) ??
            "your next billing date";
          await settle(result);
          toast.success(resumeSuccessMessage(planName, label));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : resumeErrorMessage(expiresLabel));
        }
      }),
    [planName, record, settle, withPending],
  );

  const confirmDowngrade = useCallback(
    () =>
      withPending("scheduleDowngrade", async () => {
        try {
          const result = await runSubscriptionAction(
            "scheduleDowngrade",
            SUBSCRIPTION_ERROR_MESSAGES.downgrade,
          );
          const label =
            formatSubscriptionDate(result.effectiveAt ?? record?.currentPeriodEnd) ??
            "your next billing date";
          await settle(result);
          onClearCheckoutNotice?.();
          toast.success(downgradeSuccessMessage(label));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : SUBSCRIPTION_ERROR_MESSAGES.downgrade);
        }
      }),
    [onClearCheckoutNotice, record?.currentPeriodEnd, settle, withPending],
  );

  const confirmKeepPremium = useCallback(
    () =>
      withPending("cancelDowngrade", async () => {
        try {
          const result = await runSubscriptionAction("cancelDowngrade");
          await settle(result);
          toast.success(KEEP_PREMIUM_SUCCESS_MESSAGE);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : SUBSCRIPTION_ERROR_MESSAGES.generic);
        }
      }),
    [settle, withPending],
  );

  const confirmPremiumUpgrade = useCallback(
    () =>
      withPending("upgradeToPremium", async () => {
        trackProductEvent("plan_upgrade_clicked", { plan_id: TIER.PREMIUM });
        try {
          const result = await runSubscriptionAction(
            "confirmUpgrade",
            UPGRADE_PAYMENT_FAILED_MESSAGE,
          );
          await settle(result);
          const creditGranted = (result.overview?.credits.balance ?? 0) >= 1;
          toast.success(premiumUpgradeSuccessMessage(creditGranted));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : UPGRADE_PAYMENT_FAILED_MESSAGE);
        }
      }),
    [settle, withPending],
  );

  const confirmCheckout = useCallback(
    (tier: TierSlug) =>
      withPending("startCheckout", async () => {
        if (tier === TIER.FREE) return;
        trackProductEvent("plan_upgrade_clicked", { plan_id: tier });
        try {
          const result = await startCheckout(tier, interval);
          if (result.status === "already_subscribed") {
            if (result.overview) {
              applyOverview(result.overview);
            }
            await onEntitlementChanged();
            toast.info(result.message);
            return;
          }
          if (result.status === "blocked") {
            toast.error(result.message);
            return;
          }
          // Stripe Checkout owns the payment step; the webhook activates access.
          window.location.assign(result.url);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : SUBSCRIPTION_ERROR_MESSAGES.checkout);
        }
      }),
    [interval, withPending, applyOverview, onEntitlementChanged],
  );

  const updatePaymentMethod = useCallback(
    () =>
      void withPending("updatePaymentMethod", async () => {
        try {
          const url = await openBillingPortal();
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : SUBSCRIPTION_ERROR_MESSAGES.portal);
        }
      }),
    [withPending],
  );

  const confirmDialog = useCallback(() => {
    if (!dialog) return;
    switch (dialog.kind) {
      case "cancel":
        void confirmCancel();
        break;
      case "resume":
        void confirmResume();
        break;
      case "downgrade":
        void confirmDowngrade();
        break;
      case "keepPremium":
        void confirmKeepPremium();
        break;
      case "premiumUpgrade":
        void confirmPremiumUpgrade();
        break;
      case "checkout":
        void confirmCheckout(dialog.tier);
        break;
      default: {
        const exhaustive: never = dialog;
        return exhaustive;
      }
    }
  }, [
    confirmCancel,
    confirmCheckout,
    confirmDowngrade,
    confirmKeepPremium,
    confirmPremiumUpgrade,
    confirmResume,
    dialog,
  ]);

  const pendingLabelFor = useCallback(
    (action: SubscriptionAction) =>
      pendingAction === action ? ACTION_PENDING_LABELS[action] : null,
    [pendingAction],
  );

  return {
    dialog,
    pendingAction,
    pendingLabelFor,
    handlePlanCardAction,
    closeDialog,
    confirmDialog,
    updatePaymentMethod,
  };
}
