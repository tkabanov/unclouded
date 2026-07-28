/**
 * Subscription flow copy, verbatim from
 * `docs/Unclouded _ Individual Subscription Management Flow.md`.
 *
 * Kept in one module so the wording can be diffed against the spec instead of
 * being scattered across dialogs.
 */
import { TIER, type TierSlug } from "@/lib/enums/tier";
import { FOUNDING_MEMBER_LABEL } from "@/lib/subscription/planCatalog";
import { formatSubscriptionDate } from "@/lib/subscription/subscriptionFormat";
import {
  resolveAccessEndsAt,
  type SubscriptionRecord,
} from "@/lib/subscription/subscriptionState";

export type PlanDisplayName = "Pro" | "Premium" | typeof FOUNDING_MEMBER_LABEL;

export function planDisplayName(tier: TierSlug, isFoundingMember: boolean): PlanDisplayName {
  if (tier === TIER.PREMIUM) return "Premium";
  return isFoundingMember ? FOUNDING_MEMBER_LABEL : "Pro";
}

// --- Cancellation -----------------------------------------------------------

export type ConfirmCopy = {
  title: string;
  message: string;
  confirmLabel: string;
  dismissLabel: string;
};

function cancelAccessEndsPhrase(activeUntilDateLabel: string | null): string {
  if (activeUntilDateLabel) {
    return `at the end of your current billing period on ${activeUntilDateLabel}`;
  }
  return "at the end of your current billing period";
}

export function cancelDialogCopy(
  plan: PlanDisplayName,
  activeUntilDateLabel: string | null,
): ConfirmCopy {
  const accessEnds = cancelAccessEndsPhrase(activeUntilDateLabel);

  if (plan === "Premium") {
    return {
      title: "Cancel Premium Subscription?",
      message:
        `Are you sure? You will lose access to Premium features and your unused 1:1 session ` +
        `credits ${accessEnds}. You can continue using your Premium benefits and credits until then.`,
      confirmLabel: "Cancel Subscription",
      dismissLabel: "Keep Premium",
    };
  }

  if (plan === FOUNDING_MEMBER_LABEL) {
    return {
      title: "Cancel Founding Member Subscription?",
      message:
        `Are you sure? You will lose access to Pro features ${accessEnds}. If your subscription ` +
        `expires, your Founding Member price cannot be restored.`,
      confirmLabel: "Cancel Subscription",
      dismissLabel: "Keep Membership",
    };
  }

  return {
    title: "Cancel Pro Subscription?",
    message:
      `Are you sure? You will lose access to Pro features ${accessEnds}. You can continue using ` +
      `your Pro benefits until then.`,
    confirmLabel: "Cancel Subscription",
    dismissLabel: "Keep Pro",
  };
}

export function cancelSuccessMessage(
  plan: PlanDisplayName,
  activeUntilLabel: string,
): string {
  if (plan === "Premium") {
    return (
      `Your Premium subscription has been canceled. You'll continue to have access to Premium ` +
      `features and your unused credits until ${activeUntilLabel}.`
    );
  }
  if (plan === FOUNDING_MEMBER_LABEL) {
    return (
      `Your Founding Member subscription has been canceled. You'll continue to have Pro access ` +
      `until ${activeUntilLabel}.`
    );
  }
  return (
    `Your Pro subscription has been canceled. You'll continue to have access to Pro features ` +
    `until ${activeUntilLabel}.`
  );
}

/** Current-plan badge while auto-renewal is off but access continues (client flow § Scheduled Cancellation). */
export function scheduledCancelStatusLabel(activeUntilDateLabel: string): string {
  return `Canceled — active until ${activeUntilDateLabel}`;
}

/** Summary paragraph under "Your subscription" on Settings → Subscription. */
export function subscriptionSummaryForRecord(
  planName: PlanDisplayName,
  record: SubscriptionRecord,
): string {
  const accessEndsLabel = formatSubscriptionDate(resolveAccessEndsAt(record));
  const accessEndsPhrase = accessEndsLabel ?? "the end of your billing period";

  switch (record.status) {
    case "scheduledToCancel":
      return (
        `Your ${planName} subscription is canceled. You keep access until ${accessEndsPhrase}.`
      );
    case "scheduledToDowngrade":
      return (
        `Your Premium downgrade to Pro is scheduled. Premium access continues until ${accessEndsPhrase}.`
      );
    case "pastDue":
      return `Your ${planName} plan is past due.`;
    case "active":
      return `Your ${planName} plan is active.`;
    case "free":
    case "inactive":
      return "Upgrade to unlock unlimited coaching, premium paths, and reassessment.";
    default: {
      const exhaustive: never = record.status;
      return exhaustive;
    }
  }
}

// --- Resume -----------------------------------------------------------------

export function resumeDialogCopy(plan: PlanDisplayName): ConfirmCopy {
  const extras: string[] = [];
  if (plan === "Premium") {
    extras.push(
      "Your accumulated credits will remain available while your Premium subscription is active.",
    );
  }
  if (plan === FOUNDING_MEMBER_LABEL) {
    extras.push(
      "Resuming before your subscription expires will preserve your Founding Member price.",
    );
  }

  return {
    title: `Resume ${plan} Subscription?`,
    message: [
      `Welcome back! Resuming will restore automatic renewal for your ${plan} subscription. ` +
        `Your current benefits will continue without interruption, and your billing cycle will ` +
        `continue as normal.`,
      ...extras,
    ].join(" "),
    confirmLabel: "Yes, Resume",
    dismissLabel: "Not now",
  };
}

export function resumeSuccessMessage(
  plan: PlanDisplayName,
  nextRenewalLabel: string,
): string {
  return `Your ${plan} subscription has been resumed. Your next renewal date is ${nextRenewalLabel}.`;
}

// --- Downgrade --------------------------------------------------------------

export function downgradeDialogCopy(effectiveLabel: string): ConfirmCopy {
  return {
    title: "Downgrade to Pro?",
    message:
      `Your Premium plan will remain active until the end of your current billing period on ` +
      `${effectiveLabel}. On that date, your account will move to Pro, and you will lose access ` +
      `to 1:1 session booking and any unused credits.`,
    confirmLabel: "Confirm Downgrade",
    dismissLabel: "Keep Premium",
  };
}

export function downgradeSuccessMessage(effectiveLabel: string): string {
  return (
    `Your downgrade is scheduled. You'll keep Premium access and can use your credits until ` +
    `${effectiveLabel}. Your Pro subscription will begin on ${effectiveLabel}.`
  );
}

export function keepPremiumDialogCopy(renewalLabel: string): ConfirmCopy {
  return {
    title: "Keep Premium?",
    message:
      `Your scheduled downgrade will be canceled. Your Premium subscription will continue and ` +
      `renew as normal on ${renewalLabel}.`,
    confirmLabel: "Yes, Keep Premium",
    dismissLabel: "Back",
  };
}

export const KEEP_PREMIUM_SUCCESS_MESSAGE =
  "Your downgrade has been canceled. Your Premium subscription will continue as normal.";

// --- Upgrades ---------------------------------------------------------------

export type CheckoutSuccessOptions = {
  isFoundingMember?: boolean;
  /** When false, Premium is active but the ledger credit is not visible yet. */
  creditGranted?: boolean;
};

export function checkoutSuccessMessage(
  tier: TierSlug | null,
  options: CheckoutSuccessOptions = {},
): string {
  if (tier === TIER.PREMIUM) {
    if (options.creditGranted === false) {
      return (
        "Welcome to Premium! Your Premium features are now available. Your first credit will " +
        "appear shortly."
      );
    }
    return (
      "Welcome to Premium! Your Premium features are now available, and one credit has been " +
      "added to your account."
    );
  }
  if (options.isFoundingMember) {
    return "Welcome, Founding Member! Your Pro features are now available.";
  }
  return "Welcome to Pro! Your Pro features are now available.";
}

/** Returned from Stripe before Supabase reflects the paid tier (missed/slow webhook). */
export function checkoutSuccessPendingMessage(): string {
  return (
    "Your payment was received. If your plan doesn't update in a moment, refresh this page " +
    "or try again shortly."
  );
}

export function checkoutDialogCopy(
  tier: TierSlug,
  options: { foundingEligible?: boolean } = {},
): ConfirmCopy {
  if (tier === TIER.PREMIUM) {
    return {
      title: "Upgrade to Premium",
      message:
        "Get full access to Pro features and earn one credit every month. Two credits can be " +
        "redeemed for one 30-minute 1:1 session. Your Premium benefits will begin immediately " +
        "after your payment is confirmed.",
      confirmLabel: "Continue to Payment",
      dismissLabel: "Back",
    };
  }

  if (options.foundingEligible) {
    return {
      title: "Join as Founding Member",
      message:
        "Get Pro access at the Founding Member rate for your first 12 months — unlimited coaching, " +
        "premium paths, group sessions, and reassessment. Your benefits begin immediately after " +
        "your payment is confirmed.",
      confirmLabel: "Continue to Payment",
      dismissLabel: "Back",
    };
  }

  return {
    title: "Upgrade to Pro",
    message:
      "Get access to premium paths, one group session per month, and reassessment. Your Pro " +
      "benefits will begin immediately after your payment is confirmed.",
    confirmLabel: "Continue to Payment",
    dismissLabel: "Back",
  };
}

export const PRO_TO_PREMIUM_DIALOG_COPY: ConfirmCopy = {
  title: "Upgrade to Premium",
  message:
    "Unlock 1:1 sessions and all Premium features immediately. We'll prorate your current Pro " +
    "subscription and apply the remaining balance toward your new Premium plan.",
  confirmLabel: "Confirm Upgrade",
  dismissLabel: "Keep Pro",
};

export const FOUNDING_TO_PREMIUM_DIALOG_COPY: ConfirmCopy = {
  title: "Upgrade to Premium?",
  message:
    "You'll get immediate access to Premium features, including monthly credits for 1:1 " +
    "sessions. The unused balance from your current billing period will be applied to your " +
    "Premium subscription. By upgrading, you will permanently give up your Founding Member " +
    "price. If you downgrade later, you will move to the standard Pro plan at the current Pro " +
    "price.",
  confirmLabel: "Continue to Premium",
  dismissLabel: "Keep Founding Member",
};

export const PREMIUM_UPGRADE_SUCCESS_MESSAGE =
  "You're now a Premium member. Your Premium features are available immediately, and one " +
  "credit has been added to your account.";

export function premiumUpgradeSuccessMessage(creditGranted: boolean): string {
  if (creditGranted) return PREMIUM_UPGRADE_SUCCESS_MESSAGE;
  return (
    "You're now a Premium member. Your Premium features are available immediately. Your first " +
    "credit will appear shortly."
  );
}

export const UPGRADE_PAYMENT_FAILED_MESSAGE =
  "We couldn't complete your upgrade. Your Pro subscription is still active, and you have not " +
  "been charged. Please check your payment method and try again.";

// --- Founding Member --------------------------------------------------------

export function foundingPricingNotice(conversionDateLabel: string): string {
  return (
    `Your Founding Member price is valid for your first 12 months. On ${conversionDateLabel}, ` +
    `your subscription will automatically continue as Pro at $29/month.`
  );
}

// --- Payment failure --------------------------------------------------------

export const PAYMENT_ISSUE_MESSAGE =
  "We couldn't process your latest payment. Please update your payment method to avoid losing " +
  "access to your subscription benefits.";

export const PAYMENT_RECOVERED_MESSAGE =
  "Your payment method has been updated, and your subscription is active.";

// --- Credits ----------------------------------------------------------------

export const CREDITS_PER_SESSION_HELPER = "Two credits = one 30-minute 1:1 session";

export function nextCreditMessage(dateLabel: string): string {
  return `Your next credit will be added on ${dateLabel}.`;
}

export type CreditsExpireReason = "cancel" | "downgrade";

export function creditsExpireMessage(
  dateLabel: string,
  reason: CreditsExpireReason = "cancel",
): string {
  if (reason === "downgrade") {
    return `Your unused credits will expire on ${dateLabel}.`;
  }
  return `Your unused credits will expire on ${dateLabel} unless you resume your Premium subscription.`;
}

/** Pro card label while a Premium→Pro downgrade is scheduled. */
export function proPlanBeginsMessage(dateLabel: string): string {
  return `Your Pro plan will begin on ${dateLabel}`;
}

export const BOOKING_HELPER_ENOUGH_CREDITS =
  "Two credits will be used after your booking is confirmed.";

export function bookingHelperNotEnoughCredits(balance: number): string {
  return (
    `You currently have ${balance} credit${balance === 1 ? "" : "s"}. Two credits are required ` +
    `to book one 30-minute 1:1 session.`
  );
}

export const CREDITS_UNAVAILABLE_MESSAGE =
  "Your credits are no longer available because your Premium subscription is inactive.";

export function insufficientCreditsError(balance: number): string {
  return (
    `You need two credits to book a 30-minute 1:1 session. You currently have ${balance} ` +
    `credit${balance === 1 ? "" : "s"}.`
  );
}

export const BOOKING_REDIRECT_ERROR =
  "We couldn't open session booking. Your credits have not been deducted. Please try again.";
