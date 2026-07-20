/** REQ-07 — vulnerable cohort re-engagement (grief / recovery + session gap). */

export const VULNERABLE_OUTREACH_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const VULNERABLE_OUTREACH_INACTIVE_DAYS = 10;
export const VULNERABLE_OUTREACH_MESSAGE = "Kota is here when you're ready.";
export const VULNERABLE_OUTREACH_EMAIL_SUBJECT = "Kota is here when you're ready";

export type VulnerableOutreachProfileRow = {
  id: string;
  email: string | null;
  firstName: string | null;
  results: Record<string, unknown> | null;
  vulnerableOutreachEmailedAt: string | null;
  onboardingCompletedAt?: string | null;
  createdAt?: string | null;
};

export function readBooleanFlag(results: Record<string, unknown> | null, key: string): boolean {
  const value = results?.[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "yes" || normalized === "1";
  }
  return false;
}

export function isVulnerableProfile(results: Record<string, unknown> | null): boolean {
  return (
    readBooleanFlag(results, "recovery_mode_active") ||
    readBooleanFlag(results, "grief_mode_active")
  );
}

export function isOutreachCooldownExpired(
  vulnerableOutreachEmailedAt: string | null | undefined,
  nowMs: number,
): boolean {
  if (!vulnerableOutreachEmailedAt) return true;
  const emailedMs = Date.parse(vulnerableOutreachEmailedAt);
  if (!Number.isFinite(emailedMs)) return true;
  return nowMs - emailedMs >= VULNERABLE_OUTREACH_COOLDOWN_MS;
}

export function daysSinceIso(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((nowMs - ms) / (24 * 60 * 60 * 1000)));
}

/**
 * True when days since last session (or since onboarding if never chatted) is ≥ 10.
 */
export function isInactiveForOutreach(params: {
  lastSessionUpdatedAt: string | null | undefined;
  onboardingCompletedAt: string | null | undefined;
  createdAt: string | null | undefined;
  nowMs: number;
}): boolean {
  const referenceIso =
    params.lastSessionUpdatedAt ??
    params.onboardingCompletedAt ??
    params.createdAt ??
    null;
  const days = daysSinceIso(referenceIso, params.nowMs);
  if (days === null) return false;
  return days >= VULNERABLE_OUTREACH_INACTIVE_DAYS;
}

export function listVulnerableOutreachPreCandidatesFromRows(
  rows: VulnerableOutreachProfileRow[],
  nowMs: number,
): VulnerableOutreachProfileRow[] {
  return rows.filter((row) => {
    if (!isVulnerableProfile(row.results)) return false;
    return isOutreachCooldownExpired(row.vulnerableOutreachEmailedAt, nowMs);
  });
}

export function buildVulnerableOutreachEmailHtml(params: {
  firstName: string | null;
  appUrl: string;
}): string {
  const name = params.firstName?.trim() || "there";
  return `
    <p>Hi ${name},</p>
    <p>${VULNERABLE_OUTREACH_MESSAGE}</p>
    <p><a href="${params.appUrl}/dashboard">Open Uncloud360</a></p>
    <p>— Kota</p>
  `;
}

export function buildVulnerableOutreachPushPayload(appUrl: string): {
  title: string;
  body: string;
  url: string;
} {
  return {
    title: "Uncloud360",
    body: VULNERABLE_OUTREACH_MESSAGE,
    url: `${appUrl.replace(/\/$/, "")}/dashboard`,
  };
}
