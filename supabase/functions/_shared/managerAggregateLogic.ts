import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  buildDailyTeamPulseTrend,
  computeAverageSessionEngagement,
  computeStabilityBandPercentages,
  MANAGER_MIN_COHORT_SIZE,
  type DailyTrendPoint,
  type StabilityBandPercentages,
} from "./managerAggregateTrendHelpers.ts";

export type ManagerAggregateSnapshot = {
  directReportCount: number;
  cohortSize: number;
  optedInCount: number;
  suppressed: boolean;
  legalReviewRequired: true;
  teamPulseTrend30d: DailyTrendPoint[];
  averagePulse30d: number | null;
  stabilityBandPercentages: StabilityBandPercentages | null;
  averageSessionEngagement: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function emptySnapshot(directReportCount: number, optedInCount: number): ManagerAggregateSnapshot {
  return {
    directReportCount,
    cohortSize: optedInCount,
    optedInCount,
    suppressed: true,
    legalReviewRequired: true,
    teamPulseTrend30d: buildDailyTeamPulseTrend([]),
    averagePulse30d: null,
    stabilityBandPercentages: null,
    averageSessionEngagement: null,
  };
}

/**
 * REQ-11 — anonymized aggregate for a manager's opted-in direct reports only.
 */
export async function computeManagerAggregateForDirectReports(
  client: SupabaseClient,
  managerUserId: string,
  minCohortSize = MANAGER_MIN_COHORT_SIZE,
): Promise<ManagerAggregateSnapshot> {
  const { data: links, error: linksError } = await client
    .from("managerDirectReport")
    .select("reportUserId")
    .eq("managerUserId", managerUserId);

  if (linksError) {
    throw linksError;
  }

  const directReportIds = (links ?? [])
    .map((row) => (row as { reportUserId?: string }).reportUserId)
    .filter((id): id is string => typeof id === "string");

  const directReportCount = directReportIds.length;
  if (directReportIds.length === 0) {
    return emptySnapshot(0, 0);
  }

  const { data: optedInMembers, error: membersError } = await client
    .from("profiles")
    .select("id, stabilityScore")
    .in("id", directReportIds)
    .eq("managerAggregateOptIn", true);

  if (membersError) {
    throw membersError;
  }

  const optedInIds = (optedInMembers ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  if (optedInIds.length < minCohortSize) {
    return emptySnapshot(directReportCount, optedInIds.length);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const checkinCutoff = thirtyDaysAgo.slice(0, 10);

  const [{ data: checkins }, { data: sessions }] = await Promise.all([
    client
      .from("dailyCheckin")
      .select("userId, mood, date, createdAt")
      .in("userId", optedInIds)
      .gte("date", checkinCutoff),
    client
      .from("chatConversation")
      .select("userId, createdAt")
      .in("userId", optedInIds)
      .gte("createdAt", thirtyDaysAgo),
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

  const stabilityScores = (optedInMembers ?? [])
    .map((row) => Number((row as { stabilityScore?: unknown }).stabilityScore))
    .filter((score) => Number.isFinite(score));

  const teamPulseTrend30d = buildDailyTeamPulseTrend(checkinRows);
  const moodsLast30Days = checkinRows.map((row) => row.mood);

  return {
    directReportCount,
    cohortSize: optedInIds.length,
    optedInCount: optedInIds.length,
    suppressed: false,
    legalReviewRequired: true,
    teamPulseTrend30d,
    averagePulse30d: average(moodsLast30Days),
    stabilityBandPercentages: computeStabilityBandPercentages(stabilityScores),
    averageSessionEngagement: computeAverageSessionEngagement(
      sessionRows,
      optedInIds.length,
      thirtyDaysAgo,
    ),
  };
}
