import { supabase } from "@/integrations/supabase/client";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface AdminPathQuestionRecord {
  questionId: string;
  index: number;
  questionText: string;
}

export interface AdminPathSessionRecord {
  sessionId: string;
  pathId: string;
  index: number;
  title: string;
  coachingText: string;
  microCommitment: string;
  questions: AdminPathQuestionRecord[];
}

export interface AdminPathSessionFormState {
  title: string;
  coachingText: string;
  microCommitment: string;
  questions: [string, string, string];
}

type PathsessionRow = {
  id?: string;
  pathId?: string;
  index?: number | string | null;
  title?: string;
  coachingText?: string;
  microCommitment?: string;
};

type PathquestionRow = {
  id?: string;
  sessionId?: string;
  index?: number | string | null;
  questionText?: string;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeQuestions(questions: [string, string, string]): string[] {
  return questions.map((question) => question.trim());
}

async function syncPathSessionsCount(pathId: string): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;
  const { count, error: countError } = await client
    .from("pathSession")
    .select("id", { count: "exact", head: true })
    .eq("pathId", pathId);

  if (countError && !isSchemaUnavailable(countError)) throw countError;

  const sessionsCount = count ?? 0;
  const { error: updateError } = await client
    .from("path")
    .update({ sessionsCount })
    .eq("id", pathId);

  if (updateError && !isSchemaUnavailable(updateError)) throw updateError;
}

async function fetchQuestionsForSession(
  sessionId: string,
): Promise<AdminPathQuestionRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathQuestion")
    .select("id, index, questionText")
    .eq("sessionId", sessionId)
    .order("index", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      const question = row as PathquestionRow;
      if (!question.id) return null;
      return {
        questionId: question.id,
        index: toNumber(question.index) || 1,
        questionText: question.questionText?.trim() ?? "",
      };
    })
    .filter((item): item is AdminPathQuestionRecord => item !== null);
}

export async function fetchAdminPathSessions(
  pathId: string,
): Promise<AdminPathSessionRecord[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("pathSession")
    .select("id, pathId, index, title, coachingText, microCommitment")
    .eq("pathId", pathId)
    .order("index", { ascending: true });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];

  const sessions: AdminPathSessionRecord[] = [];
  for (const row of data) {
    const session = row as PathsessionRow;
    if (!session.id || !session.pathId) continue;
    const questions = await fetchQuestionsForSession(session.id);
    sessions.push({
      sessionId: session.id,
      pathId: session.pathId,
      index: toNumber(session.index) || sessions.length + 1,
      title: session.title?.trim() ?? "",
      coachingText: session.coachingText?.trim() ?? "",
      microCommitment: session.microCommitment?.trim() ?? "",
      questions,
    });
  }

  return sessions;
}

export function emptyAdminPathSessionForm(): AdminPathSessionFormState {
  return {
    title: "",
    coachingText: "",
    microCommitment: "",
    questions: ["", "", ""],
  };
}

export function adminPathSessionFormFromRecord(
  session: AdminPathSessionRecord,
): AdminPathSessionFormState {
  const questions: [string, string, string] = ["", "", ""];
  for (let index = 0; index < 3; index += 1) {
    questions[index] = session.questions[index]?.questionText ?? "";
  }

  return {
    title: session.title,
    coachingText: session.coachingText,
    microCommitment: session.microCommitment,
    questions,
  };
}

async function replaceSessionQuestions(
  sessionId: string,
  questions: string[],
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;

  const { error: deleteError } = await client
    .from("pathQuestion")
    .delete()
    .eq("sessionId", sessionId);

  if (deleteError && !isSchemaUnavailable(deleteError)) throw deleteError;

  for (let index = 0; index < questions.length; index += 1) {
    const questionText = questions[index]?.trim();
    if (!questionText) continue;

    const { error: insertError } = await client.from("pathQuestion").insert({
      id: crypto.randomUUID(),
      sessionId,
      index: index + 1,
      questionText,
    } as never);

    if (insertError && !isSchemaUnavailable(insertError)) throw insertError;
  }
}

export async function createAdminPathSession(
  pathId: string,
  form: AdminPathSessionFormState,
): Promise<AdminPathSessionRecord> {
  const title = form.title.trim();
  if (!title) throw new Error("Session title is required.");

  const client = supabase as unknown as UntypedSupabase;
  const { data: existingRows, error: readError } = await client
    .from("pathSession")
    .select("index")
    .eq("pathId", pathId);

  if (readError && !isSchemaUnavailable(readError)) throw readError;

  const nextIndex =
    Array.isArray(existingRows) && existingRows.length > 0
      ? Math.max(...existingRows.map((row) => toNumber((row as PathsessionRow).index))) + 1
      : 1;

  const sessionId = crypto.randomUUID();
  const { error: insertError } = await client.from("pathSession").insert({
    id: sessionId,
    pathId,
    index: nextIndex,
    title,
    coachingText: form.coachingText.trim(),
    microCommitment: form.microCommitment.trim(),
  } as never);

  if (insertError) throw insertError;

  await replaceSessionQuestions(sessionId, normalizeQuestions(form.questions));
  await syncPathSessionsCount(pathId);

  const sessions = await fetchAdminPathSessions(pathId);
  const created = sessions.find((session) => session.sessionId === sessionId);
  if (!created) throw new Error("Failed to create session.");
  return created;
}

export async function updateAdminPathSession(
  pathId: string,
  sessionId: string,
  form: AdminPathSessionFormState,
): Promise<AdminPathSessionRecord> {
  const title = form.title.trim();
  if (!title) throw new Error("Session title is required.");

  const client = supabase as unknown as UntypedSupabase;
  const { error: updateError } = await client
    .from("pathSession")
    .update({
      title,
      coachingText: form.coachingText.trim(),
      microCommitment: form.microCommitment.trim(),
    } as never)
    .eq("id", sessionId)
    .eq("pathId", pathId);

  if (updateError) throw updateError;

  await replaceSessionQuestions(sessionId, normalizeQuestions(form.questions));

  const sessions = await fetchAdminPathSessions(pathId);
  const updated = sessions.find((session) => session.sessionId === sessionId);
  if (!updated) throw new Error("Session not found.");
  return updated;
}

export async function deleteAdminPathSession(
  pathId: string,
  sessionId: string,
): Promise<void> {
  const client = supabase as unknown as UntypedSupabase;

  const { error: questionError } = await client
    .from("pathQuestion")
    .delete()
    .eq("sessionId", sessionId);

  if (questionError && !isSchemaUnavailable(questionError)) throw questionError;

  const { error: sessionError } = await client
    .from("pathSession")
    .delete()
    .eq("id", sessionId)
    .eq("pathId", pathId);

  if (sessionError) throw sessionError;

  await syncPathSessionsCount(pathId);
}
