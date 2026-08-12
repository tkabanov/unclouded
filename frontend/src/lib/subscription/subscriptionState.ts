/**
 * Individual Subscription Management — subscription state vocabulary.
 *
 * Access is derived from the status plus the relevant date, never from a
 * `subscribed` boolean: a scheduled cancellation keeps paid access until the
 * period ends, a scheduled downgrade keeps Premium until the effective date,
 * and a past-due subscription keeps access until the grace period ends.
 *
 * Kept in parity with `supabase/functions/_shared/subscriptionLifecycle.ts` and
 * the SQL `subscription_effective_tier` resolver.
 */
import { TIER, type TierSlug } from "@/lib/enums/tier";

export type SubscriptionStatus =
  | "free"
  | "active"
  | "scheduledToCancel"
  | "scheduledToDowngrade"
  | "pastDue"
  | "inactive";

export type BillingInterval = "month" | "year";
export type PaidTier = "pro" | "premium";

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  "free",
  "active",
  "scheduledToCancel",
  "scheduledToDowngrade",
  "pastDue",
  "inactive",
];

/** Credits required to redeem one 30-minute 1:1 session. */
export const CREDITS_PER_ONE_ON_ONE_SESSION = 2;

/** Payment-provider retry window before paid access is removed. */
export const GRACE_PERIOD_DAYS: Record<BillingInterval, number> = {
  month: 7,
  year: 14,
};

export type SubscriptionRecord = {
  planTier: TierSlug;
  status: SubscriptionStatus;
  billingInterval: BillingInterval | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledDowngradeTier: TierSlug | null;
  scheduledDowngradeEffectiveAt: string | null;
  isFoundingMember: boolean;
  foundingStartedAt: string | null;
  foundingDiscountEndsAt: string | null;
  foundingDiscountForfeitedAt: string | null;
  gracePeriodEndsAt: string | null;
  hasPaymentMethodOnFile: boolean;
  /** False when plan state was set without a Stripe subscription (legacy / manual rows). */
  hasStripeSubscription: boolean;
};

export type PlanPrice = {
  tierSlug: PaidTier;
  billingInterval: BillingInterval;
  amountCents: number | null;
  currency: string;
  isFoundingRate: boolean;
  isActive: boolean;
};

export type SubscriptionOverview = {
  accountType: "individual" | "enterprise";
  enterpriseTier: TierSlug | null;
  effectiveTier: TierSlug;
  subscription: SubscriptionRecord | null;
  credits: { balance: number; requiredPerSession: number };
  prices: PlanPrice[];
  foundingSlotsRemaining: number;
  successPlanAddon: {
    active: boolean;
    purchased: boolean;
    purchasedAt: string | null;
    amountCents: number | null;
    currency: string;
  };
};

export function normalizeTier(value: string | null | undefined): TierSlug | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === TIER.FREE || normalized === TIER.PRO || normalized === TIER.PREMIUM) {
    return normalized;
  }
  return null;
}

export function normalizeStatus(value: string | null | undefined): SubscriptionStatus {
  const normalized = (value ?? "").trim();
  return SUBSCRIPTION_STATUSES.includes(normalized as SubscriptionStatus)
    ? (normalized as SubscriptionStatus)
    : "free";
}

export type EffectiveTierInput = {
  planTier?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  scheduledDowngradeTier?: string | null;
  scheduledDowngradeEffectiveAt?: string | null;
  gracePeriodEndsAt?: string | null;
};

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** True while `deadline` has not been reached (a null deadline never expires). */
function beforeDeadline(deadline: string | null | undefined, nowMs: number): boolean {
  const time = parseTime(deadline);
  return time === null || nowMs < time;
}

export function resolveEffectiveTier(
  input: EffectiveTierInput,
  nowMs = Date.now(),
): TierSlug {
  const planTier = normalizeTier(input.planTier) ?? TIER.FREE;
  const status = normalizeStatus(input.status);

  switch (status) {
    case "active":
      return planTier;
    case "scheduledToCancel":
      return beforeDeadline(input.currentPeriodEnd, nowMs) ? planTier : TIER.FREE;
    case "scheduledToDowngrade":
      return beforeDeadline(input.scheduledDowngradeEffectiveAt, nowMs)
        ? planTier
        : (normalizeTier(input.scheduledDowngradeTier) ?? TIER.FREE);
    case "pastDue":
      return beforeDeadline(input.gracePeriodEndsAt, nowMs) ? planTier : TIER.FREE;
    case "free":
    case "inactive":
      return TIER.FREE;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** Date on which paid access — and any unused Premium credits — stop working. */
export function resolveAccessEndsAt(input: EffectiveTierInput): string | null {
  const status = normalizeStatus(input.status);
  switch (status) {
    case "scheduledToCancel":
      return input.currentPeriodEnd ?? null;
    case "scheduledToDowngrade":
      return input.scheduledDowngradeEffectiveAt ?? null;
    case "pastDue":
      return input.gracePeriodEndsAt ?? null;
    case "active":
    case "free":
    case "inactive":
      return null;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** A renewal date only exists while auto-renewal is still in place. */
export function resolveNextRenewalAt(record: SubscriptionRecord | null): string | null {
  if (!record) return null;
  switch (record.status) {
    case "active":
    case "scheduledToDowngrade":
      return record.currentPeriodEnd;
    case "scheduledToCancel":
    case "pastDue":
    case "free":
    case "inactive":
      return null;
    default: {
      const exhaustive: never = record.status;
      return exhaustive;
    }
  }
}

/**
 * Premium credits keep accruing while Premium renews. They stop — and the
 * balance expires — when a cancellation or a downgrade takes effect.
 */
export function resolveCreditsExpireAt(record: SubscriptionRecord | null): string | null {
  // Important: this must be deterministic for UI/tests. Do not rely on `Date.now()`
  // (which would make “scheduled downgrade in the future” assertions flaky).
  if (!record) return null;

  const planTier = normalizeTier(record.planTier) ?? TIER.FREE;
  if (planTier !== TIER.PREMIUM) return null;

  // Premium credits stop when a cancellation or downgrade takes effect.
  const status = normalizeStatus(record.status);
  switch (status) {
    case "scheduledToCancel":
      return record.currentPeriodEnd ?? null;
    case "scheduledToDowngrade":
      return record.scheduledDowngradeEffectiveAt ?? null;
    case "pastDue":
      return record.gracePeriodEndsAt ?? null;
    case "active":
    case "free":
    case "inactive":
      return null;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

export function resolveNextCreditAt(record: SubscriptionRecord | null): string | null {
  if (!record || record.planTier !== TIER.PREMIUM) return null;
  return resolveNextRenewalAt(record);
}

export function isPaymentFailing(record: SubscriptionRecord | null): boolean {
  return record?.status === "pastDue";
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  free: "Free",
  active: "Active",
  scheduledToCancel: "Canceled",
  scheduledToDowngrade: "Downgrade scheduled",
  pastDue: "Payment failed",
  inactive: "Inactive",
};

/** Fallback record for a user who has never subscribed. */
export const FREE_SUBSCRIPTION_RECORD: SubscriptionRecord = {
  planTier: TIER.FREE,
  status: "free",
  billingInterval: null,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  scheduledDowngradeTier: null,
  scheduledDowngradeEffectiveAt: null,
  isFoundingMember: false,
  foundingStartedAt: null,
  foundingDiscountEndsAt: null,
  foundingDiscountForfeitedAt: null,
  gracePeriodEndsAt: null,
  hasPaymentMethodOnFile: false,
  hasStripeSubscription: false,
};
