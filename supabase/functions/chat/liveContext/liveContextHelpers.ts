import type {
  ChatActivePathProgress,
  ChatLatestCheckIn,
  ChatLiveContext,
  ChatPathReflectionAnswer,
  ChatReassessmentContext,
} from "../prompt/types.ts";
import {
  isCheckInSubmittedToday,
  mapDailyCheckInRow,
} from "./checkInHelpers.ts";

export const DAILY_CHECKINS_ONBOARDING_KEY = "daily_checkins" as const;
export const DAILY_CHECK_IN_STREAK_FIELD = "dailyCheckInStreak" as const;
export const STREAK_DAYS_FIELD = "streakDays" as const;
export const PATH_RESPONSES_ONBOARDING_KEY = "path_responses" as const;
export const CHAT_CONVERSATIONS_ONBOARDING_KEY = "chat_conversations" as const;
export const PATH_ENROLLMENT_ONBOARDING_KEY = "path_enrollment1" as const;
export const MICRO_COMMITMENT_ACTIVE_KEY = "micro_commitment_active_text" as const;

const MAX_RECENT_REFLECTIONS = 9;

export function isSchemaUnavailable(error: { code?: string; message?: string }): boolean {
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

export function aggregateLiveContext(input: {
  latestCheckIn: ChatLatestCheckIn | null;
  streakDays: number;
  activeMicroCommitmentCandidates: Array<string | null | undefined>;
  completedMicroCommitments?: string[];
  sessionCount: number | null;
  pathReflections: ChatPathReflectionAnswer[];
  activePathProgress?: ChatActivePathProgress | null;
  latestReassessment?: ChatReassessmentContext | null;
  sessionType?: ChatLiveContext["sessionType"];
  daysSinceLastSession?: number | null;
  hasPriorCrisisSession?: boolean | null;
  significantPulseDrop?: boolean | null;
  exchangeCount?: number | null;
  memoryFactsBlock?: string | null;
  significantLifeEventFlag?: boolean | null;
}): ChatLiveContext {
  const activeMicroCommitment =
    input.activeMicroCommitmentCandidates
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find((value) => value.length > 0) ?? null;

  const completedMicroCommitments = (input.completedMicroCommitments ?? [])
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter((value) => value.length > 0);

  return {
    latestCheckIn: input.latestCheckIn,
    streakDays: Number.isFinite(input.streakDays) ? input.streakDays : null,
    activeMicroCommitment,
    completedMicroCommitments,
    sessionCount: input.sessionCount,
    pathReflections: input.pathReflections,
    activePathProgress: input.activePathProgress ?? null,
    latestReassessment: input.latestReassessment ?? null,
    sessionType: input.sessionType ?? "text",
    daysSinceLastSession: input.daysSinceLastSession ?? null,
    hasPriorCrisisSession: input.hasPriorCrisisSession ?? null,
    significantPulseDrop: input.significantPulseDrop ?? null,
    exchangeCount: input.exchangeCount ?? null,
    memoryFactsBlock: input.memoryFactsBlock ?? null,
    significantLifeEventFlag: input.significantLifeEventFlag ?? null,
  };
}

export function readStreakFromOnboarding(
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

export function readActiveMicroCommitmentFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): string | null {
  const primary = onboardingData?.[MICRO_COMMITMENT_ACTIVE_KEY];
  if (typeof primary === "string" && primary.trim()) return primary.trim();
  const legacy = onboardingData?.micro_commitment_active;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

type DailyCheckInRecord = {
  mood: number;
  energy_stress_level: number;
  reflection: string;
  feeling_word?: string | null;
  date: string;
  user: string;
  micro_commitment_status?: string | null;
};

export function readTodayCheckInFromOnboarding(
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): ChatLatestCheckIn | null {
  const raw = onboardingData?.[DAILY_CHECKINS_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return null;

  const records = raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const mood = Number(row.mood);
      const energy = Number(row.energyStressLevel ?? row.energy_stress_level);
      const reflection = typeof row.reflection === "string" ? row.reflection : "";
      const feelingWord =
        typeof row.feelingWord === "string"
          ? row.feelingWord
          : typeof row.feeling_word === "string"
            ? row.feeling_word
            : "";
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
        feeling_word: feelingWord,
        date,
        user,
        micro_commitment_status: microCommitmentStatus,
      } satisfies DailyCheckInRecord & { id: string };
    })
    .filter((row): row is DailyCheckInRecord & { id: string } => row !== null)
    .filter((row) => row.user === userId)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  for (const record of records) {
    const mapped = mapDailyCheckInRow({
      mood: record.mood,
      energy_stress_level: record.energy_stress_level,
      reflection: record.reflection,
      feelingWord: record.feeling_word ?? "",
      date: record.date,
      micro_commitment_status: record.micro_commitment_status,
    });
    if (mapped && isCheckInSubmittedToday(mapped)) {
      return mapped;
    }
  }

  return null;
}

/** @deprecated Prefer readTodayCheckInFromOnboarding for Layer 10 session-open context. */
export function readLatestCheckInFromOnboarding(
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): ChatLatestCheckIn | null {
  return readTodayCheckInFromOnboarding(userId, onboardingData);
}

export function readSessionCountFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): number | null {
  const raw = onboardingData?.[CHAT_CONVERSATIONS_ONBOARDING_KEY];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.length;
}

export function readPathReflectionsFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): ChatPathReflectionAnswer[] {
  const raw = onboardingData?.[PATH_RESPONSES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  const flattened: ChatPathReflectionAnswer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const pathName = typeof row.pathName === "string" ? row.pathName.trim() : undefined;
    const sessionTitle =
      typeof row.sessionTitle === "string" ? row.sessionTitle.trim() : undefined;
    const answeredAt = typeof row.submittedAt === "string" ? row.submittedAt : undefined;
    if (!Array.isArray(row.answers)) continue;

    for (const answer of row.answers) {
      if (!answer || typeof answer !== "object") continue;
      const answerRow = answer as Record<string, unknown>;
      const questionText =
        typeof answerRow.questionText === "string" ? answerRow.questionText.trim() : "";
      const answerText =
        typeof answerRow.answerText === "string" ? answerRow.answerText.trim() : "";
      if (!questionText || !answerText) continue;
      flattened.push({ pathName, sessionTitle, questionText, answerText, answeredAt });
    }
  }

  return flattened.slice(-MAX_RECENT_REFLECTIONS);
}

export function readMicroCommitmentFromOnboardingEnrollment(
  onboardingData: Record<string, unknown> | null | undefined,
): string | null {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return null;
  const state = raw as Record<string, unknown>;
  if (state.status === "completed") return null;

  const focused = state.focusedMicroCommitmentSessionId;
  if (!Array.isArray(focused) || focused.length === 0) return null;

  const commitments = state.micro_commitment_texts;
  if (Array.isArray(commitments)) {
    const first = commitments.find((entry) => typeof entry === "string" && entry.trim());
    if (typeof first === "string") return first.trim();
  }

  return null;
}
