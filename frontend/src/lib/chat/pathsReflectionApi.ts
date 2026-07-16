import { supabase } from "@/integrations/supabase/client";
import type { ChatPathReflectionAnswer } from "../../../../supabase/functions/chat/prompt/types.ts";

/** Fallback when pathResponse table is absent from prototype schema. */
export const PATH_RESPONSES_ONBOARDING_KEY = "path_responses" as const;

const MAX_RECENT_REFLECTIONS = 9;

type PathResponseRow = {
  id?: string;
  sessionId?: string | null;
  userId?: string | null;
  questionText?: string | null;
  answerText?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  pathSession?: {
    title?: string | null;
    path?: { name?: string | null } | null;
  } | null;
};

type OnboardingPathResponseEntry = {
  sessionId?: string;
  pathName?: string;
  sessionTitle?: string;
  answers?: Array<{ questionText?: string; answerText?: string }>;
  submittedAt?: string;
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

function readPathResponsesFromOnboarding(
  onboardingData: Record<string, unknown> | null | undefined,
): ChatPathReflectionAnswer[] {
  const raw = onboardingData?.[PATH_RESPONSES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return [];

  const flattened: ChatPathReflectionAnswer[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as OnboardingPathResponseEntry;
    const pathName = typeof row.pathName === "string" ? row.pathName.trim() : undefined;
    const sessionTitle =
      typeof row.sessionTitle === "string" ? row.sessionTitle.trim() : undefined;
    const answeredAt =
      typeof row.submittedAt === "string" ? row.submittedAt : undefined;

    if (!Array.isArray(row.answers)) continue;

    for (const answer of row.answers) {
      if (!answer || typeof answer !== "object") continue;
      const questionText =
        typeof answer.questionText === "string" ? answer.questionText.trim() : "";
      const answerText =
        typeof answer.answerText === "string" ? answer.answerText.trim() : "";
      if (!questionText || !answerText) continue;
      flattened.push({
        pathName,
        sessionTitle,
        questionText,
        answerText,
        answeredAt,
      });
    }
  }

  return flattened.slice(-MAX_RECENT_REFLECTIONS);
}

async function tryFetchPathResponsesFromTable(
  userId: string,
): Promise<ChatPathReflectionAnswer[] | null> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathResponse")
    .select("id, sessionId, questionText, answerText, createdAt")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(MAX_RECENT_REFLECTIONS);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  if (!Array.isArray(data)) return [];

  const sessionIds = [
    ...new Set(
      data
        .map((entry) => {
          const row = entry as PathResponseRow;
          return typeof row.sessionId === "string" ? row.sessionId : null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const sessionMeta = new Map<string, { title?: string; pathName?: string }>();
  if (sessionIds.length > 0) {
    const { data: sessions, error: sessionError } = await client
      .from("pathSession")
      .select("id, title, path(name)")
      .in("id", sessionIds);

    if (sessionError && !isSchemaUnavailable(sessionError)) {
      throw sessionError;
    }

    if (Array.isArray(sessions)) {
      for (const entry of sessions) {
        const row = entry as {
          id?: string;
          title?: string | null;
          path?: { name?: string | null } | null;
        };
        if (!row.id) continue;
        sessionMeta.set(row.id, {
          title: row.title?.trim() || undefined,
          pathName: row.path?.name?.trim() || undefined,
        });
      }
    }
  }

  return data
    .map((entry) => {
      const row = entry as PathResponseRow;
      const questionText =
        typeof row.questionText === "string" ? row.questionText.trim() : "";
      const answerText =
        typeof row.answerText === "string" ? row.answerText.trim() : "";
      if (!questionText || !answerText) return null;

      const meta =
        typeof row.sessionId === "string" ? sessionMeta.get(row.sessionId) : undefined;
      const answeredAt =
        typeof row.createdAt === "string"
          ? row.createdAt
          : typeof row.updatedAt === "string"
            ? row.updatedAt
            : undefined;

      return {
        pathName: meta?.pathName,
        sessionTitle: meta?.title,
        questionText,
        answerText,
        answeredAt,
      } satisfies ChatPathReflectionAnswer;
    })
    .filter((item): item is ChatPathReflectionAnswer => item !== null)
    .reverse();
}

/**
 * Recent path reflection Q&A for AI coaching context (US-305).
 * Returns empty array when no responses exist — never fabricates answers.
 */
export async function fetchRecentPathReflectionAnswers(
  userId: string,
  onboardingData?: Record<string, unknown> | null,
): Promise<ChatPathReflectionAnswer[]> {
  const fromTable = await tryFetchPathResponsesFromTable(userId);
  if (fromTable !== null) return fromTable;
  return readPathResponsesFromOnboarding(onboardingData);
}
