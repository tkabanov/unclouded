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

/** Months of MAU trend shown in employer portal (UTC calendar months). */
export const EMPLOYER_MONTHLY_TREND_MONTHS = 6;

export type MonthlyActiveTrendPoint = {
  /** YYYY-MM (UTC) */
  month: string;
  activeCount: number | null;
  activePercent: number | null;
  suppressed: boolean;
};

export type EmployerMetricSnapshot = {
  cohortSize: number;
  suppressed: boolean;
  averagePulse: number | null;
  pulseByWeek: WeeklyTrendPoint[];
  sessionsPerActiveUserByWeek: WeeklyTrendPoint[];
  pathEngagementPercent: number | null;
  activeUsersPercent: number | null;
  sessionsPerUser: number | null;
  /** Distinct engaged users — UTC calendar day (US-208 event set). */
  dau: number | null;
  dauPercent: number | null;
  /** Distinct engaged users — rolling last 7 days UTC. */
  wau: number | null;
  wauPercent: number | null;
  /** Distinct engaged users — UTC calendar month (align Part A pay-per-active). */
  mau: number | null;
  mauPercent: number | null;
  monthlyActiveTrend: MonthlyActiveTrendPoint[];
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
  dau: null,
  dauPercent: null,
  wau: null,
  wauPercent: null,
  mau: null,
  mauPercent: null,
  monthlyActiveTrend: [],
  assessmentBaseline: EMPTY_EMPLOYER_ASSESSMENT_BASELINE,
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function emptyWeeks(): WeeklyTrendPoint[] {
  return buildWeeklyPulseTrend([]);
}

function percentOfCohort(count: number, cohortSize: number): number {
  if (cohortSize <= 0) return 0;
  return Math.round((count / cohortSize) * 1000) / 10;
}

function utcMonthKey(iso: string): string {
  return iso.slice(0, 7);
}

function startOfUtcMonth(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0, 0));
}

function recentUtcMonthStarts(months: number, now = new Date()): Date[] {
  const starts: Date[] = [];
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  for (let i = months - 1; i >= 0; i -= 1) {
    starts.push(startOfUtcMonth(y, m - i));
  }
  return starts;
}

function mapUserCreatedAt(rows: unknown[] | null): { userId: string; createdAt: string }[] {
  return (rows ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = typeof record.userId === "string" ? record.userId : "";
      const createdAt = typeof record.createdAt === "string" ? record.createdAt : "";
      if (!userId || !createdAt) return null;
      return { userId, createdAt };
    })
    .filter((entry): entry is { userId: string; createdAt: string } => entry !== null);
}

function countDistinctInRange(
  events: { userId: string; createdAt: string }[],
  rangeStartIso: string,
  rangeEndIsoExclusive?: string,
): number {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.createdAt < rangeStartIso) continue;
    if (rangeEndIsoExclusive && event.createdAt >= rangeEndIsoExclusive) continue;
    ids.add(event.userId);
  }
  return ids.size;
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
 * Engagement windows use UTC (Part A US-208 / §21).
 */
export async function computeEmployerMetricsForUserIds(
  client: UntypedFrom,
  userIds: string[],
  minCohortSize: number,
): Promise<EmployerMetricSnapshot> {
  if (userIds.length < minCohortSize) {
    return suppressedSnapshot(userIds.length);
  }

  const now = new Date();
  const trendCutoffDate = new Date(
    Date.now() - EMPLOYER_WEEKLY_TREND_WEEKS * 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const monthStarts = recentUtcMonthStarts(EMPLOYER_MONTHLY_TREND_MONTHS, now);
  const engagementCutoff = monthStarts[0]?.toISOString() ?? thirtyDaysAgo;

  const utcDayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const wauStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const mauMonthStart = startOfUtcMonth(now.getUTCFullYear(), now.getUTCMonth()).toISOString();

  const [
    { data: checkins },
    { data: sessions },
    { data: pathCompletions },
    { data: journals },
    { data: assessments },
    { data: enrollments },
    { data: profiles },
  ] = await Promise.all([
    client
      .from("dailyCheckin")
      .select("userId, mood, date, createdAt")
      .in("userId", userIds)
      .gte("createdAt", engagementCutoff),
    client
      .from("chatConversation")
      .select("userId, createdAt")
      .in("userId", userIds)
      .gte("createdAt", engagementCutoff),
    client
      .from("pathSessionCompletion")
      .select("userId, createdAt")
      .in("userId", userIds)
      .gte("createdAt", engagementCutoff),
    client
      .from("journalEntry")
      .select("userId, createdAt")
      .in("userId", userIds)
      .gte("createdAt", engagementCutoff),
    client
      .from("assessmentResult")
      .select("userId, createdAt")
      .in("userId", userIds)
      .gte("createdAt", engagementCutoff),
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

  const sessionRows = mapUserCreatedAt(sessions);
  const engagementEvents = [
    ...mapUserCreatedAt(checkins),
    ...sessionRows,
    ...mapUserCreatedAt(pathCompletions),
    ...mapUserCreatedAt(journals),
    ...mapUserCreatedAt(assessments),
  ];

  const enrollmentRows = (enrollments ?? [])
    .map((row) => {
      const record = row as Record<string, unknown>;
      const userId = typeof record.userId === "string" ? record.userId : "";
      const status = typeof record.status === "string" ? record.status : "";
      if (!userId || !status) return null;
      return { userId, status };
    })
    .filter((entry): entry is { userId: string; status: string } => entry !== null);

  const pulseByWeek = buildWeeklyPulseTrend(
    checkinRows.filter((row) => row.date >= trendCutoffDate),
  );
  const sessionsPerActiveUserByWeek = buildWeeklySessionsPerActiveUserTrend(
    sessionRows.filter((row) => row.createdAt >= `${trendCutoffDate}T00:00:00.000Z`),
  );
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

  const dau = countDistinctInRange(engagementEvents, utcDayStart);
  const wau = countDistinctInRange(engagementEvents, wauStart);
  const mau = countDistinctInRange(engagementEvents, mauMonthStart);

  const monthlyActiveTrend: MonthlyActiveTrendPoint[] = monthStarts.map((start, index) => {
    const end =
      index + 1 < monthStarts.length
        ? monthStarts[index + 1]
        : startOfUtcMonth(start.getUTCFullYear(), start.getUTCMonth() + 1);
    const activeCount = countDistinctInRange(
      engagementEvents,
      start.toISOString(),
      end.toISOString(),
    );
    const monthSuppressed = userIds.length < minCohortSize;
    return {
      month: utcMonthKey(start.toISOString()),
      activeCount: monthSuppressed ? null : activeCount,
      activePercent: monthSuppressed ? null : percentOfCohort(activeCount, userIds.length),
      suppressed: monthSuppressed,
    };
  });

  const assessmentRows = (profiles ?? []).map((row) => row as Record<string, unknown>);
  const assessmentBaseline = computeEmployerAssessmentBaseline(
    assessmentRows.map((row) => ({
      classification: typeof row.classification === "string" ? row.classification : null,
      stabilityScore: row.stabilityScore ?? null,
      performanceScore: row.performanceScore ?? null,
      alignmentScore: row.alignmentScore ?? null,
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
    activeUsersPercent: percentOfCohort(activeUsers, userIds.length),
    sessionsPerUser: Math.round((totalSessions / userIds.length) * 100) / 100,
    dau,
    dauPercent: percentOfCohort(dau, userIds.length),
    wau,
    wauPercent: percentOfCohort(wau, userIds.length),
    mau,
    mauPercent: percentOfCohort(mau, userIds.length),
    monthlyActiveTrend,
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
    .eq("workplaceId", workplaceId)
    .eq("accountType", "enterprise");

  if (membersError) {
    throw membersError;
  }

  const userIds = (members ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  return computeEmployerMetricsForUserIds(client, userIds, minCohortSize);
}
