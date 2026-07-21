import { calendarDaysBetween, toCheckInDateKey } from "./streakHelpers.ts";
import { fetchLatestFinalizedSessionAt } from "../sessionMemory/coachingSessionArchive.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

function daysSinceIsoTimestamp(iso: string, referenceDate: Date): number {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return 0;
  const todayKey = toCheckInDateKey(referenceDate);
  const closedKey = toCheckInDateKey(new Date(parsed));
  return Math.max(0, calendarDaysBetween(todayKey, closedKey));
}

/** Legacy fallback — latest closedAt from capped session memory JSON. */
export function computeDaysSinceLastCompletedSessionFromMemory(
  onboardingData: Record<string, unknown> | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  const memory = onboardingData?.chat_session_memory;
  if (!Array.isArray(memory) || memory.length === 0) return null;

  const closedAts = memory
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const closedAt = (entry as Record<string, unknown>).closedAt;
      return typeof closedAt === "string" ? Date.parse(closedAt) : NaN;
    })
    .filter((ms): ms is number => Number.isFinite(ms));

  if (closedAts.length === 0) return null;

  const latestMs = Math.max(...closedAts);
  return daysSinceIsoTimestamp(new Date(latestMs).toISOString(), referenceDate);
}

/** REQ Layer 10 item 9 — days since last completed coaching session. */
export function computeDaysSinceLastCompletedSession(
  onboardingData: Record<string, unknown> | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  return computeDaysSinceLastCompletedSessionFromMemory(onboardingData, referenceDate);
}

/** REQ-04 — prefer coachingSessionArchive.finalizedAt; fallback to JSON memory. */
export async function resolveDaysSinceLastCompletedSession(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
  referenceDate: Date = new Date(),
): Promise<number | null> {
  try {
    const latestFinalizedAt = await fetchLatestFinalizedSessionAt(supabase, userId);
    if (latestFinalizedAt) {
      return daysSinceIsoTimestamp(latestFinalizedAt, referenceDate);
    }
  } catch (err) {
    console.warn("coachingSessionArchive lookup failed", err);
  }

  return computeDaysSinceLastCompletedSessionFromMemory(onboardingData, referenceDate);
}