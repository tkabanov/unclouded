import { supabase } from "@/integrations/supabase/client";
import { DAILY_CHECKINS_ONBOARDING_KEY } from "@/lib/dashboard/checkinApi";
import { PATH_ENROLLMENT_ONBOARDING_KEY } from "@/lib/dashboard/microCommitmentsApi";
import {
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface AdminAnalyticsSnapshot {
  totalUsers: number;
  checkinsLast7Days: number;
  mostActiveMode: string;
  pathEnrollments: number;
}

/** IR static copy — ai_RNbBHYbB */
export const ADMIN_ANALYTICS_NOTICE_COPY =
  "All analytics shown here are strictly anonymized and aggregated. No individual user data is ever exposed." as const;

/** IR static copy — ai_RNbBHYbE */
export const ADMIN_STAT_TOTAL_USERS_LABEL = "Total Active Users" as const;

/** IR static copy — ai_RNbBHYbH */
export const ADMIN_STAT_CHECKINS_LABEL = "Check-ins (Last 7 Days)" as const;

/** IR static copy — ai_RNbBHYbK */
export const ADMIN_STAT_MODE_DIST_LABEL = "Most Active Mode" as const;

/** IR static copy — ai_RNbBHYbN */
export const ADMIN_STAT_ENROLLED_LABEL = "Path Enrollments" as const;

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

type ProfileRow = {
  onboarding_data?: Record<string, unknown> | null;
};

const CHECKIN_LOOKBACK_DAYS = 7;

function checkinCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CHECKIN_LOOKBACK_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff;
}

function isOnOrAfterCutoff(dateValue: string, cutoff: Date): boolean {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed >= cutoff;
}

function readCoachingMode(onboarding: Record<string, unknown> | null | undefined): string | null {
  const raw =
    onboarding?.ai_coaching_mode_os ??
    onboarding?.ai_coaching_mode_list_list_option_ai_coaching_mode_os ??
    onboarding?.primary_mode_text;
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function countCheckinsFromOnboarding(
  profiles: ProfileRow[],
  cutoff: Date,
): number {
  let total = 0;
  for (const profile of profiles) {
    const raw = profile.onboarding_data?.[DAILY_CHECKINS_ONBOARDING_KEY];
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const date =
        typeof row.date_date === "string"
          ? row.date_date
          : typeof row.created_at === "string"
            ? row.created_at
            : null;
      if (date && isOnOrAfterCutoff(date, cutoff)) total += 1;
    }
  }
  return total;
}

function countPathEnrollmentsFromOnboarding(profiles: ProfileRow[]): number {
  let total = 0;
  for (const profile of profiles) {
    const raw = profile.onboarding_data?.[PATH_ENROLLMENT_ONBOARDING_KEY];
    if (!raw || typeof raw !== "object") continue;
    const state = raw as Record<string, unknown>;
    if (typeof state.enrollment_id === "string" && state.enrollment_id.trim() !== "") {
      total += 1;
    }
  }
  return total;
}

function resolveMostActiveMode(profiles: ProfileRow[]): string {
  const modeCounts = new Map<string, number>();
  for (const profile of profiles) {
    const mode = readCoachingMode(profile.onboarding_data ?? null);
    if (!mode) continue;
    modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
  }

  let topModeSlug: string | null = null;
  let topCount = 0;
  for (const [mode, count] of modeCounts) {
    if (count > topCount) {
      topCount = count;
      topModeSlug = mode;
    }
  }

  if (!topModeSlug) return "N/A";

  if (topModeSlug in AI_COACHING_MODE_LABELS) {
    return AI_COACHING_MODE_LABELS[topModeSlug as AiCoachingModeSlug];
  }

  return topModeSlug;
}

async function tryCountCheckinsLast7Days(cutoffIso: string): Promise<number | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { count, error } = await client
    .from("dailycheckin")
    .select("id", { count: "exact", head: true })
    .gte("date_date", cutoffIso);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return count ?? 0;
}

async function tryCountPathEnrollments(): Promise<number | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { count, error } = await client
    .from("pathenrollment1")
    .select("id", { count: "exact", head: true });

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return count ?? 0;
}

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsSnapshot> {
  const cutoff = checkinCutoffDate();
  const cutoffIso = cutoff.toISOString();

  const profilesResult = await supabase.from("profiles").select("onboarding_data");
  if (profilesResult.error) throw profilesResult.error;

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const totalUsers = profiles.length;

  const [checkinsFromTable, enrollmentsFromTable] = await Promise.all([
    tryCountCheckinsLast7Days(cutoffIso),
    tryCountPathEnrollments(),
  ]);

  const checkinsLast7Days =
    checkinsFromTable !== null
      ? checkinsFromTable
      : countCheckinsFromOnboarding(profiles, cutoff);

  const pathEnrollments =
    enrollmentsFromTable !== null
      ? enrollmentsFromTable
      : countPathEnrollmentsFromOnboarding(profiles);

  return {
    totalUsers,
    checkinsLast7Days,
    mostActiveMode: resolveMostActiveMode(profiles),
    pathEnrollments,
  };
}
