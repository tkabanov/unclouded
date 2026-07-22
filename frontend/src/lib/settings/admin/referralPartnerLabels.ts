/** Optional display names for known B2B referral codes in admin analytics only. */
const REFERRAL_PARTNER_LABELS: Record<string, string> = {
  // Example: COACH123: "Dr. Jane Partner",
};

export function formatReferralPartnerLabel(referralCode: string): string {
  const normalized = referralCode.trim().toUpperCase();
  return REFERRAL_PARTNER_LABELS[normalized] ?? referralCode;
}
