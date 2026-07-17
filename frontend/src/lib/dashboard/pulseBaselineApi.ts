import { supabase } from "@/integrations/supabase/client";
import {
  compute14DayPulseBaseline,
  detectSignificantPulseDrop,
  type PulseMoodEntry,
} from "../../../../supabase/functions/chat/pulseBaseline.ts";

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

async function fetchRecentMoods(userId: string): Promise<PulseMoodEntry[]> {
  const client = supabase as unknown as UntypedSupabase;
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from("dailyCheckin")
    .select("date, mood, createdAt")
    .eq("userId", userId)
    .gte("date", cutoff)
    .order("date", { ascending: false });

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
    .filter((entry): entry is PulseMoodEntry => entry !== null);
}

/**
 * Recompute pulse baseline after a check-in and persist to profiles.
 */
export async function updatePulseBaselineAfterCheckIn(
  userId: string,
  newMood: number,
): Promise<{ pulseBaseline: number | null; significantPulseDrop: boolean }> {
  const moods = await fetchRecentMoods(userId);
  const withNewMood = moods.some((entry) => entry.mood === newMood)
    ? moods
    : [{ date: new Date().toISOString(), mood: newMood }, ...moods];

  const pulseBaseline = compute14DayPulseBaseline(withNewMood);
  const significantPulseDrop = detectSignificantPulseDrop(newMood, pulseBaseline);

  const { error } = await supabase
    .from("profiles")
    .update({
      pulseBaseline,
      significantPulseDrop,
    })
    .eq("id", userId);

  if (error && !isSchemaUnavailable(error)) {
    throw error;
  }

  return { pulseBaseline, significantPulseDrop };
}
