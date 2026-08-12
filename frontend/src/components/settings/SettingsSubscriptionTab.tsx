import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import BillingIntervalToggle from "@/components/subscription/BillingIntervalToggle";
import CheckoutConfirmDialog from "@/components/subscription/CheckoutConfirmDialog";
import CheckoutSuccessBanner from "@/components/subscription/CheckoutSuccessBanner";
import PaymentIssueBanner from "@/components/subscription/PaymentIssueBanner";
import PremiumCreditsCard from "@/components/subscription/PremiumCreditsCard";
import PremiumUpgradeDialog from "@/components/subscription/PremiumUpgradeDialog";
import ReassessmentAvailabilityCards from "@/components/settings/ReassessmentAvailabilityCards";
import SubscriptionComparisonTable from "@/components/subscription/SubscriptionComparisonTable";
import SubscriptionConfirmDialog from "@/components/subscription/SubscriptionConfirmDialog";
import { Button } from "@/components/ui/button";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { useUserProfile } from "@/lib/userProfile";
import { isFoundingEligible, capturePlanFromSearch, peekPendingSignupPlan } from "@/lib/share/planAttribution";
import {
  cancelDialogCopy,
  downgradeDialogCopy,
  foundingPricingNotice,
  foundingSlotsRemainingMessage,
  FOUNDING_SLOTS_FULL_MESSAGE,
  checkoutSuccessMessage,
  checkoutSuccessPendingMessage,
  successPlanAddonCheckoutPendingMessage,
  successPlanAddonCheckoutSuccessMessage,
  keepPremiumDialogCopy,
  planDisplayName,
  PAYMENT_RECOVERED_MESSAGE,
  resumeDialogCopy,
  scheduledCancelStatusLabel,
} from "@/lib/subscription/subscriptionCopy";
import {
  reconcileCheckoutReturn,
  syncBillingFromStripe,
} from "@/lib/subscription/subscriptionApi";
import {
  clearPaymentRecoveryPending,
  isPaymentRecoveryPending,
  isRecoveredSubscriptionStatus,
} from "@/lib/subscription/paymentRecoveryNotice";
import {
  BILLING_INTERVAL_LABELS,
  BILLING_INTERVAL_SUFFIX,
  findPlanPrice,
  formatPlanPrice,
  formatSubscriptionDate,
  formatYearlySavingsNote,
  isIntervalAvailable,
} from "@/lib/subscription/subscriptionFormat";
import { resolvePlanCardState } from "@/lib/subscription/subscriptionActions";
import {
  FREE_SUBSCRIPTION_RECORD,
  resolveCreditsExpireAt,
  resolveEffectiveTier,
  resolveNextCreditAt,
  resolveNextRenewalAt,
  resolveAccessEndsAt,
  type BillingInterval,
} from "@/lib/subscription/subscriptionState";
import { ShieldCheck } from "lucide-react";

const PLAN_TIERS: readonly TierSlug[] = [TIER.FREE, TIER.PRO, TIER.PREMIUM];

const CHECKOUT_SUCCESS_TOAST_MS = 12_000;
const CHECKOUT_NOTICE_STORAGE_KEY = "unclouded.checkoutSuccessNotice";

function readStoredCheckoutNotice(): string | null {
  try {
    return sessionStorage.getItem(CHECKOUT_NOTICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistCheckoutNotice(message: string | null): void {
  try {
    if (message) sessionStorage.setItem(CHECKOUT_NOTICE_STORAGE_KEY, message);
    else sessionStorage.removeItem(CHECKOUT_NOTICE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function notifyCheckoutOutcome(message: string, kind: "success" | "pending"): void {
  if (kind === "success") {
    toast.success(message, { duration: CHECKOUT_SUCCESS_TOAST_MS });
  } else {
    toast.message(message, { duration: CHECKOUT_SUCCESS_TOAST_MS });
  }
}

export default function SettingsSubscriptionTab() {
  const { profile, refresh: refreshProfile } = useUserProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { overview, record, loading, error, applyOverview, refresh: refreshOverview } =
    useSubscriptionOverview();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [checkoutSuccessNotice, setCheckoutSuccessNotice] = useState<string | null>(
    readStoredCheckoutNotice,
  );

  const showCheckoutNotice = (message: string, kind: "success" | "pending") => {
    persistCheckoutNotice(message);
    setCheckoutSuccessNotice(message);
    notifyCheckoutOutcome(message, kind);
  };

  const dismissCheckoutNotice = () => {
    persistCheckoutNotice(null);
    setCheckoutSuccessNotice(null);
  };

  const checkoutNotice = checkoutSuccessNotice ?? readStoredCheckoutNotice();

  const isEnterprise = overview?.accountType === "enterprise";
  const activeRecord = record ?? FREE_SUBSCRIPTION_RECORD;
  const effectiveTier = overview?.effectiveTier ?? resolveEffectiveTier(activeRecord);
  const prices = overview?.prices ?? [];
  const foundingSlotsRemaining = overview?.foundingSlotsRemaining ?? 0;
  const foundingCampaignEligible = isFoundingEligible({
    isFoundingMember: activeRecord.isFoundingMember,
    signupPlan: profile?.signupPlan ?? peekPendingSignupPlan(),
    foundingDiscountForfeitedAt: activeRecord.foundingDiscountForfeitedAt,
  });
  /** Checkout / Free→Pro offer only — not for already-paid standard Pro. */
  const preferFoundingCheckoutRate =
    foundingCampaignEligible &&
    foundingSlotsRemaining > 0 &&
    effectiveTier === TIER.FREE;
  /**
   * Pro card label/price: enrolled FM keeps $19 branding; Free users see the
   * campaign offer; post-conversion (and any standard Pro) always shows $29.
   * Do not key off `signupPlan` alone — it survives after FM ends (SUB-FM-004).
   */
  const presentProAsFounding =
    activeRecord.isFoundingMember || preferFoundingCheckoutRate;

  const flow = useSubscriptionFlow({
    record,
    interval,
    applyOverview,
    onEntitlementChanged: refreshProfile,
    onClearCheckoutNotice: dismissCheckoutNotice,
  });

  /** Auto Stripe sync runs at most once per mount (avoids loops when sync cannot clear stale flags). */
  const billingAutoSyncAttemptedRef = useRef(false);
  /** Tracks pastDue within this mount so in-session recovery can show confirmation copy. */
  const wasPastDueRef = useRef(false);
  const paymentRecoveryNoticeShownRef = useRef(false);
  const paymentRecoverySyncAttemptedRef = useRef(false);

  const notifyPaymentRecovered = () => {
    if (paymentRecoveryNoticeShownRef.current) return;
    paymentRecoveryNoticeShownRef.current = true;
    clearPaymentRecoveryPending();
    showCheckoutNotice(PAYMENT_RECOVERED_MESSAGE, "success");
  };

  useEffect(() => {
    const qs = searchParams.toString();
    if (qs) capturePlanFromSearch(`?${qs}`);
  }, [searchParams]);

  useEffect(() => {
    if (
      activeRecord.status === "scheduledToCancel" ||
      activeRecord.status === "scheduledToDowngrade"
    ) {
      dismissCheckoutNotice();
    }
  }, [activeRecord.status]);

  useEffect(() => {
    if (activeRecord.status === "pastDue") {
      wasPastDueRef.current = true;
      return;
    }
    if (wasPastDueRef.current && isRecoveredSubscriptionStatus(activeRecord.status)) {
      wasPastDueRef.current = false;
      notifyPaymentRecovered();
    }
  }, [activeRecord.status]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    const planParam = searchParams.get("plan");
    const addonParam = searchParams.get("addon");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("checkout");
    nextParams.delete("plan");
    nextParams.delete("addon");
    setSearchParams(nextParams, { replace: true });

    if (checkout === "success") {
      const expectSuccessPlanAddon = addonParam === "success_plan";
      const expectedTier =
        planParam === TIER.PRO || planParam === TIER.PREMIUM ? planParam : null;

      void reconcileCheckoutReturn(expectedTier, { expectSuccessPlanAddon })
        .then((next) => {
          applyOverview(next);
          void refreshProfile();
          if (expectSuccessPlanAddon) {
            showCheckoutNotice(
              next.successPlanAddon.active
                ? successPlanAddonCheckoutSuccessMessage()
                : successPlanAddonCheckoutPendingMessage(),
              next.successPlanAddon.active ? "success" : "pending",
            );
            return;
          }
          const isFoundingMember = next.subscription?.isFoundingMember ?? false;
          const creditGranted = next.credits.balance >= 1;
          const successOptions = { isFoundingMember, creditGranted };
          const tierMatches =
            expectedTier !== null && next.effectiveTier === expectedTier;
          if (tierMatches) {
            showCheckoutNotice(
              checkoutSuccessMessage(expectedTier, successOptions),
              creditGranted || expectedTier !== TIER.PREMIUM ? "success" : "pending",
            );
          } else if (next.effectiveTier !== TIER.FREE) {
            showCheckoutNotice(
              checkoutSuccessMessage(next.effectiveTier, {
                ...successOptions,
                creditGranted:
                  next.effectiveTier === TIER.PREMIUM ? creditGranted : true,
              }),
              next.effectiveTier === TIER.PREMIUM && !creditGranted
                ? "pending"
                : "success",
            );
          } else {
            showCheckoutNotice(checkoutSuccessPendingMessage(), "pending");
          }
        })
        .catch((err: unknown) => {
          console.warn("Checkout return reconcile failed", err);
          void refreshOverview();
          void refreshProfile();
          showCheckoutNotice(
            expectSuccessPlanAddon
              ? successPlanAddonCheckoutPendingMessage()
              : checkoutSuccessPendingMessage(),
            "pending",
          );
        });
      return;
    }

    if (checkout === "cancelled") {
      toast.message("Checkout was cancelled.");
    }
  }, [searchParams, setSearchParams, applyOverview, refreshOverview, refreshProfile]);

  useEffect(() => {
    if (searchParams.get("billing") !== "portal") return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    setSearchParams(nextParams, { replace: true });

    paymentRecoverySyncAttemptedRef.current = true;
    const expectRecovery = isPaymentRecoveryPending();
    let cancelled = false;
    void syncBillingFromStripe()
      .then((next) => {
        if (cancelled) return;
        applyOverview(next);
        void refreshProfile({ silent: true });
        if (expectRecovery && isRecoveredSubscriptionStatus(next.subscription?.status)) {
          notifyPaymentRecovered();
        } else if (expectRecovery) {
          clearPaymentRecoveryPending();
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn("Billing portal return sync failed", err);
        void refreshOverview();
        void refreshProfile({ silent: true });
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, applyOverview, refreshOverview, refreshProfile]);

  /** Fallback when portal return_url lacks billing=portal (or overview refreshed in-session). */
  useEffect(() => {
    if (loading || !overview || isEnterprise) return;
    if (searchParams.get("billing") === "portal") return;
    if (!isPaymentRecoveryPending() || paymentRecoverySyncAttemptedRef.current) return;

    paymentRecoverySyncAttemptedRef.current = true;
    let cancelled = false;
    void syncBillingFromStripe()
      .then((next) => {
        if (cancelled) return;
        applyOverview(next);
        void refreshProfile({ silent: true });
        if (isRecoveredSubscriptionStatus(next.subscription?.status)) {
          notifyPaymentRecovered();
        } else {
          clearPaymentRecoveryPending();
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn("Payment recovery sync failed", err);
        paymentRecoverySyncAttemptedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [loading, overview, isEnterprise, searchParams, applyOverview, refreshProfile]);

  useEffect(() => {
    if (loading || !overview || isEnterprise || billingAutoSyncAttemptedRef.current) return;
    const sub = overview.subscription;
    // Saved payment method on Free is normal after cancel; only sync when Stripe still owns a sub.
    const billingLooksStale =
      overview.effectiveTier === TIER.FREE && sub?.hasStripeSubscription === true;
    if (!billingLooksStale) return;

    billingAutoSyncAttemptedRef.current = true;
    let cancelled = false;
    void syncBillingFromStripe()
      .then((next) => {
        if (cancelled) return;
        applyOverview(next);
        void refreshProfile({ silent: true });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn("Billing sync from Stripe skipped", err);
      });

    return () => {
      cancelled = true;
    };
  }, [loading, overview, isEnterprise, applyOverview, refreshProfile]);

  const availableIntervals = useMemo<BillingInterval[]>(
    () =>
      (["month", "year"] as BillingInterval[]).filter(
        (candidate) => candidate === "month" || isIntervalAvailable(prices, candidate),
      ),
    [prices],
  );

  const checkoutTier = flow.dialog?.kind === "checkout" ? flow.dialog.tier : null;
  const planName = planDisplayName(effectiveTier, activeRecord.isFoundingMember);
  const cancelActiveUntilDate = formatSubscriptionDate(activeRecord.currentPeriodEnd);
  const scheduledCancelBadgeLabel = useMemo(() => {
    if (activeRecord.status !== "scheduledToCancel") return null;
    const until = formatSubscriptionDate(resolveAccessEndsAt(activeRecord));
    return until ? scheduledCancelStatusLabel(until) : null;
  }, [activeRecord]);
  const renewalLabel =
    formatSubscriptionDate(resolveNextRenewalAt(activeRecord)) ?? "your next billing date";

  const showCheckoutSuccessBanner =
    checkoutNotice &&
    activeRecord.status !== "scheduledToCancel" &&
    activeRecord.status !== "scheduledToDowngrade";

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {showCheckoutSuccessBanner ? (
          <CheckoutSuccessBanner message={checkoutNotice} onDismiss={dismissCheckoutNotice} />
        ) : null}
        <div className="text-sm text-muted-foreground">Loading subscription…</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  const comparisonColumns = PLAN_TIERS.map((tier) => {
    const state = resolvePlanCardState({
      cardTier: tier,
      record: activeRecord,
      accountType: overview?.accountType,
    });
    const price =
      tier === TIER.FREE
        ? null
        : findPlanPrice(prices, tier, interval, activeRecord.isFoundingMember);
    const priceNote =
      tier !== TIER.FREE && interval === "year"
        ? formatYearlySavingsNote(
            price,
            findPlanPrice(prices, tier, "month", activeRecord.isFoundingMember),
          )
        : null;

    return {
      tier,
      price: tier === TIER.FREE ? "$0" : formatPlanPrice(price),
      priceSuffix: tier === TIER.FREE ? "/month" : BILLING_INTERVAL_SUFFIX[interval],
      priceNote,
      showFoundingLabel: tier === TIER.PRO && activeRecord.isFoundingMember,
      state,
      scheduledCancelStatus:
        state.isCurrent && state.primary.kind === "resume" ? scheduledCancelBadgeLabel : null,
      pendingLabel:
        state.primary.kind === "cancel"
          ? flow.pendingLabelFor("cancel")
          : state.primary.kind === "resume"
            ? flow.pendingLabelFor("resume")
            : state.primary.kind === "downgradeToPro"
              ? flow.pendingLabelFor("scheduleDowngrade")
              : state.primary.kind === "keepPremium"
                ? flow.pendingLabelFor("cancelDowngrade")
                : state.primary.kind === "upgradeToPremium"
                  ? flow.pendingLabelFor("upgradeToPremium")
                  : flow.pendingLabelFor("startCheckout"),
    };
  });

  const foundingProPrice = findPlanPrice(prices, TIER.PRO, "month", true);
  const standardProPrice = findPlanPrice(prices, TIER.PRO, "month", false);

  return (
    <div className="flex flex-col gap-6">
      {showCheckoutSuccessBanner ? (
        <CheckoutSuccessBanner message={checkoutNotice} onDismiss={dismissCheckoutNotice} />
      ) : null}

      {isEnterprise ? (
        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
          Your employer provides Unclouded through an enterprise contract. Session limits and
          individual checkout are disabled for your account.
        </div>
      ) : null}

      {!isEnterprise && activeRecord.status === "pastDue" ? (
        <PaymentIssueBanner
          gracePeriodEndsAt={activeRecord.gracePeriodEndsAt}
          pending={flow.pendingAction === "updatePaymentMethod"}
          onUpdatePaymentMethod={flow.updatePaymentMethod}
        />
      ) : null}

      <ReassessmentAvailabilityCards profile={profile} isEnterprise={isEnterprise} />

      {!isEnterprise && activeRecord.isFoundingMember && activeRecord.foundingDiscountEndsAt ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Founding Member pricing</p>
          <p className="mt-1">
            {foundingPricingNotice(
              formatSubscriptionDate(activeRecord.foundingDiscountEndsAt) ?? "your renewal date",
            )}
          </p>
        </div>
      ) : null}

      {!isEnterprise && effectiveTier === TIER.PREMIUM ? (
        <PremiumCreditsCard
          balance={overview?.credits.balance ?? 0}
          nextCreditAt={resolveNextCreditAt(activeRecord)}
          creditsExpireAt={resolveCreditsExpireAt(activeRecord)}
          redeemable
          creditsExpireReason={
            activeRecord.status === "scheduledToDowngrade" ? "downgrade" : "cancel"
          }
        />
      ) : null}

      {!isEnterprise && effectiveTier !== TIER.PREMIUM && (overview?.credits.balance ?? 0) > 0 ? (
        <PremiumCreditsCard
          balance={overview?.credits.balance ?? 0}
          nextCreditAt={null}
          creditsExpireAt={null}
          redeemable={false}
        />
      ) : null}

      {!isEnterprise && (effectiveTier === TIER.PRO || effectiveTier === TIER.PREMIUM) ? (
        overview?.successPlanAddon.active ? (
          <div className="rounded-xl border border-border bg-muted/30 p-5">
            <h3 className="text-base font-semibold text-foreground">Success Plan access</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Success Plans are unlocked. You can start any of the seven Success Plans from the
              library.
            </p>
          </div>
        ) : null
      ) : null}

      {!isEnterprise ? (
        <BillingIntervalToggle
          value={interval}
          availableIntervals={availableIntervals}
          onChange={setInterval}
        />
      ) : null}

      {!isEnterprise ? (
        <SubscriptionComparisonTable
          columns={comparisonColumns}
          disabled={!!flow.pendingAction}
          onAction={flow.handlePlanCardAction}
          billingIntervalLabel={BILLING_INTERVAL_LABELS[interval].toLowerCase()}
        />
      ) : null}

      {!isEnterprise &&
      foundingCampaignEligible &&
      !activeRecord.isFoundingMember &&
      effectiveTier === TIER.FREE ? (
        <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Founding Member — {formatPlanPrice(foundingProPrice)}
                {BILLING_INTERVAL_SUFFIX.month}
              </p>
              <p className="text-sm text-muted-foreground">
                {foundingSlotsRemaining > 0
                  ? `Get Pro access at a discounted price for your first 12 months. Available only to the first 100 eligible users. Converts to standard Pro at ${formatPlanPrice(standardProPrice)}${BILLING_INTERVAL_SUFFIX.month} afterwards. ${foundingSlotsRemainingMessage(foundingSlotsRemaining)}`
                  : FOUNDING_SLOTS_FULL_MESSAGE}
              </p>
            </div>
          </div>
          {foundingSlotsRemaining > 0 ? (
            <Button
              type="button"
              className="shrink-0"
              disabled={!!flow.pendingAction}
              onClick={() =>
                flow.handlePlanCardAction({
                  kind: "upgrade",
                  targetTier: TIER.PRO,
                  label: "Become a Founding Member",
                })
              }
            >
              {flow.pendingLabelFor("startCheckout") ?? "Become a Founding Member"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isEnterprise && activeRecord.hasPaymentMethodOnFile ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Billing</h2>
            <p className="text-sm text-muted-foreground">
              Update your payment method, review invoices, and download receipts in the secure
              billing portal.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!!flow.pendingAction}
            onClick={flow.updatePaymentMethod}
          >
            {flow.pendingLabelFor("updatePaymentMethod") ?? "Manage billing"}
          </Button>
        </div>
      ) : null}

      <SubscriptionConfirmDialog
        open={flow.dialog?.kind === "cancel"}
        copy={cancelDialogCopy(planName, cancelActiveUntilDate)}
        destructive
        pendingLabel={flow.pendingLabelFor("cancel")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />

      <SubscriptionConfirmDialog
        open={flow.dialog?.kind === "resume"}
        copy={resumeDialogCopy(planName)}
        pendingLabel={flow.pendingLabelFor("resume")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />

      <SubscriptionConfirmDialog
        open={flow.dialog?.kind === "downgrade"}
        copy={downgradeDialogCopy(renewalLabel)}
        destructive
        pendingLabel={flow.pendingLabelFor("scheduleDowngrade")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />

      <SubscriptionConfirmDialog
        open={flow.dialog?.kind === "keepPremium"}
        copy={keepPremiumDialogCopy(renewalLabel)}
        pendingLabel={flow.pendingLabelFor("cancelDowngrade")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />

      <PremiumUpgradeDialog
        open={flow.dialog?.kind === "premiumUpgrade"}
        isFoundingMember={activeRecord.isFoundingMember}
        pendingLabel={flow.pendingLabelFor("upgradeToPremium")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />

      <CheckoutConfirmDialog
        open={flow.dialog?.kind === "checkout"}
        tier={checkoutTier}
        interval={interval}
        price={
          checkoutTier
            ? findPlanPrice(
                prices,
                checkoutTier,
                interval,
                checkoutTier === TIER.PRO
                  ? presentProAsFounding
                  : activeRecord.isFoundingMember,
              )
            : null
        }
        foundingEligible={checkoutTier === TIER.PRO && presentProAsFounding}
        pendingLabel={flow.pendingLabelFor("startCheckout")}
        onConfirm={flow.confirmDialog}
        onDismiss={flow.closeDialog}
      />
    </div>
  );
}
