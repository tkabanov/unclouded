import { supabase } from "@/integrations/supabase/client";
import { updatePulseBaselineAfterCheckIn } from "@/lib/dashboard/pulseBaselineApi";
import {
  computeStreakFromDateKeys,
  resolveEffectiveCheckInStreak,
  toCheckInDateKey,
} from "../../../../supabase/functions/chat/liveContext/streakHelpers.ts";

/** Bubble user field from workflow bTIWG streak update. */
export const DAILY_CHECK_IN_STREAK_FIELD = "dailyCheckInStreak" as const;
export const STREAK_DAYS_FIELD = "streakDays" as const;

/** Fallback history when `dailycheckin` table is absent from prototype schema. */
export const DAILY_CHECKINS_ONBOARDING_KEY = "daily_checkins" as const;

export interface DailyCheckInInput {
  mood: number;
  energyStressLevel: number;
  reflection: string;
  /** Build Brief Zone H — Yes / Partially / No / I forgot */
  microCommitmentStatus?: string | null;
  date?: Date;
}

/** Canonical values stored in micro_commitment_status (Layer 10 follow-through). */
export const COMMITMENT_FOLLOW_THROUGH_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "partially", label: "Partially" },
  { value: "no", label: "No" },
  { value: "I forgot", label: "I forgot" },
] as const;

export interface DailyCheckInRecord {
  id: string;
  mood: number;
  energy_stress_level: number;
  reflection: string;
  date: string;
  user: string;
  micro_commitment_status?: string | null;
}

/** Latest check-in snapshot for chat live context (Build Brief daily pulse fields). */
export interface LatestDailyCheckIn {
  date: string | null;
  pulse: number | null;
  feeling: string | null;
  energyStressLevel: number | null;
  microCommitmentStatus: string | null;
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
  return toCheckInDateKey(date);
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
      const mood = Number(row.mood ?? row.mood);
      const energy = Number(row.energyStressLevel ?? row.energy_stress_level);
      const reflection = typeof row.reflection === "string" ? row.reflection : "";
      const date = typeof row.date === "string" ? row.date : "";
      const user = typeof row.userId === "string" ? row.userId : "";
      const microCommitmentStatus =
        typeof row.microCommitmentStatus === "string"
          ? row.microCommitmentStatus
          : typeof row.micro_commitment_status === "string"
            ? row.micro_commitment_status
            : null;
      if (!date || Number.isNaN(mood) || Number.isNaN(energy)) return null;
      return {
        id: typeof row.id === "string" ? row.id : `onboarding-${index}`,
        mood,
        energy_stress_level: energy,
        reflection,
        date,
        user,
        micro_commitment_status: microCommitmentStatus,
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
  const allDates = [...existingDates.map((d) => d.slice(0, 10)), today].filter(Boolean);
  return Math.max(1, computeStreakFromDateKeys(allDates, today));
}

async function collectCheckInDateKeys(
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<string[]> {
  const onboardingDates = readCheckinsFromOnboarding(onboardingData)
    .filter((row) => row.user === userId)
    .map((row) => row.date);
  const tableDates = await tryFetchCheckinDatesFromTable(userId);
  return tableDates !== null ? tableDates : onboardingDates;
}

async function syncStoredStreak(
  userId: string,
  effectiveStreak: number,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<void> {
  const storedFromTable = await tryFetchStreakFromTable(userId);
  const stored =
    storedFromTable !== null
      ? storedFromTable
      : readStreakFromOnboarding(onboardingData);

  if (stored === effectiveStreak) return;

  const updatedOnTable = await tryUpdateUserStreakTable(userId, effectiveStreak);
  if (updatedOnTable) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      onboardingData: {
        ...(onboardingData ?? {}),
        [DAILY_CHECK_IN_STREAK_FIELD]: effectiveStreak,
        [STREAK_DAYS_FIELD]: effectiveStreak,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

async function tryFetchCheckinDatesFromTable(userId: string): Promise<string[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("dailyCheckin")
    .select("date")
    .eq("userId", userId);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const date = (row as { date?: string | null }).date;
      return typeof date === "string" ? date.slice(0, 10) : null;
    })
    .filter((date): date is string => Boolean(date));
}

async function tryFetchStreakFromTable(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("dailyCheckInStreak, streakDays")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!data || typeof data !== "object") return 0;
  const row = data as Record<string, unknown>;
  const streak =
    row.dailyCheckInStreak ?? row.streakDays ?? 0;
  const parsed = Number(streak);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

async function tryInsertCheckinTable(
  userId: string,
  input: DailyCheckInInput,
  date: Date,
): Promise<boolean> {
  const client = supabase as unknown as UntypedSupabase;
  const payload: Record<string, unknown> = {
    mood: input.mood,
    energyStressLevel: input.energyStressLevel,
    reflection: input.reflection.trim(),
    userId: userId,
    date: date.toISOString(),
  };
  const microCommitmentStatus = input.microCommitmentStatus?.trim();
  if (microCommitmentStatus) {
    payload.microCommitmentStatus = microCommitmentStatus;
    payload.micro_commitment_status = microCommitmentStatus;
  }

  const { error } = await client.from("dailyCheckin").insert(payload);

  if (!error) return true;
  if (isSchemaUnavailable(error)) return false;
  throw error;
}

async function tryUpdateUserStreakTable(userId: string, streak: number): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      dailyCheckInStreak: streak,
      streakDays: streak,
    })
    .eq("id", userId);

  if (!error) return true;
  if (isSchemaUnavailable(error)) return false;
  throw error;
}

function mapCheckinRecordToLatest(record: DailyCheckInRecord): LatestDailyCheckIn {
  return {
    date: record.date || null,
    pulse: Number.isFinite(record.mood) ? record.mood : null,
    feeling: record.reflection.trim() ? record.reflection.trim() : null,
    energyStressLevel: Number.isFinite(record.energy_stress_level)
      ? record.energy_stress_level
      : null,
    microCommitmentStatus: record.micro_commitment_status?.trim()
      ? record.micro_commitment_status.trim()
      : null,
  };
}

async function tryFetchLatestCheckinFromTable(
  userId: string,
): Promise<LatestDailyCheckIn | null | undefined> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("dailyCheckin")
    .select("mood, energyStressLevel, reflection, date, createdAt")
    .eq("userId", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return undefined;
    throw error;
  }

  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  const mood = Number(row.mood);
  const energy = Number(row.energyStressLevel);
  const reflection = typeof row.reflection === "string" ? row.reflection : "";
  const date =
    typeof row.date === "string"
      ? row.date
      : typeof row.createdAt === "string"
        ? row.createdAt
        : null;
  const microCommitmentStatus =
    typeof row.microCommitmentStatus === "string"
      ? row.microCommitmentStatus
      : typeof row.micro_commitment_status === "string"
        ? row.micro_commitment_status
        : null;

  if (Number.isNaN(mood) && Number.isNaN(energy) && !reflection.trim()) {
    return null;
  }

  return {
    date,
    pulse: Number.isFinite(mood) ? mood : null,
    feeling: reflection.trim() ? reflection.trim() : null,
    energyStressLevel: Number.isFinite(energy) ? energy : null,
    microCommitmentStatus: microCommitmentStatus?.trim() ? microCommitmentStatus.trim() : null,
  };
}

function readLatestCheckinFromOnboarding(
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): LatestDailyCheckIn | null {
  const records = readCheckinsFromOnboarding(onboardingData)
    .filter((row) => row.user === userId)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  if (records.length === 0) return null;
  return mapCheckinRecordToLatest(records[0]);
}

/**
 * Most recent daily check-in for the current user — table first, onboarding fallback.
 */
export async function fetchLatestDailyCheckIn(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<LatestDailyCheckIn | null> {
  const fromTable = await tryFetchLatestCheckinFromTable(userId);
  if (fromTable !== undefined) return fromTable;
  return readLatestCheckinFromOnboarding(userId, onboardingData);
}

/**
 * Read streak badge value — profiles.dailyCheckInStreak with streakDays fallback.
 */
export async function fetchDailyCheckInStreak(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<number> {
  const dateKeys = await collectCheckInDateKeys(userId, onboardingData ?? null);
  const effectiveStreak = resolveEffectiveCheckInStreak(dateKeys);
  await syncStoredStreak(userId, effectiveStreak, onboardingData ?? null);
  return effectiveStreak;
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

  const onboardingDates = readCheckinsFromOnboarding(onboardingData)
    .filter((row) => row.user === userId)
    .map((row) => row.date);
  const tableDates = inserted ? await tryFetchCheckinDatesFromTable(userId) : null;
  // Table insert already includes today's row; exclude it so computeNextStreak can add submit day once.
  const existingDates =
    tableDates !== null
      ? tableDates.filter((d) => d !== toDateKey(date))
      : onboardingDates;
  const nextStreak = computeNextStreak(existingDates, date);

  if (!inserted) {
    const existing = readCheckinsFromOnboarding(onboardingData);
    const microCommitmentStatus = input.microCommitmentStatus?.trim() || null;
    const nextRecord: DailyCheckInRecord = {
      id: crypto.randomUUID(),
      mood: input.mood,
      energy_stress_level: input.energyStressLevel,
      reflection: input.reflection.trim(),
      date: date.toISOString(),
      user: userId,
      micro_commitment_status: microCommitmentStatus,
    };

    const withoutToday = existing.filter(
      (row) => !(row.user === userId && toDateKey(new Date(row.date)) === toDateKey(date)),
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        onboardingData: {
          ...(onboardingData ?? {}),
          [DAILY_CHECKINS_ONBOARDING_KEY]: [
            ...withoutToday.map((row) => ({
              id: row.id,
              mood: row.mood,
              energyStressLevel: row.energy_stress_level,
              reflection: row.reflection,
              date: row.date,
              userId: row.user,
              ...(row.micro_commitment_status?.trim()
                ? {
                    microCommitmentStatus: row.micro_commitment_status.trim(),
                    micro_commitment_status: row.micro_commitment_status.trim(),
                  }
                : {}),
            })),
            {
              id: nextRecord.id,
              mood: nextRecord.mood,
              energyStressLevel: nextRecord.energy_stress_level,
              reflection: nextRecord.reflection,
              date: nextRecord.date,
              userId: nextRecord.user,
              ...(microCommitmentStatus
                ? {
                    microCommitmentStatus,
                    micro_commitment_status: microCommitmentStatus,
                  }
                : {}),
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

  // REQ-05: rolling 14-day pulse baseline + significant drop flag
  try {
    await updatePulseBaselineAfterCheckIn(userId, input.mood);
  } catch {
    // Non-blocking — check-in itself already succeeded.
  }

  return { streak: nextStreak };
}
