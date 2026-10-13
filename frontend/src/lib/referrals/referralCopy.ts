/** NCLDD-56 — referral program copy (English UI). */
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
  "If a friend's first payment is refunded or charged back, the credit for that friend is removed if you haven't used it yet.",
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
