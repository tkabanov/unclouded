import type { SignUpUserMetadata } from "@/lib/auth/credentialsApi";

export const PLAN_SEARCH_PARAM = "plan";
export const SIGNUP_PLAN_AUTH_METADATA_KEY = "signup_plan";
export const FOUNDING_SIGNUP_PLAN = "founding";

const PENDING_SIGNUP_PLAN_STORAGE_KEY = "uncloud360.pendingSignupPlan";

/** Normalize and validate an inbound signup plan from a marketing link. */
export function normalizeSignupPlan(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized !== FOUNDING_SIGNUP_PLAN) return null;
  return normalized;
}

export function readPlanFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return normalizeSignupPlan(params.get(PLAN_SEARCH_PARAM));
}

function persistPendingSignupPlan(plan: string): void {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_PLAN_STORAGE_KEY, plan);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function peekPendingSignupPlan(): string | null {
  try {
    return normalizeSignupPlan(sessionStorage.getItem(PENDING_SIGNUP_PLAN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearPendingSignupPlan(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_PLAN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/** Read `?plan=` from the URL and persist it for the upcoming signup. */
export function capturePlanFromSearch(search: string): string | null {
  const plan = readPlanFromSearch(search);
  if (plan) persistPendingSignupPlan(plan);
  return plan ?? peekPendingSignupPlan();
}

export function buildSignupPlanMetadata(
  signupPlan: string | null,
): SignUpUserMetadata | undefined {
  if (!signupPlan) return undefined;
  return { [SIGNUP_PLAN_AUTH_METADATA_KEY]: signupPlan };
}
