/**
 * MOB-11 — daily check-in reminder + 5-day inactivity follow-up eligibility.
 *
 * "Qualifying activity" for the inactivity follow-up is any of: a finalized
 * chat/coaching session, a daily check-in, a deep-dive module completion, or
 * path session progress (a `pathResponse` row) — the same surfaces the
 * dashboard shows engagement for. The caller resolves the single latest
 * timestamp across those four sources before calling `isInactivityFollowupDue`;
 * this module only reasons about that already-resolved value, the same split
 * `vulnerableOutreachLogic.ts`'s `isInactiveForOutreach` uses.
 */
import { daysSinceIso } from "./vulnerableOutreachLogic.ts";
import { getDateKey, isNotificationSentToday } from "./moduleUnlockLogic.ts";

export { getDateKey, isNotificationSentToday };

export const INACTIVITY_FOLLOWUP_DAYS = 5;
/** Local hour (24h) the daily check-in reminder is allowed to fire from. */
export const CHECKIN_REMINDER_LOCAL_HOUR = 18;

/** Timezone-empty profiles are treated as UTC, matching OVR-063. */
export function getLocalHour(date: Date, timeZone: string | null | undefined): number {
  const tz = timeZone?.trim() || "UTC";
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(date);
    const parsed = Number(formatted);
    // Some ICU builds format midnight as "24" instead of "0".
    return Number.isFinite(parsed) ? parsed % 24 : date.getUTCHours();
  } catch {
    return date.getUTCHours();
  }
}

export type DailyCheckinReminderProfileRow = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  timeZone?: string | null;
  onboardingCompleted?: boolean;
  checkinReminderSentAt?: string | null;
};

/**
 * Eligible when: onboarding is complete, the user has not checked in today
 * (local calendar date — `checkedInToday` is resolved by the caller from the
 * `dailyCheckin` table), we have not already reminded them today, and local
 * time has reached the evening window.
 */
export function isDailyCheckinReminderDue(
  row: DailyCheckinReminderProfileRow,
  checkedInToday: boolean,
  now: Date,
): boolean {
  if (!row.onboardingCompleted) return false;
  if (checkedInToday) return false;
  if (isNotificationSentToday(row.checkinReminderSentAt, now, row.timeZone)) return false;
  return getLocalHour(now, row.timeZone) >= CHECKIN_REMINDER_LOCAL_HOUR;
}

export type InactivityFollowupProfileRow = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  timeZone?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  createdAt?: string | null;
  inactivityFollowupBaselineActivityAt?: string | null;
};

/**
 * The single reference point for "no activity since": the resolved last
 * activity, else onboarding completion, else account creation — same
 * fallback order as `isInactiveForOutreach`.
 */
export function resolveInactivityBaseline(
  row: Pick<InactivityFollowupProfileRow, "onboardingCompletedAt" | "createdAt">,
  lastActivityAt: string | null,
): string | null {
  return lastActivityAt ?? row.onboardingCompletedAt ?? row.createdAt ?? null;
}

/**
 * Eligible when idle ≥5 days since the resolved baseline and a follow-up has
 * not already been sent for this exact inactivity streak. A new qualifying
 * activity moves the baseline forward, which re-arms eligibility once
 * another 5 idle days pass.
 */
export function isInactivityFollowupDue(
  row: InactivityFollowupProfileRow,
  lastActivityAt: string | null,
  nowMs: number,
): boolean {
  if (!row.onboardingCompleted) return false;

  const baseline = resolveInactivityBaseline(row, lastActivityAt);
  const days = daysSinceIso(baseline, nowMs);
  if (days === null || days < INACTIVITY_FOLLOWUP_DAYS) return false;

  if (baseline !== null && row.inactivityFollowupBaselineActivityAt === baseline) return false;

  return true;
}
