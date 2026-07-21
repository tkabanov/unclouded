import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  buildWeeklyPulseTrend,
  buildWeeklySessionsPerActiveUserTrend,
  computePathEngagementPercent,
  EMPLOYER_MIN_COHORT_SIZE,
  EMPLOYER_WEEKLY_TREND_WEEKS,
  type WeeklyTrendPoint,
} from "./employerMetricsTrendHelpers.ts";
import {
  computeEmployerAssessmentBaseline,
  EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
  type EmployerAssessmentBaseline,
} from "./employerAssessmentBaselineHelpers.ts";

export { EMPLOYER_MIN_COHORT_SIZE } from "./employerMetricsTrendHelpers.ts";
export type { WeeklyTrendPoint } from "./employerMetricsTrendHelpers.ts";
export type { EmployerAssessmentBaseline } from "./employerAssessmentBaselineHelpers.ts";

export type EmployerMetricSnapshot = {
  cohortSize: number;
  suppressed: boolean;
  averagePulse: number | null;
  pulseByWeek: WeeklyTrendPoint[];
  sessionsPerActiveUserByWeek: WeeklyTrendPoint[];
  pathEngagementPercent: number | null;
  activeUsersPercent: number | null;
  sessionsPerUser: number | null;
  assessmentBaseline: EmployerAssessmentBaseline;
};

type UntypedFrom = SupabaseClient;

const EMPTY_SNAPSHOT: Omit<EmployerMetricSnapshot, "cohortSize" | "suppressed"> = {
  averagePulse: null,
  pulseByWeek: [],
  sessionsPerActiveUserByWeek: [],
  pathEngagementPercent: null,
  activeUsersPercent: null,
  sessionsPerUser: null,
  assessmentBaseline: EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function emptyWeeks(): WeeklyTrendPoint[] {
  return buildWeeklyPulseTrend([]);
}

function suppressedSnapshot(cohortSize: number): EmployerMetricSnapshot {
  return {
    cohortSize,
    suppressed: true,
    ...EMPTY_SNAPSHOT,
    pulseByWeek: emptyWeeks(),
    sessionsPerActiveUserByWeek: emptyWeeks(),
  };
}

/**
 * Anonymized employer metrics for a cohort — suppressed below minimum size.
 * Server-side only; never returns individual-level rows.
 */
export async function computeEmployerMetricsForUserIds(
  client: UntypedFrom,
  userIds: string[],
  minCohortSize: number,
): Promise<EmployerMetricSnapshot> {
  if (userIds.length < minCohortSize) {
    return suppressedSnapshot(userIds.length);
  }

  const trendCutoffDate = new Date(
    Date.now() - EMPLOYER_WEEKLY_TREND_WEEKS * 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: checkins }, { data: sessions }, { data: enrollments }, { data: profiles }] =
    await Promise.all([
    client
      .from("dailyCheckin")
      .select("userId, mood, date, createdAt")
      .in("userId", userIds)
      .gte("date", trendCutoffDate),
    client
      .from("chatConversation")
      .select("userId, createdAt")
      .in("userId", userIds)
      .gte("createdAt", trendCutoffDate),
    client.from("pathEnrollment").select("userId, status").in("userId", userIds),
    client
      .from("profiles")
      .select("classification, stabilityScore, performanceScore, alignmentScore, results")
      .in("id", userIds),
  ]);

  const checkinRows = (checkins ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const date =
        typeof record.date === "string"
          ? record.date
          : typeof record.createdAt === "string"
            ? record.createdAt
            : "";
      const mood = Number(record.mood);
      if (!date || Number.isNaN(mood)) return null;
      return { date, mood };
    })
    .filter((entry): entry is { date: string; mood: number } => entry !== null);

  const sessionRows = (sessions ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = typeof record.userId === "string" ? record.userId : "";
      const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
      if (!userId || !createdAt) return null;
      return { userId, createdAt };
    })
    .filter((entry): entry is { userId: string; createdAt: string } => entry !== null);

  const enrollmentRows = (enrollments ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = typeof record.userId === "string" ? record.userId : "";
      const status = typeof record.status === "string" ? record.status : "";
      if (!userId || !status) return null;
      return { userId, status };
    })
    .filter((entry): entry is { userId: string; status: string } => entry !== null);

  const pulseByWeek = buildWeeklyPulseTrend(checkinRows);
  const sessionsPerActiveUserByWeek = buildWeeklySessionsPerActiveUserTrend(sessionRows);
  const pathEngagementPercent = computePathEngagementPercent(enrollmentRows, userIds.length);

  const recentSessions = sessionRows.filter((row) => row.createdAt >= thirtyDaysAgo);
  const sessionCounts = new Map<string, number>();
  for (const row of recentSessions) {
    sessionCounts.set(row.userId, (sessionCounts.get(row.userId) ?? 0) + 1);
  }

  const activeUsers = sessionCounts.size;
  const totalSessions = [...sessionCounts.values()].reduce((sum, count) => sum + count, 0);
  const moodsLast30Days = checkinRows
    .filter((row) => row.date >= thirtyDaysAgo.slice(0, 10))
    .map((row) => row.mood);

  const assessmentRows = (profiles ?? []).map((row) => row as Record<string, unknown>);
  const assessmentBaseline = computeEmployerAssessmentBaseline(
    assessmentRows.map((row) => ({
      classification: typeof row.classification === "string" ? row.classification : null,
      stabilityScore: typeof row.stabilityScore === "number" ? row.stabilityScore : null,
      performanceScore: typeof row.performanceScore === "number" ? row.performanceScore : null,
      alignmentScore: typeof row.alignmentScore === "number" ? row.alignmentScore : null,
      results:
        row.results && typeof row.results === "object" && !Array.isArray(row.results)
          ? (row.results as Record<string, unknown>)
          : null,
    })),
  );

  return {
    cohortSize: userIds.length,
    suppressed: false,
    averagePulse: average(moodsLast30Days),
    pulseByWeek,
    sessionsPerActiveUserByWeek,
    pathEngagementPercent,
    activeUsersPercent: Math.round((activeUsers / userIds.length) * 1000) / 10,
    sessionsPerUser: Math.round((totalSessions / userIds.length) * 100) / 100,
    assessmentBaseline,
  };
}

export async function fetchEmployerMetricsForWorkplace(
  client: UntypedFrom,
  workplaceId: string,
  minCohortSize: number,
): Promise<EmployerMetricSnapshot> {
  const { data: members, error: membersError } = await client
    .from("profiles")
    .select("id")
    .eq("workplaceId", workplaceId);

  if (membersError) {
    throw membersError;
  }

  const userIds = (members ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  return computeEmployerMetricsForUserIds(client, userIds, minCohortSize);
}
