import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ChatLatestCheckIn, ChatLiveContext, ChatPathReflectionAnswer } from "./prompt/types.ts";
import {
  aggregateLiveContext,
  isSchemaUnavailable,
  readActiveMicroCommitmentFromOnboarding,
  readLatestCheckInFromOnboarding,
  readMicroCommitmentFromOnboardingEnrollment,
  readPathReflectionsFromOnboarding,
  readSessionCountFromOnboarding,
  readStreakFromOnboarding,
} from "./liveContext/liveContextHelpers.ts";

const MAX_RECENT_REFLECTIONS = 9;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

async function fetchLatestCheckIn(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatLatestCheckIn | null> {
  const { data, error } = await supabase
    .from("dailyCheckin")
    .select("mood, energyStressLevel, reflection, date, createdAt, microCommitmentStatus")
    .eq("userId", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return readLatestCheckInFromOnboarding(userId, onboardingData);
  }

  if (!data || typeof data !== "object") {
    return readLatestCheckInFromOnboarding(userId, onboardingData);
  }

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
    typeof row.microCommitmentStatus === "string" ? row.microCommitmentStatus : null;

  if (Number.isNaN(mood) && Number.isNaN(energy) && !reflection.trim()) {
    return readLatestCheckInFromOnboarding(userId, onboardingData);
  }

  return {
    date,
    pulse: Number.isFinite(mood) ? mood : null,
    feeling: reflection.trim() ? reflection.trim() : null,
    energyStressLevel: Number.isFinite(energy) ? energy : null,
    microCommitmentStatus: microCommitmentStatus?.trim() ? microCommitmentStatus.trim() : null,
  };
}

async function fetchStreakDays(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<number> {
  const { data, error } = await supabase
    .from("profiles")
    .select("dailyCheckInStreak, streakDays")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return readStreakFromOnboarding(onboardingData);
  }

  if (!data || typeof data !== "object") return readStreakFromOnboarding(onboardingData);
  const row = data as Record<string, unknown>;
  const streak = row.dailyCheckInStreak ?? row.streakDays ?? 0;
  const parsed = Number(streak);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : readStreakFromOnboarding(onboardingData);
}

async function fetchActiveMicroCommitment(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pathEnrollment")
    .select("status, focusedMicroCommitmentSessionId, completedMicroCommitmentSessionIds")
    .eq("userId", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return (
      readMicroCommitmentFromOnboardingEnrollment(onboardingData) ??
      readActiveMicroCommitmentFromOnboarding(onboardingData)
    );
  }

  if (!data || typeof data !== "object") {
    return (
      readMicroCommitmentFromOnboardingEnrollment(onboardingData) ??
      readActiveMicroCommitmentFromOnboarding(onboardingData)
    );
  }

  const row = data as Record<string, unknown>;
  if (row.status === "completed") return null;

  const focusedIds = asStringArray(row.focusedMicroCommitmentSessionId);
  const completedIds = new Set(asStringArray(row.completedMicroCommitmentSessionIds));
  const nextFocusedId = focusedIds.find((id) => !completedIds.has(id));
  if (!nextFocusedId) {
    return readActiveMicroCommitmentFromOnboarding(onboardingData);
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("pathSession")
    .select("microCommitment")
    .eq("id", nextFocusedId)
    .maybeSingle();

  if (sessionError) {
    if (!isSchemaUnavailable(sessionError)) throw sessionError;
    return readActiveMicroCommitmentFromOnboarding(onboardingData);
  }

  const microCommitment =
    sessionData && typeof sessionData === "object"
      ? (sessionData as Record<string, unknown>).microCommitment
      : null;

  if (typeof microCommitment === "string" && microCommitment.trim()) {
    return microCommitment.trim();
  }

  return readActiveMicroCommitmentFromOnboarding(onboardingData);
}

async function fetchSessionCount(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("chatConversation")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId);

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return readSessionCountFromOnboarding(onboardingData);
  }

  if (!count || count <= 0) return readSessionCountFromOnboarding(onboardingData);
  return count;
}

async function fetchPathReflections(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatPathReflectionAnswer[]> {
  const { data, error } = await supabase
    .from("pathResponse")
    .select("questionText, answerText, createdAt, pathSession(title, path(name))")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(MAX_RECENT_REFLECTIONS);

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return readPathReflectionsFromOnboarding(onboardingData);
  }

  if (!Array.isArray(data) || data.length === 0) {
    return readPathReflectionsFromOnboarding(onboardingData);
  }

  const reflections = data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const questionText =
        typeof row.questionText === "string" ? row.questionText.trim() : "";
      const answerText = typeof row.answerText === "string" ? row.answerText.trim() : "";
      if (!questionText || !answerText) return null;

      const pathSession =
        row.pathSession && typeof row.pathSession === "object"
          ? (row.pathSession as Record<string, unknown>)
          : null;
      const path =
        pathSession?.path && typeof pathSession.path === "object"
          ? (pathSession.path as Record<string, unknown>)
          : null;

      return {
        pathName: typeof path?.name === "string" ? path.name.trim() : undefined,
        sessionTitle:
          typeof pathSession?.title === "string" ? pathSession.title.trim() : undefined,
        questionText,
        answerText,
        answeredAt: typeof row.createdAt === "string" ? row.createdAt : undefined,
      } satisfies ChatPathReflectionAnswer;
    })
    .filter((item): item is ChatPathReflectionAnswer => item !== null)
    .reverse();

  return reflections.length > 0
    ? reflections
    : readPathReflectionsFromOnboarding(onboardingData);
}

/** Server-side live signal aggregation for chat prompt (T-008). */
export async function loadServerLiveContext(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatLiveContext> {
  const [latestCheckIn, streakDays, activeMicroCommitment, sessionCount, pathReflections] =
    await Promise.all([
      fetchLatestCheckIn(supabase, userId, onboardingData),
      fetchStreakDays(supabase, userId, onboardingData),
      fetchActiveMicroCommitment(supabase, userId, onboardingData),
      fetchSessionCount(supabase, userId, onboardingData),
      fetchPathReflections(supabase, userId, onboardingData),
    ]);

  return aggregateLiveContext({
    latestCheckIn,
    streakDays,
    activeMicroCommitmentCandidates: [
      activeMicroCommitment,
      readActiveMicroCommitmentFromOnboarding(onboardingData),
    ],
    sessionCount,
    pathReflections,
  });
}
