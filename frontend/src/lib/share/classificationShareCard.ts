import { classifications } from "@/lib/classification";

const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ClassificationShareCardMetadata = {
  classificationKey: string;
  classificationName: string;
  tagline: string;
  shareUrl: string;
  referralCode: string;
};

function randomReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFERRAL_CODE_LENGTH));
  return Array.from(bytes, (byte) => REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length]).join("");
}

/** Generate a unique-looking referral code stub (persist via profiles.referralCode). */
export function generateReferralCode(existingCode?: string | null): string {
  if (existingCode?.trim()) return existingCode.trim().toUpperCase();
  return randomReferralCode();
}

function resolveTagline(classificationKey: string): string {
  const entry = classifications[classificationKey];
  if (!entry) return "Personal growth starts with honest self-awareness.";
  return entry.description.split(".")[0]?.trim() ?? entry.name;
}

/** Build share-card metadata for a user's classification + referral link. */
export function buildClassificationShareCardMetadata(params: {
  classificationKey: string;
  referralCode?: string | null;
  origin?: string;
}): ClassificationShareCardMetadata {
  const classificationKey = params.classificationKey.trim();
  const entry = classifications[classificationKey];
  const referralCode = generateReferralCode(params.referralCode);

  return {
    classificationKey,
    classificationName: entry?.name ?? "Your PuP 360 Profile",
    tagline: resolveTagline(classificationKey),
    shareUrl: buildReferralShareUrl(referralCode, params.origin),
    referralCode,
  };
}

/** Personal referral signup link (no classification card required). */
export function buildReferralShareUrl(referralCode: string, origin?: string): string {
  const resolvedOrigin = (origin ?? "https://uncloud360.ai").replace(/\/$/, "");
  const code = generateReferralCode(referralCode);
  return `${resolvedOrigin}/signup?ref=${encodeURIComponent(code)}`;
}
