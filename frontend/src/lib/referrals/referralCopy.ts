/** NCLDD-56 — referral program copy (English UI). */
import type { PartnerClientStatus, PartnerTerms } from "@/lib/referrals/partnerPortalApi";
import { formatMoneyFromCents } from "@/lib/subscription/subscriptionFormat";
import type {
  ReferralCreditReason,
  ReferralInviteeStatus,
} from "@/lib/referrals/referralOverviewApi";

export function bookingHelperReferralCredits(credits: number): string {
  return (
    `One referral credit will be used after your booking is confirmed. ` +
    `You have ${credits} referral credit${credits === 1 ? "" : "s"}.`
  );
}

export const INVITE_FRIEND_TITLE = "Invite a friend";

export const INVITE_FRIEND_SUBTITLE =
  "Share your personal link. When a friend you invite subscribes to Pro or Premium, you earn a free session with a human coach.";

export const REFERRAL_PROGRAM_RULES: readonly string[] = [
  "Your link and code are yours for good — they don't change.",
  "A friend counts as yours when they sign up through your link.",
  "You earn one human-coach session credit the first time each friend pays for Pro or Premium.",
  "Each credit books one 30-minute 1:1 session with a coach on any plan. Credits don't expire.",
  "Credits can't be used for AI sessions.",
  "If a friend's first payment is fully refunded or charged back, the credit for that friend is removed if you haven't used it yet.",
];

export const INVITEE_STATUS_LABELS: Record<ReferralInviteeStatus, string> = {
  pending_confirmation: "Awaiting email confirmation",
  signed_up: "Signed up",
  rewarded: "Credit earned",
};

export function referralHistoryLabel(reason: ReferralCreditReason): string {
  switch (reason) {
    case "referral_reward":
      return "Credit earned";
    case "redemption":
      return "Used for a 1:1 session";
    case "cancel_refund":
      return "Returned — session canceled";
    case "reversal":
      return "Removed — friend's payment refunded";
    case "reversal_restore":
      return "Restored";
    case "admin_adjustment":
      return "Adjusted by support";
  }
}

// ---------------------------------------------------------------------------
// B2B partner portal
// ---------------------------------------------------------------------------

export const PARTNER_PORTAL_TITLE = "Partner portal";

export const PARTNER_PORTAL_SUBTITLE =
  "Share your partner link, see who joined through it and what you've earned.";

export const PARTNER_TERMS_NOT_CONFIGURED =
  "Your commission terms haven't been confirmed yet, so earnings aren't calculated. " +
  "Payments from your clients are still recorded; those made on or after the start date of your " +
  "confirmed terms will be counted.";

export const PARTNER_TERMS_ENDED =
  "No commission terms are active right now. Earnings shown are from your earlier confirmed terms; " +
  "new payments aren't calculated until new terms are confirmed.";

export const PARTNER_INACTIVE_NOTICE =
  "Your partner account is inactive: new sign-ups with your link aren't attributed to you.";

export const PARTNER_CLIENT_STATUS_LABELS: Record<PartnerClientStatus, string> = {
  pending_confirmation: "Awaiting email confirmation",
  signed_up: "Signed up",
  paying: "Paying client",
};

export function describePartnerTerms(terms: PartnerTerms): string {
  const percent = `${Number(terms.commissionPercent.toFixed(2))}%`;
  switch (terms.scope) {
    case "first_payment":
      return `${percent} of each client's first payment`;
    case "months":
      return `${percent} of every payment during a client's first ${terms.scopeMonths ?? 0} month${terms.scopeMonths === 1 ? "" : "s"}`;
    case "lifetime":
      return `${percent} of every payment`;
  }
}

export function formatMoney(cents: number, currency: string | null): string {
  return formatMoneyFromCents(cents, currency ?? "usd") ?? "";
}
