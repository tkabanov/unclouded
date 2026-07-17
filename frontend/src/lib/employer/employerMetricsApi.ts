import { supabase } from "@/integrations/supabase/client";

const MIN_COHORT_SIZE = 5;

export type EmployerMetricSnapshot = {
  cohortSize: number;
  suppressed: boolean;
  averagePulse: number | null;
  activeUsersPercent: number | null;
  sessionsPerUser: number | null;
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

/**
 * Anonymized employer metrics — suppressed when cohort is below minimum size.
 */
export async function fetchEmployerMetrics(workplaceId: string): Promise<EmployerMetricSnapshot> {
  const client = supabase as unknown as UntypedSupabase;

  const { data: members, error: membersError } = await client
    .from("profiles")
    .select("id")
    .eq("workplaceId", workplaceId);

  if (membersError) {
    if (isSchemaUnavailable(membersError)) {
      return {
        cohortSize: 0,
        suppressed: true,
        averagePulse: null,
        activeUsersPercent: null,
        sessionsPerUser: null,
      };
    }
    throw membersError;
  }

  const userIds = (members ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === "string");

  if (userIds.length < MIN_COHORT_SIZE) {
    return {
      cohortSize: userIds.length,
      suppressed: true,
      averagePulse: null,
      activeUsersPercent: null,
      sessionsPerUser: null,
    };
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: checkins }, { data: sessions }] = await Promise.all([
    client.from("dailyCheckin").select("userId, mood").in("userId", userIds).gte("date", thirtyDaysAgo),
    client.from("chatConversation").select("userId").in("userId", userIds).gte("createdAt", thirtyDaysAgo),
  ]);

  const moods = (checkins ?? [])
    .map((row) => Number((row as { mood?: unknown }).mood))
    .filter((value) => Number.isFinite(value));

  const sessionCounts = new Map<string, number>();
  for (const row of sessions ?? []) {
    const userId = (row as { userId?: string }).userId;
    if (!userId) continue;
    sessionCounts.set(userId, (sessionCounts.get(userId) ?? 0) + 1);
  }

  const activeUsers = sessionCounts.size;
  const totalSessions = [...sessionCounts.values()].reduce((sum, count) => sum + count, 0);

  return {
    cohortSize: userIds.length,
    suppressed: false,
    averagePulse: average(moods),
    activeUsersPercent: Math.round((activeUsers / userIds.length) * 1000) / 10,
    sessionsPerUser: Math.round((totalSessions / userIds.length) * 100) / 100,
  };
}
