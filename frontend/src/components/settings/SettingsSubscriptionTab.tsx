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
import SubscriptionConfirmDialog from "@/components/subscription/SubscriptionConfirmDialog";
import SubscriptionPlanCard from "@/components/subscription/SubscriptionPlanCard";
import { Button } from "@/components/ui/button";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { useSubscriptionOverview } from "@/hooks/useSubscriptionOverview";
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { getTierSubscriptionLabel } from "@/lib/enums/subscription";
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
  keepPremiumDialogCopy,
  planDisplayName,
  PAYMENT_RECOVERED_MESSAGE,
  resumeDialogCopy,
  scheduledCancelStatusLabel,
  subscriptionSummaryForRecord,
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
  BILLING_INTERVAL_SUFFIX,
  findPlanPrice,
  formatPlanPrice,
  formatSubscriptionDate,
  isIntervalAvailable,
} from "@/lib/subscription/subscriptionFormat";
import { resolvePlanCardState } from "@/lib/subscription/subscriptionActions";
import { buildCurrentPlanDetails } from "@/lib/subscription/subscriptionPlanDetails";
import {
  FREE_SUBSCRIPTION_RECORD,
  resolveCreditsExpireAt,
  resolveEffectiveTier,
  resolveNextCreditAt,
  resolveNextRenewalAt,
  resolveAccessEndsAt,
  type BillingInterval,
} from "@/lib/subscription/subscriptionState";
import { bubbleStyle } from "@/styles";
import { cn } from "@/lib/utils";

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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("checkout");
    nextParams.delete("plan");
    setSearchParams(nextParams, { replace: true });

    if (checkout === "success") {
      const expectedTier =
        planParam === TIER.PRO || planParam === TIER.PREMIUM ? planParam : null;

      void reconcileCheckoutReturn(expectedTier)
        .then((next) => {
          applyOverview(next);
          void refreshProfile();
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
          showCheckoutNotice(checkoutSuccessPendingMessage(), "pending");
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

  return (
    <div className="flex flex-col gap-6">
      {showCheckoutSuccessBanner ? (
        <CheckoutSuccessBanner message={checkoutNotice} onDismiss={dismissCheckoutNotice} />
      ) : null}

      <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className={bubbleStyle("Text_heading_3_")}>Your subscription</h2>
            <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
              Manage your plan and billing preferences.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {activeRecord.isFoundingMember ? planName : getTierSubscriptionLabel(effectiveTier)}
          </span>
        </header>

        {isEnterprise ? (
          <p className="text-sm text-muted-foreground">
            Your employer provides Unclouded through an enterprise contract. Session limits and
            individual checkout are disabled for your account.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {effectiveTier === TIER.FREE
              ? "Upgrade to unlock unlimited coaching, premium paths, and reassessment."
              : subscriptionSummaryForRecord(planName, activeRecord)}
          </p>
        )}
      </div>

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

      {!isEnterprise &&
      foundingCampaignEligible &&
      !activeRecord.isFoundingMember &&
      effectiveTier === TIER.FREE ? (
        <div className="rounded-xl border border-border bg-muted/40 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Founding Member offer</p>
          <p className="mt-1">
            {foundingSlotsRemaining > 0
              ? foundingSlotsRemainingMessage(foundingSlotsRemaining)
              : FOUNDING_SLOTS_FULL_MESSAGE}
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

      {!isEnterprise ? <BillingIntervalToggle
        value={interval}
        availableIntervals={availableIntervals}
        onChange={setInterval}
      /> : null}

      {!isEnterprise ? (
        <div
          className={cn(
            bubbleStyle("RepeatingGroup_list_"),
            "grid items-start gap-4 md:grid-cols-3",
          )}
        >
          {PLAN_TIERS.map((tier) => {
            const state = resolvePlanCardState({
              cardTier: tier,
              record: activeRecord,
              accountType: overview?.accountType,
            });
            const price =
              tier === TIER.FREE
                ? null
                : findPlanPrice(
                    prices,
                    tier,
                    interval,
                    tier === TIER.PRO ? presentProAsFounding : activeRecord.isFoundingMember,
                  );

            const freePlanNotice =
              tier === TIER.FREE && effectiveTier !== TIER.FREE
                ? "You'll move to Free automatically when your paid access ends. To end renewal sooner, cancel your current plan above."
                : undefined;

            return (
              <SubscriptionPlanCard
                key={tier}
                tier={tier}
                price={tier === TIER.FREE ? "$0" : formatPlanPrice(price)}
                priceSuffix={tier === TIER.FREE ? "" : BILLING_INTERVAL_SUFFIX[interval]}
                state={state}
                showFoundingLabel={tier === TIER.PRO && presentProAsFounding}
                details={state.isCurrent ? buildCurrentPlanDetails(activeRecord) : []}
                notice={freePlanNotice}
                scheduledCancelStatus={
                  state.isCurrent && state.primary.kind === "resume"
                    ? scheduledCancelBadgeLabel
                    : null
                }
                pendingLabel={
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
                            : flow.pendingLabelFor("startCheckout")
                }
                disabled={!!flow.pendingAction}
                onAction={flow.handlePlanCardAction}
              />
            );
          })}
        </div>
      ) : null}

      {!isEnterprise && activeRecord.hasPaymentMethodOnFile ? (
        <div className={cn(bubbleStyle("Group_card_muted_"), "flex flex-col gap-4 p-6")}>
          <header className="space-y-1">
            <h2 className={bubbleStyle("Text_heading_3_")}>Billing</h2>
            <p className={cn(bubbleStyle("Text_body_muted_"), "text-sm")}>
              Update your payment method, review invoices, and download receipts in the secure
              billing portal.
            </p>
          </header>
          <div>
            <Button
              type="button"
              className={bubbleStyle("Button_primary_")}
              disabled={!!flow.pendingAction}
              onClick={flow.updatePaymentMethod}
            >
              {flow.pendingLabelFor("updatePaymentMethod") ?? "Manage billing"}
            </Button>
          </div>
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
