/** NCLDD-56 — referral program copy (English UI). */

export function bookingHelperReferralCredits(credits: number): string {
  return (
    `One referral credit will be used after your booking is confirmed. ` +
    `You have ${credits} referral credit${credits === 1 ? "" : "s"}.`
  );
}
