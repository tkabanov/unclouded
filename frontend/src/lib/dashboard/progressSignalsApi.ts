import { supabase } from "@/integrations/supabase/client";

export type ProgressSignals = {
  pulseLast30Days: Array<{ date: string; mood: number }>;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  pathsCompletedSinceReassessment: number;
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
    message.includes("could not find the table") ||
    message.includes("column")
  );
}

function monthBounds(offsetMonths: number): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - offsetMonths + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function countSessionsInRange(userId: string, start: string, end: string): Promise<number> {
  const client = supabase as unknown as UntypedSupabase;
  const { count, error } = await client
    .from("chatConversation")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .gte("createdAt", start)
    .lt("createdAt", end);

  if (error) {
    if (isSchemaUnavailable(error)) return 0;
    throw error;
  }

  return count ?? 0;
}

async function fetchPulseLast30Days(userId: string): Promise<ProgressSignals["pulseLast30Days"]> {
  const client = supabase as unknown as UntypedSupabase;
  const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await client
    .from("dailyCheckin")
    .select("date, mood, createdAt")
    .eq("userId", userId)
    .gte("date", cutoffDate)
    .order("date", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  return (data ?? [])
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
}

async function fetchPathsCompletedSinceReassessment(userId: string): Promise<number> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("reassessmentCompletedAt")
    .eq("id", userId)
    .maybeSingle();

  if (profileError && !isSchemaUnavailable(profileError)) {
    throw profileError;
  }

  const since =
    profile && typeof profile === "object" && typeof profile.reassessmentCompletedAt === "string"
      ? profile.reassessmentCompletedAt
      : null;

  const client = supabase as unknown as UntypedSupabase;
  let query = client
    .from("pathEnrollment")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("status", "completed");

  if (since) {
    query = query.gte("updatedAt", since);
  }

  const { count, error } = await query;
  if (error) {
    if (isSchemaUnavailable(error)) return 0;
    throw error;
  }

  return count ?? 0;
}

/** Dashboard progress signals for pulse, sessions, and path completion. */
export async function fetchProgressSignals(userId: string): Promise<ProgressSignals> {
  const thisMonth = monthBounds(0);
  const lastMonth = monthBounds(1);

  const [pulseLast30Days, sessionsThisMonth, sessionsLastMonth, pathsCompletedSinceReassessment] =
    await Promise.all([
      fetchPulseLast30Days(userId),
      countSessionsInRange(userId, thisMonth.start, thisMonth.end),
      countSessionsInRange(userId, lastMonth.start, lastMonth.end),
      fetchPathsCompletedSinceReassessment(userId),
    ]);

  return {
    pulseLast30Days,
    sessionsThisMonth,
    sessionsLastMonth,
    pathsCompletedSinceReassessment,
  };
}
