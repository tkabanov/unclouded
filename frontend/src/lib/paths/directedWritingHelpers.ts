import { PATH_RESPONSES_ONBOARDING_KEY } from "@/lib/chat/pathsReflectionApi";
import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";
import type { PathSessionSummary } from "@/lib/paths/pathsCatalogApi";

export const DIRECTED_WRITING_SUB_MODE = "directed_writing" as const;
export const UNSENT_LETTER_PATH_NAME = "The Unsent Letter" as const;
export const UNSENT_LETTER_JOURNAL_TITLE = "Unsent Letter" as const;

export const DIRECTED_WRITING_WITNESS_BANNER =
  "Directed Writing — Kota is a witness, not a coach. Your letter is never sent. Write only for yourself.";

export type JournalLetterDisposition = "save" | "discard";

type PathResponseRow = {
  sessionId?: string | null;
  answerText?: string | null;
};

type OnboardingPathResponseEntry = {
  sessionId?: string;
  answers?: Array<{ answerText?: string }>;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

export function isDirectedWritingSubMode(subMode: string | null | undefined): boolean {
  return subMode?.trim().toLowerCase() === DIRECTED_WRITING_SUB_MODE;
}

export function isFinalDirectedWritingSession(sessionIndex: number | null | undefined): boolean {
  return sessionIndex === 4;
}

export function assembleUnsentLetterContent(
  sections: Array<{ title: string; answerText: string }>,
): string {
  return sections
    .filter((section) => section.answerText.trim())
    .map((section) => `## ${section.title.trim()}\n\n${section.answerText.trim()}`)
    .join("\n\n");
}

function readOnboardingAnswersBySessionId(
  onboardingData: Record<string, unknown> | null | undefined,
): Map<string, string> {
  const raw = onboardingData?.[PATH_RESPONSES_ONBOARDING_KEY];
  if (!Array.isArray(raw)) return new Map();

  const answers = new Map<string, string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as OnboardingPathResponseEntry;
    const sessionId = typeof row.sessionId === "string" ? row.sessionId : null;
    if (!sessionId || !Array.isArray(row.answers)) continue;

    const combined = row.answers
      .map((answer) =>
        typeof answer.answerText === "string" ? answer.answerText.trim() : "",
      )
      .filter(Boolean)
      .join("\n\n");
    if (combined) answers.set(sessionId, combined);
  }

  return answers;
}

async function tryFetchAnswersFromPathResponseTable(
  userId: string,
  sessionIds: string[],
): Promise<Map<string, string> | null> {
  if (sessionIds.length === 0) return new Map();

  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathResponse")
    .select("sessionId, answerText")
    .eq("userId", userId)
    .in("sessionId", sessionIds);

  if (error) {
    if (isSchemaUnavailable(error)) return null;
    throw error;
  }

  const answers = new Map<string, string>();
  if (!Array.isArray(data)) return answers;

  for (const entry of data) {
    const row = entry as PathResponseRow;
    const sessionId = typeof row.sessionId === "string" ? row.sessionId : null;
    const answerText = typeof row.answerText === "string" ? row.answerText.trim() : "";
    if (!sessionId || !answerText) continue;

    const existing = answers.get(sessionId);
    answers.set(sessionId, existing ? `${existing}\n\n${answerText}` : answerText);
  }

  return answers;
}

/** Prior saved answers keyed by pathSession id (table first, onboarding fallback). */
export async function fetchUserPathSessionAnswers(
  userId: string,
  sessionIds: string[],
  onboardingData?: Record<string, unknown> | null,
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(sessionIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const fromTable = await tryFetchAnswersFromPathResponseTable(userId, uniqueIds);
  if (fromTable !== null) return fromTable;

  return readOnboardingAnswersBySessionId(onboardingData);
}

export function buildUnsentLetterSections(
  sessions: PathSessionSummary[],
  answersBySessionId: Map<string, string>,
  currentSessionId: string,
  currentAnswerText: string,
): Array<{ title: string; answerText: string }> {
  return sessions.map((session) => ({
    title: session.title,
    answerText:
      session.id === currentSessionId
        ? currentAnswerText.trim()
        : (answersBySessionId.get(session.id) ?? "").trim(),
  }));
}
