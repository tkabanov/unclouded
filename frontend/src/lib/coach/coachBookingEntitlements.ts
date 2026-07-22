import { TIER, type TierSlug } from "@/lib/enums/tier";

/** US-204 / US-603 — 1:1 human coach booking is Premium-only. */
export function canBookHumanCoach(tier: TierSlug): boolean {
  return tier === TIER.PREMIUM;
}

/** Group coaching sessions — Pro and Premium (Lovable dashboard human coaching card). */
export function canBookGroupCoachSession(tier: TierSlug): boolean {
  return tier === TIER.PRO || tier === TIER.PREMIUM;
}

/** Show the human coaching card when the user has at least Pro access. */
export function canAccessHumanCoachingCard(tier: TierSlug): boolean {
  return canBookGroupCoachSession(tier);
}
