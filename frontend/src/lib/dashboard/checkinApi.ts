import { supabase } from "@/integrations/supabase/client";

/** Bubble user field from workflow bTIWG streak update. */
export const DAILY_CHECK_IN_STREAK_FIELD = "daily_check_in_streak_number" as const;
export const STREAK_DAYS_FIELD = "streak_days_number" as const;

/** Fallback history when `dailycheckin` table is absent from prototype schema. */
export const DAILY_CHECKINS_ONBOARDING_KEY = "daily_checkins" as const;

export interface DailyCheckInInput {
  mood: number;
  energyStressLevel: number;
  reflection: string;
  date?: Date;
}

export interface DailyCheckInRecord {
  id: string;
  mood: number;
  energy_stress_level: number;
  reflection: string;
  date: string;
  user: string;
}

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

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function readCheckinsFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): DailyCheckInRecord[] {
  const raw = onboardingData?.[DAILY_CHECKINS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const mood = Number(row.mood_number ?? row.mood);
      const energy = Number(row.energy_stress_level_number ?? row.energy_stress_level);
      const reflection = typeof row.reflection_text === "string" ? row.reflection_text : "";
      const date = typeof row.date_date === "string" ? row.date_date : "";
      const user = typeof row.user_user === "string" ? row.user_user : "";
      if (!date || Number.isNaN(mood) || Number.isNaN(energy)) return null;
      return {
        id: typeof row.id === "string" ? row.id : `onboarding-${index}`,
        mood,
        energy_stress_level: energy,
        reflection,
        date,
        user,
      };
    })
    .filter((row): row is DailyCheckInRecord => row !== null);
}

function readStreakFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): number {
  const primary = onboardingData?.[DAILY_CHECK_IN_STREAK_FIELD];
  if (typeof primary === "number" && Number.isFinite(primary)) return Math.max(0, primary);
  if (typeof primary === "string" && primary.trim() !== "") {
    const parsed = Number(primary);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }

  const legacy = onboardingData?.[STREAK_DAYS_FIELD];
  if (typeof legacy === "number" && Number.isFinite(legacy)) return Math.max(0, legacy);
  if (typeof legacy === "string" && legacy.trim() !== "") {
    const parsed = Number(legacy);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }

  return 0;
}

function computeNextStreak(existingDates: string[], submitDate: Date): number {
  const today = toDateKey(submitDate);
  const uniqueDates = [...new Set(existingDates.map((d) => d.slice(0, 10)))].sort();
  if (uniqueDates.includes(today)) {
    return Math.max(1, uniqueDates.length);
  }

  const yesterday = new Date(submitDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  if (uniqueDates.includes(yesterdayKey)) {
    return uniqueDates.length + 1;
  }

  return 1;
}

async function tryFetchStreakFromTable(userId: string): Promise<number | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("user")
    .select("daily_check_in_streak_number, streak_days_number")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return 0;
  const row = data as Record<string, unknown>;
  const streak =
    row.daily_check_in_streak_number ?? row.streak_days_number ?? 0;
  const parsed = Number(streak);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function tryInsertCheckinTable(
  userId: string,
  input: DailyCheckInInput,
  date: Date,
): Promise<boolean> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client.from("dailycheckin").insert({
    mood_number: input.mood,
    energy_stress_level_number: input.energyStressLevel,
    reflection_text: input.reflection.trim(),
    user_user: userId,
    date_date: date.toISOString(),
  });

  if (!error) return true;
  if (isSchemaUnavailable(error)) return false;
  throw error;
}

async function tryUpdateUserStreakTable(userId: string, streak: number): Promise<boolean> {
  const client = supabase as unknown as UntypedSupabase;
  const { error } = await client
    .from("user")
    .update({
      daily_check_in_streak_number: streak,
      streak_days_number: streak,
    })
    .eq("id", userId);

  if (!error) return true;
  if (isSchemaUnavailable(error)) return false;
  throw error;
}

/**
 * Read streak badge value — Bubble user.daily_check_in_streak_number with streak_days_number fallback.
 */
export async function fetchDailyCheckInStreak(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<number> {
  const fromTable = await tryFetchStreakFromTable(userId);
  if (fromTable !== null) return fromTable;
  return readStreakFromOnboarding(onboardingData);
}

/**
 * bTIWG / ai_RNbBHXRw workflow parity — create dailycheckin row and refresh streak.
 */
export async function submitDailyCheckIn(
  userId: string,
  input: DailyCheckInInput,
  onboardingData?: Record<string, unknown> | null,
): Promise<{ streak: number }> {
  const date = input.date ?? new Date();
  const inserted = await tryInsertCheckinTable(userId, input, date);

  const existing = readCheckinsFromOnboarding(onboardingData);
  const existingDates = existing.filter((row) => row.user === userId).map((row) => row.date);
  const nextStreak = computeNextStreak(existingDates, date);

  if (!inserted) {
    const nextRecord: DailyCheckInRecord = {
      id: crypto.randomUUID(),
      mood: input.mood,
      energy_stress_level: input.energyStressLevel,
      reflection: input.reflection.trim(),
      date: date.toISOString(),
      user: userId,
    };

    const withoutToday = existing.filter(
      (row) => !(row.user === userId && toDateKey(new Date(row.date)) === toDateKey(date)),
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding_data: {
          ...(onboardingData ?? {}),
          [DAILY_CHECKINS_ONBOARDING_KEY]: [
            ...withoutToday.map((row) => ({
              id: row.id,
              mood_number: row.mood,
              energy_stress_level_number: row.energy_stress_level,
              reflection_text: row.reflection,
              date_date: row.date,
              user_user: row.user,
            })),
            {
              id: nextRecord.id,
              mood_number: nextRecord.mood,
              energy_stress_level_number: nextRecord.energy_stress_level,
              reflection_text: nextRecord.reflection,
              date_date: nextRecord.date,
              user_user: nextRecord.user,
            },
          ],
          [DAILY_CHECK_IN_STREAK_FIELD]: nextStreak,
          [STREAK_DAYS_FIELD]: nextStreak,
        } as never,
      })
      .eq("id", userId);

    if (error) throw error;
  } else {
    await tryUpdateUserStreakTable(userId, nextStreak);
  }

  return { streak: nextStreak };
}
