/**
 * Founding Member campaign rules (OVR-026).
 *
 * $19/month Pro access for the first 100 eligible users, for 12 months, then
 * the subscription automatically continues as standard Pro at $29/month.
 */

export const FOUNDING_SIGNUP_PLAN = "founding";
export const FOUNDING_SLOT_LIMIT = 100;
export const FOUNDING_DISCOUNT_MONTHS = 12;

export type FoundingEligibilityInput = {
  signupPlan?: string | null;
  isFoundingMember?: boolean | null;
};

/**
 * Whether the discounted Pro rate should be used. Already-enrolled members keep
 * it; new users qualify only when they arrived through the founding campaign.
 * The 100-slot cap is enforced in SQL by `claim_founding_member_slot`.
 */
export function isFoundingEligible(input: FoundingEligibilityInput): boolean {
  if (input.isFoundingMember === true) return true;
  return (input.signupPlan ?? "").trim().toLowerCase() === FOUNDING_SIGNUP_PLAN;
}

/** Date on which the discount ends and standard Pro pricing begins. */
export function foundingDiscountEndsAt(startedAtIso: string): string {
  const started = new Date(startedAtIso);
  const ends = new Date(started.getTime());
  ends.setUTCMonth(ends.getUTCMonth() + FOUNDING_DISCOUNT_MONTHS);
  return ends.toISOString();
}

export function isFoundingDiscountExpired(
  foundingDiscountEndsAtIso: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!foundingDiscountEndsAtIso) return false;
  const ends = new Date(foundingDiscountEndsAtIso).getTime();
  return Number.isFinite(ends) && nowMs >= ends;
}
