/**
 * Path session fetch + completion scheduling for MOD-DRSAM-PATHS (PATHS-07).
 * Reads pathsession/pathquestion when tables exist; falls back to static path catalog.
 */
import type { PathSessionFormData } from "@/components/design-system/SessionCompletionForm";
import { supabase } from "@/integrations/supabase/client";
import { getPathBySlug, HARD_SEASONS_PATH, type PathSession } from "@/lib/paths";
import { incrementModulesCompletedCount } from "@/lib/userProfile/userProfileHooks";

type PathsessionRow = {
  id?: string;
  title?: string;
  coachingText?: string;
  microCommitment?: string;
};

type PathquestionRow = {
  id?: string;
  questionText?: string;
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

function sessionToFormData(session: PathSession): PathSessionFormData {
  return {
    title: session.title,
    coachingText: session.coaching_text,
    microCommitment: session.micro_commitment,
    questions: session.questions.map((question, index) => ({
      id: `${session.id}-q${index + 1}`,
      questionText: question,
    })),
  };
}

function fetchPathSessionFromCatalog(
  sessionId: string,
  pathSlug?: string,
): PathSessionFormData | null {
  const path = pathSlug ? (getPathBySlug(pathSlug) ?? HARD_SEASONS_PATH) : HARD_SEASONS_PATH;
  const session = path.sessions.find((entry) => entry.id === sessionId);
  return session ? sessionToFormData(session) : null;
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
    .eq("sessionId", sessionId);

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

/** Resolve custom.pathsession row for SessionCompletionForm (bTIyi). */
export async function fetchPathSession(
  sessionId: string,
  pathSlug?: string,
): Promise<PathSessionFormData | null> {
  const fromTable = await tryFetchPathSessionFromTable(sessionId);
  if (fromTable !== undefined) return fromTable;
  return fetchPathSessionFromCatalog(sessionId, pathSlug);
}

/**
 * bTJCM ScheduleAPIEvent stub — schedules path-session completion handler.
 * Plugin actions bTJBC/bTJBI remain inert in SessionCompletionForm.
 */
export async function schedulePathSessionCompletion(
  sessionId: string,
  enrollmentId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await incrementModulesCompletedCount(user.id);
  }

  console.info("[pathsSessionApi] scheduled path session completion", {
    sessionId,
    enrollmentId,
    handler: "bTJCM",
    confidenceTrigger: "bTIFU",
  });
}
