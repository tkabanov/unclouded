/**
 * Individual Subscription Management — shared subscription state vocabulary.
 *
 * Mirrors `frontend/src/lib/subscription/subscriptionState.ts` and the SQL
 * `subscription_effective_tier` resolver. Access is always derived from the
 * status plus the relevant date, never from a `subscribed` boolean, because a
 * scheduled cancellation or downgrade keeps full paid access until its date.
 */

export type SubscriptionStatus =
  | "free"
  | "active"
  | "scheduledToCancel"
  | "scheduledToDowngrade"
  | "pastDue"
  | "inactive";

export type SubscriptionTier = "free" | "pro" | "premium";
export type PaidTier = "pro" | "premium";
export type BillingInterval = "month" | "year";

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

/** Founding Member discount duration before conversion to standard Pro. */
export const FOUNDING_DISCOUNT_MONTHS = 12;

export type SubscriptionStateRow = {
  planTier?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  scheduledDowngradeTier?: string | null;
  scheduledDowngradeEffectiveAt?: string | null;
  gracePeriodEndsAt?: string | null;
};

export function normalizeTier(value: string | null | undefined): SubscriptionTier | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "free" || normalized === "pro" || normalized === "premium") {
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

/**
 * Effective paid tier for access checks. Keeps parity with the SQL resolver so
 * the UI, the edge functions, and RLS cannot disagree.
 */
export function resolveEffectiveTier(
  row: SubscriptionStateRow,
  nowMs = Date.now(),
): SubscriptionTier {
  const planTier = normalizeTier(row.planTier) ?? "free";
  const status = normalizeStatus(row.status);

  switch (status) {
    case "active":
      return planTier;
    case "scheduledToCancel":
      return beforeDeadline(row.currentPeriodEnd, nowMs) ? planTier : "free";
    case "scheduledToDowngrade":
      return beforeDeadline(row.scheduledDowngradeEffectiveAt, nowMs)
        ? planTier
        : (normalizeTier(row.scheduledDowngradeTier) ?? "free");
    case "pastDue":
      return beforeDeadline(row.gracePeriodEndsAt, nowMs) ? planTier : "free";
    case "free":
    case "inactive":
      return "free";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/** The date on which paid access — and any unused credits — stop being usable. */
export function resolveAccessEndsAt(row: SubscriptionStateRow): string | null {
  const status = normalizeStatus(row.status);
  switch (status) {
    case "scheduledToCancel":
      return row.currentPeriodEnd ?? null;
    case "scheduledToDowngrade":
      return row.scheduledDowngradeEffectiveAt ?? null;
    case "pastDue":
      return row.gracePeriodEndsAt ?? null;
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

/**
 * Map a Stripe subscription status onto our state machine. Our own scheduled
 * downgrade is layered on top by the caller because Stripe has no equivalent.
 */
export function statusFromStripe(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
    case "active":
      return cancelAtPeriodEnd ? "scheduledToCancel" : "active";
    case "past_due":
    case "unpaid":
      return "pastDue";
    case "canceled":
    case "incomplete_expired":
      return "inactive";
    case "incomplete":
    case "paused":
      return "inactive";
    default:
      return "inactive";
  }
}

export function graceDeadlineFrom(
  interval: BillingInterval,
  fromMs = Date.now(),
): string {
  const days = GRACE_PERIOD_DAYS[interval];
  return new Date(fromMs + days * 24 * 60 * 60 * 1000).toISOString();
}

export function addMonthsIso(fromIso: string, months: number): string {
  const base = new Date(fromIso);
  const result = new Date(base.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.toISOString();
}
