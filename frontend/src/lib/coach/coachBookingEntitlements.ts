import { TIER, type TierSlug } from "@/lib/enums/tier";
import {
  BOOKING_HELPER_ENOUGH_CREDITS,
  CREDITS_UNAVAILABLE_MESSAGE,
  bookingHelperNotEnoughCredits,
  creditsExpireMessage,
  type CreditsExpireReason,
} from "@/lib/subscription/subscriptionCopy";
import { CREDITS_PER_ONE_ON_ONE_SESSION } from "@/lib/subscription/subscriptionState";

/** US-204 / US-603 — 1:1 human coach booking is Premium-only. */
export function canBookHumanCoach(tier: TierSlug): boolean {
  return tier === TIER.PREMIUM;
}

/** Show human coaching entry points for every tier (Free sees upsell on click). */
export function shouldShowHumanCoachingCard(_tier: TierSlug): boolean {
  return true;
}

/** Group coaching sessions — Pro and Premium, one per calendar month. */
export function canBookGroupCoachSession(tier: TierSlug): boolean {
  return tier === TIER.PRO || tier === TIER.PREMIUM;
}

/** @deprecated Use {@link shouldShowHumanCoachingCard} — kept for call-site clarity. */
export function canAccessHumanCoachingCard(tier: TierSlug): boolean {
  return shouldShowHumanCoachingCard(tier);
}

export type OneOnOneButtonState =
  /** Premium with enough credits. */
  | { kind: "bookable"; label: string; helper: string }
  /** Premium, but the balance is short of one session. */
  | { kind: "insufficientCredits"; label: string; helper: string }
  /** Not Premium — offer the upgrade instead of a dead button. */
  | { kind: "locked"; label: string; helper: string };

export type OneOnOneButtonInput = {
  effectiveTier: TierSlug;
  creditBalance: number;
  /** Date the credits stop working — set while a cancellation or downgrade is scheduled. */
  creditsExpireAtLabel?: string | null;
  creditsExpireReason?: CreditsExpireReason;
  requiredCredits?: number;
};

/**
 * Resolves the 1:1 button copy from effective access and credit balance.
 *
 * Advisory only — `request_one_on_one_booking` re-checks both server-side.
 */
export function resolveOneOnOneButtonState(
  input: OneOnOneButtonInput,
): OneOnOneButtonState {
  const required = input.requiredCredits ?? CREDITS_PER_ONE_ON_ONE_SESSION;

  if (input.effectiveTier !== TIER.PREMIUM) {
    // Free/Pro always see the Premium upsell CTA. Orphaned credits from a lapsed
    // subscription change the helper copy but must not replace the button.
    return {
      kind: "locked",
      label: "Unlock 1:1 Sessions",
      helper:
        input.creditBalance > 0
          ? CREDITS_UNAVAILABLE_MESSAGE
          : `Premium adds one credit every month — ${required} credits book one 30-minute session.`,
    };
  }

  if (input.creditBalance < required) {
    return {
      kind: "insufficientCredits",
      label: "Not enough credits",
      helper: bookingHelperNotEnoughCredits(input.creditBalance),
    };
  }

  return {
    kind: "bookable",
    label: "Book a 1:1 Session",
    helper: input.creditsExpireAtLabel
      ? `${BOOKING_HELPER_ENOUGH_CREDITS} ${creditsExpireMessage(
          input.creditsExpireAtLabel,
          input.creditsExpireReason ?? "cancel",
        )}`
      : BOOKING_HELPER_ENOUGH_CREDITS,
  };
}
