import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type {
  ChatActivePathProgress,
  ChatLatestCheckIn,
  ChatLiveContext,
  ChatPathReflectionAnswer,
  ChatReassessmentContext,
} from "./prompt/types.ts";
import {
  aggregateLiveContext,
  isSchemaUnavailable,
  readActiveMicroCommitmentFromOnboarding,
  readLatestCheckInFromOnboarding,
  readMicroCommitmentFromOnboardingEnrollment,
  readPathReflectionsFromOnboarding,
  readSessionCountFromOnboarding,
} from "./liveContext/liveContextHelpers.ts";
import { resolveEffectiveCheckInStreak } from "./liveContext/streakHelpers.ts";

const MAX_RECENT_REFLECTIONS = 9;

function asStringArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
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
    .select("mood, energyStressLevel, reflection, date, createdAt")
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
  const microCommitmentStatus = null;

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

async function fetchCheckInDateKeys(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("dailyCheckin")
    .select("date")
    .eq("userId", userId);

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    const raw = onboardingData?.daily_checkins;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        const user = typeof row.userId === "string" ? row.userId : "";
        const date = typeof row.date === "string" ? row.date : "";
        return user === userId && date ? date.slice(0, 10) : null;
      })
      .filter((date): date is string => Boolean(date));
  }

  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      const date = (row as { date?: string | null }).date;
      return typeof date === "string" ? date.slice(0, 10) : null;
    })
    .filter((date): date is string => Boolean(date));
}

async function fetchStreakDays(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<number> {
  const dateKeys = await fetchCheckInDateKeys(supabase, userId, onboardingData);
  return resolveEffectiveCheckInStreak(dateKeys);
}

async function fetchActiveMicroCommitment(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<{ value: string | null; usedOnboardingFallback: boolean }> {
  const { data, error } = await supabase
    .from("pathEnrollment")
    .select(
      "status, focusedMicroCommitmentSessionId, completedMicroCommitmentSessionIds, isMicroCommitmentInFocus",
    )
    .eq("userId", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return {
      value:
        readMicroCommitmentFromOnboardingEnrollment(onboardingData) ??
        readActiveMicroCommitmentFromOnboarding(onboardingData),
      usedOnboardingFallback: true,
    };
  }

  if (!data || typeof data !== "object") {
    return {
      value:
        readMicroCommitmentFromOnboardingEnrollment(onboardingData) ??
        readActiveMicroCommitmentFromOnboarding(onboardingData),
      usedOnboardingFallback: true,
    };
  }

  const row = data as Record<string, unknown>;
  if (row.status === "completed") {
    return { value: null, usedOnboardingFallback: false };
  }
  if (row.isMicroCommitmentInFocus !== true) {
    return { value: null, usedOnboardingFallback: false };
  }

  const focusedIds = asStringArray(row.focusedMicroCommitmentSessionId);
  const completedIds = new Set(asStringArray(row.completedMicroCommitmentSessionIds));
  const nextFocusedId = focusedIds.find((id) => !completedIds.has(id));
  if (!nextFocusedId) {
    return { value: null, usedOnboardingFallback: false };
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("pathSession")
    .select("microCommitment")
    .eq("id", nextFocusedId)
    .maybeSingle();

  if (sessionError) {
    if (!isSchemaUnavailable(sessionError)) throw sessionError;
    return {
      value:
        readMicroCommitmentFromOnboardingEnrollment(onboardingData) ??
        readActiveMicroCommitmentFromOnboarding(onboardingData),
      usedOnboardingFallback: true,
    };
  }

  const microCommitment =
    sessionData && typeof sessionData === "object"
      ? (sessionData as Record<string, unknown>).microCommitment
      : null;

  if (typeof microCommitment === "string" && microCommitment.trim()) {
    return { value: microCommitment.trim(), usedOnboardingFallback: false };
  }

  return { value: null, usedOnboardingFallback: false };
}

async function fetchCompletedMicroCommitments(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("pathEnrollment")
    .select("completedMicroCommitmentSessionIds")
    .eq("userId", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  let completedIds: string[] = [];

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
  } else if (data && typeof data === "object") {
    completedIds = asStringArray(
      (data as Record<string, unknown>).completedMicroCommitmentSessionIds,
    );
  }

  if (completedIds.length === 0) {
    const raw = onboardingData?.path_enrollment1;
    if (raw && typeof raw === "object") {
      completedIds = asStringArray(
        (raw as Record<string, unknown>).completedMicroCommitmentSessionIds,
      );
    }
  }

  if (completedIds.length === 0) return [];

  const { data: sessions, error: sessionError } = await supabase
    .from("pathSession")
    .select("id, microCommitment, title, index")
    .in("id", completedIds);

  if (sessionError) {
    if (!isSchemaUnavailable(sessionError)) throw sessionError;
    return [];
  }

  if (!Array.isArray(sessions)) return [];

  const byId = new Map<string, { text: string; index: number }>();
  for (const entry of sessions) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : null;
    const text =
      typeof row.microCommitment === "string" ? row.microCommitment.trim() : "";
    if (!id || !text) continue;
    const index = Number(row.index);
    byId.set(id, {
      text,
      index: Number.isFinite(index) ? index : 0,
    });
  }

  // Preserve completion order from enrollment (most recently completed last in array).
  return completedIds
    .map((id) => byId.get(id)?.text)
    .filter((text): text is string => Boolean(text))
    .reverse();
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

async function fetchActivePathProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<ChatActivePathProgress | null> {
  const { data, error } = await supabase
    .from("pathEnrollment")
    .select("status, completedSessionsCount, currentSessionId, pathId, path(name, sessionsCount)")
    .eq("userId", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (!isSchemaUnavailable(error)) throw error;
    return null;
  }

  if (!data || typeof data !== "object") return null;

  const row = data as Record<string, unknown>;
  const path =
    row.path && typeof row.path === "object"
      ? (row.path as Record<string, unknown>)
      : null;
  const pathName =
    typeof path?.name === "string" && path.name.trim() ? path.name.trim() : "Path";
  const pathId =
    typeof row.pathId === "string"
      ? row.pathId
      : path && typeof path.id === "string"
        ? path.id
        : null;
  const completedSessionsCount = Number(row.completedSessionsCount);
  const completedCount = Number.isFinite(completedSessionsCount)
    ? Math.max(0, completedSessionsCount)
    : 0;
  const totalSessionsRaw = Number(path?.sessionsCount);
  const totalSessionsCount = Number.isFinite(totalSessionsRaw) && totalSessionsRaw > 0
    ? totalSessionsRaw
    : null;

  let sessions: Array<{ id: string; title: string | null; index: number | null }> = [];
  if (pathId) {
    const { data: sessionRows, error: sessionError } = await supabase
      .from("pathSession")
      .select("id, title, index")
      .eq("pathId", pathId)
      .order("index", { ascending: true });

    if (sessionError) {
      if (!isSchemaUnavailable(sessionError)) throw sessionError;
    } else if (Array.isArray(sessionRows)) {
      sessions = sessionRows
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const session = entry as Record<string, unknown>;
          const id = typeof session.id === "string" ? session.id : null;
          if (!id) return null;
          return {
            id,
            title: typeof session.title === "string" ? session.title : null,
            index: Number.isFinite(Number(session.index)) ? Number(session.index) : null,
          };
        })
        .filter((entry): entry is { id: string; title: string | null; index: number | null } =>
          entry !== null
        );
    }
  }

  const totalSessions = totalSessionsCount ?? (sessions.length > 0 ? sessions.length : null);
  const currentSessionId =
    typeof row.currentSessionId === "string" && row.currentSessionId.trim()
      ? row.currentSessionId.trim()
      : sessions[Math.min(completedCount, Math.max(0, sessions.length - 1))]?.id ?? null;
  const currentSessionTitle =
    sessions.find((session) => session.id === currentSessionId)?.title?.trim() ?? null;
  const nextSessionTitle =
    sessions[Math.min(completedCount, Math.max(0, sessions.length - 1))]?.title?.trim() ?? null;

  return {
    pathName,
    status: typeof row.status === "string" && row.status.trim() ? row.status.trim() : "active",
    completedSessionsCount: completedCount,
    totalSessionsCount: totalSessions,
    currentSessionTitle,
    nextSessionTitle,
    hasActivePaths: true,
  };
}

async function fetchPathReflections(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatPathReflectionAnswer[]> {
  // Flat select first — nested embeds can fail if PostgREST schema cache lags a new table.
  const { data, error } = await supabase
    .from("pathResponse")
    .select("questionText, answerText, createdAt, sessionId")
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

  const sessionIds = [
    ...new Set(
      data
        .map((entry) => {
          const row = entry as Record<string, unknown>;
          return typeof row.sessionId === "string" ? row.sessionId : null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const sessionMeta = new Map<string, { title?: string; pathName?: string }>();
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionError } = await supabase
      .from("pathSession")
      .select("id, title, path(name)")
      .in("id", sessionIds);

    if (sessionError) {
      if (!isSchemaUnavailable(sessionError)) throw sessionError;
    } else if (Array.isArray(sessions)) {
      for (const entry of sessions) {
        if (!entry || typeof entry !== "object") continue;
        const row = entry as Record<string, unknown>;
        const id = typeof row.id === "string" ? row.id : null;
        if (!id) continue;
        const path =
          row.path && typeof row.path === "object"
            ? (row.path as Record<string, unknown>)
            : null;
        sessionMeta.set(id, {
          title: typeof row.title === "string" ? row.title.trim() : undefined,
          pathName: typeof path?.name === "string" ? path.name.trim() : undefined,
        });
      }
    }
  }

  const reflections = data
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const questionText =
        typeof row.questionText === "string" ? row.questionText.trim() : "";
      const answerText = typeof row.answerText === "string" ? row.answerText.trim() : "";
      if (!questionText || !answerText) return null;

      const sessionId = typeof row.sessionId === "string" ? row.sessionId : null;
      const meta = sessionId ? sessionMeta.get(sessionId) : undefined;

      return {
        pathName: meta?.pathName,
        sessionTitle: meta?.title,
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

async function fetchLatestReassessment(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatReassessmentContext | null> {
  try {
    const { data, error } = await supabase
      .from("assessmentResult")
      .select(
        "trajectoryType, reflectionQ1, reflectionQ2, reflectionQ3, reflectionQ4, pathAdaptiveQ, pathAdaptiveAnswer, assessmentDate, isInitial",
      )
      .eq("userId", userId)
      .eq("isInitial", false)
      .order("assessmentDate", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const row = data as Record<string, unknown>;
      return {
        trajectoryType: typeof row.trajectoryType === "string" ? row.trajectoryType : null,
        reflectionQ1: typeof row.reflectionQ1 === "string" ? row.reflectionQ1 : null,
        reflectionQ2: typeof row.reflectionQ2 === "string" ? row.reflectionQ2 : null,
        reflectionQ3: typeof row.reflectionQ3 === "string" ? row.reflectionQ3 : null,
        reflectionQ4: typeof row.reflectionQ4 === "string" ? row.reflectionQ4 : null,
        pathAdaptiveQ: typeof row.pathAdaptiveQ === "string" ? row.pathAdaptiveQ : null,
        pathAdaptiveAnswer:
          typeof row.pathAdaptiveAnswer === "string" ? row.pathAdaptiveAnswer : null,
        assessmentDate: typeof row.assessmentDate === "string" ? row.assessmentDate : null,
      };
    }

    if (error && !isSchemaUnavailable(error)) {
      console.warn("assessmentResult fetch failed", error.message);
    }
  } catch (err) {
    console.warn("assessmentResult fetch error", err);
  }

  const reflections = onboardingData?.reassessment_reflections;
  if (reflections && typeof reflections === "object") {
    const r = reflections as Record<string, unknown>;
    return {
      trajectoryType:
        typeof onboardingData?.trajectory_type === "string"
          ? onboardingData.trajectory_type
          : null,
      reflectionQ1:
        typeof r.reflection_q1 === "string"
          ? r.reflection_q1
          : typeof r.whats_different === "string"
            ? r.whats_different
            : null,
      reflectionQ2:
        typeof r.reflection_q2 === "string"
          ? r.reflection_q2
          : typeof r.still_hard === "string"
            ? r.still_hard
            : null,
      reflectionQ3:
        typeof r.reflection_q3 === "string"
          ? r.reflection_q3
          : typeof r.proud_of === "string"
            ? r.proud_of
            : null,
      reflectionQ4:
        typeof r.reflection_q4 === "string"
          ? r.reflection_q4
          : typeof r.focus_next === "string"
            ? r.focus_next
            : null,
      pathAdaptiveQ:
        typeof onboardingData?.path_adaptive_q === "string"
          ? onboardingData.path_adaptive_q
          : null,
      pathAdaptiveAnswer:
        typeof onboardingData?.path_adaptive_answer === "string"
          ? onboardingData.path_adaptive_answer
          : null,
      assessmentDate: null,
    };
  }

  return null;
}

/** Server-side live signal aggregation for chat prompt (T-008). */
export async function loadServerLiveContext(
  supabase: SupabaseClient,
  userId: string,
  onboardingData: Record<string, unknown> | null | undefined,
): Promise<ChatLiveContext> {
  const [
    latestCheckIn,
    streakDays,
    microCommitmentResult,
    completedMicroCommitments,
    sessionCount,
    pathReflections,
    activePathProgress,
    latestReassessment,
  ] = await Promise.all([
    fetchLatestCheckIn(supabase, userId, onboardingData),
    fetchStreakDays(supabase, userId, onboardingData),
    fetchActiveMicroCommitment(supabase, userId, onboardingData),
    fetchCompletedMicroCommitments(supabase, userId, onboardingData),
    fetchSessionCount(supabase, userId, onboardingData),
    fetchPathReflections(supabase, userId, onboardingData),
    fetchActivePathProgress(supabase, userId),
    fetchLatestReassessment(supabase, userId, onboardingData),
  ]);

  const microCommitmentCandidates = microCommitmentResult.usedOnboardingFallback
    ? [
        microCommitmentResult.value,
        readActiveMicroCommitmentFromOnboarding(onboardingData),
      ]
    : [microCommitmentResult.value];

  return aggregateLiveContext({
    latestCheckIn,
    streakDays,
    activeMicroCommitmentCandidates: microCommitmentCandidates,
    completedMicroCommitments,
    sessionCount,
    pathReflections,
    activePathProgress,
    latestReassessment,
  });
}
