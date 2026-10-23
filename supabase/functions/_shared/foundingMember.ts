/**
 * Founding Member campaign rules (OVR-026).
 *
 * $19/month Pro access for the first 100 eligible users, for 12 months, then
 * the subscription automatically continues as standard Pro at $29/month.
 * Closed to new users (OVR-079 / OVR-080): only enrolled members keep the rate.
 */

export const FOUNDING_SIGNUP_PLAN = "founding";
export const FOUNDING_SLOT_LIMIT = 100;
export const FOUNDING_DISCOUNT_MONTHS = 12;

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
