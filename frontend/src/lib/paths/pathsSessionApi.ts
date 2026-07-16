/**
 * Path session fetch + completion for MOD-DRSAM-PATHS (PATHS-07).
 * Session is complete when reflection questions are answered (PathResponse).
 * Micro-commitment / "Set as My Focus" is optional and does not gate progress.
 */
import type { PathSessionFormData } from "@/components/design-system/SessionCompletionForm";
import { supabase } from "@/integrations/supabase/client";
import {
  PATH_ENROLLMENT_ONBOARDING_KEY,
  type PathEnrollmentOnboardingState,
} from "@/lib/dashboard/microCommitmentsApi";
import { PATH_ENROLLMENT_STATUS } from "@/lib/enums/pathEnrollment";
import { PATH_RESPONSES_ONBOARDING_KEY } from "@/lib/chat/pathsReflectionApi";
import { fetchPathSessionsByKey } from "@/lib/paths/pathsCatalogApi";
import { incrementModulesCompletedCount } from "@/lib/userProfile/userProfileHooks";
import { loadProfileRow, patchOnboardingAndResults } from "@/lib/userProfile/profileFieldPatch";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

type PathsessionRow = {
  id?: string;
  title?: string;
  coachingText?: string;
  microCommitment?: string;
  pathId?: string | null;
};

type PathquestionRow = {
  id?: string;
  questionText?: string;
};

type PathEnrollmentRow = {
  id?: string;
  userId?: string;
  pathId?: string | null;
  status?: string | null;
  completedSessionsCount?: number | string | null;
  currentSessionId?: string | null;
  focusedMicroCommitmentSessionId?: string | null;
  isMicroCommitmentInFocus?: boolean | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export type SessionAnswerInput = {
  questionId: string;
  questionText: string;
  answerText: string;
};

export type CompletePathSessionInput = {
  sessionId: string;
  enrollmentId: string;
  answers: SessionAnswerInput[];
  setAsFocus?: boolean;
  microCommitmentText?: string;
  pathName?: string;
  sessionTitle?: string;
};

function toCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

function readEnrollmentState(
  onboardingData: Record<string, unknown> | null | undefined,
): PathEnrollmentOnboardingState {
  const raw = onboardingData?.[PATH_ENROLLMENT_ONBOARDING_KEY];
  if (!raw || typeof raw !== "object") return {};
  return raw as PathEnrollmentOnboardingState;
}

async function tryFetchPathSessionFromTable(
  sessionId: string,
): Promise<PathSessionFormData | null | undefined> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathSession")
    .select("id, title, coachingText, microCommitment")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return undefined;
    throw error;
  }

  if (!data || typeof data !== "object") return null;

  const row = data as PathsessionRow;
  const { data: questionRows, error: questionError } = await client
    .from("pathQuestion")
    .select("id, questionText")
    .eq("sessionId", sessionId)
    .order("index", { ascending: true });

  if (questionError && !isSchemaUnavailable(questionError)) {
    throw questionError;
  }

  const questions = Array.isArray(questionRows)
    ? questionRows
        .map((entry) => {
          const question = entry as PathquestionRow;
          if (!question.id) return null;
          return {
            id: question.id,
            questionText: question.questionText ?? "",
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    : [];

  return {
    title: row.title ?? "",
    coachingText: row.coachingText ?? "",
    microCommitment: row.microCommitment ?? "",
    questions,
  };
}

/** Resolve pathSession row for SessionCompletionForm (bTIyi). */
export async function fetchPathSession(
  sessionId: string,
  _pathSlug?: string,
): Promise<PathSessionFormData | null> {
  const fromTable = await tryFetchPathSessionFromTable(sessionId);
  if (fromTable !== undefined) return fromTable;
  return null;
}

async function persistAnswersToPathResponseTable(
  userId: string,
  sessionId: string,
  answers: SessionAnswerInput[],
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const rows = answers.map((answer) => ({
    id: crypto.randomUUID(),
    userId,
    sessionId,
    questionId: answer.questionId,
    questionText: answer.questionText,
    answerText: answer.answerText,
  }));

  const { error } = await client.from("pathResponse").insert(rows as never);
  if (!error) return true;
  if (isSchemaUnavailable(error)) return null;
  throw error;
}

async function persistAnswersToOnboarding(
  userId: string,
  sessionId: string,
  answers: SessionAnswerInput[],
  pathName?: string,
  sessionTitle?: string,
): Promise<void> {
  const { onboardingData } = await loadProfileRow(userId);
  const existingRaw = onboardingData[PATH_RESPONSES_ONBOARDING_KEY];
  const existing = Array.isArray(existingRaw) ? [...existingRaw] : [];

  existing.push({
    sessionId,
    pathName: pathName ?? "",
    sessionTitle: sessionTitle ?? "",
    answers: answers.map((answer) => ({
      questionText: answer.questionText,
      answerText: answer.answerText,
    })),
    submittedAt: new Date().toISOString(),
  });

  await patchOnboardingAndResults(userId, {
    [PATH_RESPONSES_ONBOARDING_KEY]: existing,
  });
}

async function resolveNextSessionId(
  pathIdOrSlug: string | null | undefined,
  completedSessionId: string,
): Promise<string | null> {
  if (!pathIdOrSlug) return null;
  const sessions = await fetchPathSessionsByKey(pathIdOrSlug);
  if (sessions.length === 0) return null;
  const currentIndex = sessions.findIndex((session) => session.id === completedSessionId);
  if (currentIndex < 0) return sessions[0]?.id ?? null;
  return sessions[currentIndex + 1]?.id ?? null;
}

async function advanceEnrollmentInTable(
  enrollmentId: string,
  userId: string,
  sessionId: string,
  setAsFocus: boolean,
): Promise<boolean | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathEnrollment")
    .select(
      "id, userId, pathId, status, completedSessionsCount, currentSessionId, focusedMicroCommitmentSessionId",
    )
    .eq("id", enrollmentId)
    .eq("userId", userId)
    .maybeSingle();

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }
  if (!data || typeof data !== "object") {
    throw new Error("Enrollment not found.");
  }

  const row = data as PathEnrollmentRow;
  const nextSessionId = await resolveNextSessionId(row.pathId, sessionId);
  const completedSessionsCount = toCount(row.completedSessionsCount) + 1;
  const isPathComplete = !nextSessionId;

  const update: Record<string, unknown> = {
    completedSessionsCount,
    currentSessionId: nextSessionId,
    status: isPathComplete
      ? PATH_ENROLLMENT_STATUS.COMPLETED
      : (row.status ?? PATH_ENROLLMENT_STATUS.ACTIVE),
  };

  if (setAsFocus) {
    update.focusedMicroCommitmentSessionId = sessionId;
    update.isMicroCommitmentInFocus = true;
  }

  const { error: updateError } = await client
    .from("pathEnrollment")
    .update(update as never)
    .eq("id", enrollmentId)
    .eq("userId", userId);

  if (!updateError) return true;
  if (isSchemaUnavailable(updateError)) return null;
  throw updateError;
}

async function advanceEnrollmentInOnboarding(
  userId: string,
  sessionId: string,
  enrollmentId: string,
  setAsFocus: boolean,
  microCommitmentText?: string,
): Promise<void> {
  const { onboardingData } = await loadProfileRow(userId);
  const existing = readEnrollmentState(onboardingData);
  if (existing.enrollment_id && existing.enrollment_id !== enrollmentId) {
    throw new Error("Enrollment not found.");
  }

  const pathSlug = existing.path_slug;
  const nextSessionId = await resolveNextSessionId(pathSlug, sessionId);
  const completedSessionIds = [...(existing.completedSessionIds ?? [])];
  if (!completedSessionIds.includes(sessionId)) {
    completedSessionIds.push(sessionId);
  }

  const completedSessionsCount = Math.max(
    toCount(existing.completedSessionsCount),
    completedSessionIds.length,
  );
  const isPathComplete = !nextSessionId;

  const nextState: PathEnrollmentOnboardingState = {
    ...existing,
    enrollment_id: existing.enrollment_id ?? enrollmentId,
    status: isPathComplete
      ? PATH_ENROLLMENT_STATUS.COMPLETED
      : (existing.status ?? PATH_ENROLLMENT_STATUS.ACTIVE),
    completedSessionsCount,
    completedSessionIds,
    currentSessionId: nextSessionId ?? undefined,
  };

  if (setAsFocus) {
    nextState.focusedMicroCommitmentSessionId = [sessionId];
  }

  const patch: Record<string, unknown> = {
    [PATH_ENROLLMENT_ONBOARDING_KEY]: nextState,
  };

  if (setAsFocus && microCommitmentText?.trim()) {
    patch.micro_commitment_active = microCommitmentText.trim();
    patch.micro_commitment_active_text = microCommitmentText.trim();
  }

  await patchOnboardingAndResults(userId, patch);
}

/**
 * Complete a path session when reflection questions are submitted.
 * Optionally copies micro-commitment to active focus (Developer FAQ: Set as My Focus).
 */
export async function completePathSession(
  input: CompletePathSessionInput,
): Promise<void> {
  const {
    sessionId,
    enrollmentId,
    answers,
    setAsFocus = false,
    microCommitmentText,
    pathName,
    sessionTitle,
  } = input;

  const trimmedAnswers = answers
    .map((answer) => ({
      ...answer,
      answerText: answer.answerText.trim(),
      questionText: answer.questionText.trim(),
    }))
    .filter((answer) => answer.questionId && answer.questionText && answer.answerText);

  const expectedQuestionIds = answers
    .map((answer) => answer.questionId)
    .filter(Boolean);
  if (expectedQuestionIds.length > 0 && trimmedAnswers.length < expectedQuestionIds.length) {
    throw new Error("Answer all reflection questions to complete this session.");
  }
  if (expectedQuestionIds.length > 0 && trimmedAnswers.length === 0) {
    throw new Error("Answer the reflection questions to complete this session.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to complete a session.");

  const savedToTable =
    trimmedAnswers.length === 0
      ? true
      : await persistAnswersToPathResponseTable(user.id, sessionId, trimmedAnswers);
  if (savedToTable === null) {
    await persistAnswersToOnboarding(
      user.id,
      sessionId,
      trimmedAnswers,
      pathName,
      sessionTitle,
    );
  }

  const advanced = await advanceEnrollmentInTable(
    enrollmentId,
    user.id,
    sessionId,
    setAsFocus,
  );
  if (advanced === null) {
    await advanceEnrollmentInOnboarding(
      user.id,
      sessionId,
      enrollmentId,
      setAsFocus,
      microCommitmentText,
    );
  } else if (setAsFocus && microCommitmentText?.trim()) {
    await patchOnboardingAndResults(user.id, {
      micro_commitment_active: microCommitmentText.trim(),
      micro_commitment_active_text: microCommitmentText.trim(),
    });
  }

  await incrementModulesCompletedCount(user.id);
}
