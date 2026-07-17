import { supabase } from "@/integrations/supabase/client";
import { DAILY_CHECKINS_ONBOARDING_KEY } from "@/lib/dashboard/checkinApi";
import { PATH_ENROLLMENT_ONBOARDING_KEY } from "@/lib/dashboard/microCommitmentsApi";
import {
  AI_COACHING_MODE_LABELS,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import {
  MODULE_COMPLETE_FLAG_COLUMNS,
  MODULE_DISPLAY_TITLES,
  MODULE_SLUGS,
  type ModuleSlug,
} from "@/lib/modules/moduleSlugs";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface AdminAnalyticsSnapshot {
  totalUsers: number;
  checkinsLast7Days: number;
  mostActiveMode: string;
  pathEnrollments: number;
  usersWithOneOrMoreModules: number;
  averageModulesCompleted: number;
  moduleCompletionCounts: Record<ModuleSlug, number>;
}

/** Whitelisted profile columns for admin module analytics (no History answer fields). */
export const ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS =
  "onboardingData, modulesCompletedCount, moduleIdentityComplete, moduleRelationalComplete, moduleHistoryComplete, moduleFinancialComplete, moduleBodyComplete, moduleMeaningComplete" as const;

/** History answer fields that must never appear in admin analytics SELECT. */
export const ADMIN_SENSITIVE_HISTORY_FIELDS = [
  "traumaActivationLevel",
  "griefLoadLevel",
  "priorSupportType",
  "significantEvents12mo",
] as const;

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

export const ADMIN_STAT_USERS_WITH_MODULES_LABEL = "Users with 1+ Modules" as const;

export const ADMIN_STAT_AVG_MODULES_LABEL = "Avg Modules Completed" as const;

export const ADMIN_STAT_MODULE_COMPLETIONS_HEADING = "Module Completions" as const;

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type AdminAnalyticsProfileRow = {
  onboardingData?: Record<string, unknown> | null;
  modulesCompletedCount?: number | null;
  moduleIdentityComplete?: boolean | null;
  moduleRelationalComplete?: boolean | null;
  moduleHistoryComplete?: boolean | null;
  moduleFinancialComplete?: boolean | null;
  moduleBodyComplete?: boolean | null;
  moduleMeaningComplete?: boolean | null;
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

function readModulesCompletedCount(row: AdminAnalyticsProfileRow): number {
  if (typeof row.modulesCompletedCount === "number" && Number.isFinite(row.modulesCompletedCount)) {
    return Math.max(0, Math.floor(row.modulesCompletedCount));
  }
  const onboarding = row.onboardingData ?? {};
  const raw =
    onboarding.modules_completed_count_number ?? onboarding.modules_completed_count;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }
  return 0;
}

function isModuleCompleteForRow(row: AdminAnalyticsProfileRow, slug: ModuleSlug): boolean {
  const column = MODULE_COMPLETE_FLAG_COLUMNS[slug];
  if (row[column] === true) return true;

  const onboarding = row.onboardingData ?? {};
  const flagKeys: Record<ModuleSlug, string[]> = {
    identity: ["module_identity_complete", "module_identity_complete_boolean"],
    relational: ["module_relational_complete", "module_relational_complete_boolean"],
    history: ["module_history_complete", "module_history_complete_boolean"],
    financial: ["module_financial_complete", "module_financial_complete_boolean"],
    body: ["module_body_complete", "module_body_complete_boolean"],
    meaning: [
      "module_meaning_complete",
      "module_meaning_complete_boolean",
      "module_holds_you_complete",
    ],
  };

  return flagKeys[slug].some((key) => onboarding[key] === true);
}

export function aggregateModuleCompletionStats(profiles: AdminAnalyticsProfileRow[]): {
  usersWithOneOrMoreModules: number;
  averageModulesCompleted: number;
  moduleCompletionCounts: Record<ModuleSlug, number>;
} {
  const moduleCompletionCounts = Object.fromEntries(
    MODULE_SLUGS.map((slug) => [slug, 0]),
  ) as Record<ModuleSlug, number>;

  let usersWithOneOrMoreModules = 0;
  let totalModulesCompleted = 0;

  for (const profile of profiles) {
    const count = readModulesCompletedCount(profile);
    if (count >= 1) {
      usersWithOneOrMoreModules += 1;
    }
    totalModulesCompleted += count;

    for (const slug of MODULE_SLUGS) {
      if (isModuleCompleteForRow(profile, slug)) {
        moduleCompletionCounts[slug] += 1;
      }
    }
  }

  const averageModulesCompleted =
    profiles.length > 0
      ? Math.round((totalModulesCompleted / profiles.length) * 10) / 10
      : 0;

  return {
    usersWithOneOrMoreModules,
    averageModulesCompleted,
    moduleCompletionCounts,
  };
}

function countCheckinsFromOnboarding(
  profiles: AdminAnalyticsProfileRow[],
  cutoff: Date,
): number {
  let total = 0;
  for (const profile of profiles) {
    const raw = profile.onboardingData?.[DAILY_CHECKINS_ONBOARDING_KEY];
    if (!Array.isArray(raw)) continue;
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const date =
        typeof row.date === "string"
          ? row.date
          : typeof row.createdAt === "string"
            ? row.createdAt
            : null;
      if (date && isOnOrAfterCutoff(date, cutoff)) total += 1;
    }
  }
  return total;
}

function countPathEnrollmentsFromOnboarding(profiles: AdminAnalyticsProfileRow[]): number {
  let total = 0;
  for (const profile of profiles) {
    const raw = profile.onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
    if (!raw || typeof raw !== "object") continue;
    const state = raw as Record<string, unknown>;
    if (typeof state.enrollment_id === "string" && state.enrollment_id.trim() !== "") {
      total += 1;
    }
  }
  return total;
}

function resolveMostActiveMode(profiles: AdminAnalyticsProfileRow[]): string {
  const modeCounts = new Map<string, number>();
  for (const profile of profiles) {
    const mode = readCoachingMode(profile.onboardingData ?? null);
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
    .from("dailyCheckin")
    .select("id", { count: "exact", head: true })
    .gte("date", cutoffIso);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  return count ?? 0;
}

async function tryCountPathEnrollments(): Promise<number | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { count, error } = await client
    .from("pathEnrollment")
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

  const profilesResult = await supabase
    .from("profiles")
    .select(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS);
  if (profilesResult.error) throw profilesResult.error;

  const profiles = (profilesResult.data ?? []) as AdminAnalyticsProfileRow[];
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

  const moduleStats = aggregateModuleCompletionStats(profiles);

  return {
    totalUsers,
    checkinsLast7Days,
    mostActiveMode: resolveMostActiveMode(profiles),
    pathEnrollments,
    usersWithOneOrMoreModules: moduleStats.usersWithOneOrMoreModules,
    averageModulesCompleted: moduleStats.averageModulesCompleted,
    moduleCompletionCounts: moduleStats.moduleCompletionCounts,
  };
}

export function formatModuleCompletionLabel(slug: ModuleSlug): string {
  return MODULE_DISPLAY_TITLES[slug];
}
