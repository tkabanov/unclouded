import type { SignUpUserMetadata } from "@/lib/auth/credentialsApi";

export const REFERRAL_SEARCH_PARAM = "ref";
export const REFERRAL_CODE_AUTH_METADATA_KEY = "referral_code";

const PENDING_REFERRAL_STORAGE_KEY = "uncloud360.pendingReferralCode";
const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4,16}$/;

/** Normalize and validate an inbound referral code from a share link. */
export function normalizeInboundReferralCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function readReferralCodeFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeInboundReferralCode(params.get(REFERRAL_SEARCH_PARAM));
}

export function persistPendingReferralCode(code: string): void {
  try {
    sessionStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, code);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function peekPendingReferralCode(): string | null {
  try {
    return normalizeInboundReferralCode(sessionStorage.getItem(PENDING_REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    sessionStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Read `?ref=` from the URL and persist it for the upcoming signup. */
export function captureReferralFromSearch(search: string): string | null {
  const code = readReferralCodeFromSearch(search);
  if (code) persistPendingReferralCode(code);
  return code;
}

export function buildSignupReferralMetadata(
  referralCode: string | null,
): SignUpUserMetadata | undefined {
  if (!referralCode) return undefined;
  return { [REFERRAL_CODE_AUTH_METADATA_KEY]: referralCode };
}
