import { supabase } from "@/integrations/supabase/client";
import {
  buildDailyTeamPulseTrend,
  computeAverageSessionEngagement,
  computeStabilityBandPercentages,
  MANAGER_MIN_COHORT_SIZE,
  type DailyTrendPoint,
  type StabilityBandPercentages,
} from "@/lib/employer/managerAggregateHelpers";

export type ManagerAggregateSnapshot = {
  cohortSize: number;
  optedInCount: number;
  suppressed: boolean;
  legalReviewRequired: true;
  teamPulseTrend30d: DailyTrendPoint[];
  averagePulse30d: number | null;
  stabilityBandPercentages: StabilityBandPercentages | null;
  averageSessionEngagement: number | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function emptySnapshot(optedInCount: number): ManagerAggregateSnapshot {
  return {
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
 * Team aggregate metrics for managers — only opted-in members; min cohort of 5.
 * Requires legal review before production deployment (REQ-11).
 */
export async function fetchManagerAggregate(workplaceId: string): Promise<ManagerAggregateSnapshot> {
  const client = supabase as unknown as UntypedSupabase;

  const { data: optedInMembers, error } = await client
    .from("profiles")
    .select("id, stabilityScore")
    .eq("workplaceId", workplaceId)
    .eq("managerAggregateOptIn", true);

  if (error) {
    if (isSchemaUnavailable(error)) {
      return emptySnapshot(0);
    }
    throw error;
  }

  const optedInIds = (optedInMembers ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  if (optedInIds.length < MANAGER_MIN_COHORT_SIZE) {
    return emptySnapshot(optedInIds.length);
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
