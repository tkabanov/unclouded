import { supabase } from "@/integrations/supabase/client";
import type { ResultsData } from "@/lib/classification";
import type { ReflectionAnswers } from "@/lib/reassessment";
import type { TrajectoryType } from "@/lib/reassessment/trajectory";
import { isSchemaUnavailable } from "@/lib/supabase/schemaFallback";

export interface AssessmentResultRow {
  id: string;
  userId: string;
  assessmentDate: string;
  stabilityScore: number | null;
  performanceScore: number | null;
  alignmentScore: number | null;
  orientationScore: number | null;
  classification: string | null;
  trajectoryType: string | null;
  isInitial: boolean;
  reflectionQ1: string | null;
  reflectionQ2: string | null;
  reflectionQ3: string | null;
  reflectionQ4: string | null;
  pathAdaptiveQ: string | null;
  pathAdaptiveAnswer: string | null;
  pdfGenerated: boolean;
  pdfUrl: string | null;
  pdfNarrative: Record<string, unknown> | null;
  rawResults: ResultsData | null;
  rawScores: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertAssessmentResultInput {
  userId: string;
  results: ResultsData;
  isInitial: boolean;
  assessmentDate?: string;
  trajectoryType?: TrajectoryType | null;
  reflections?: ReflectionAnswers | null;
  pathAdaptiveQ?: string | null;
  pathAdaptiveAnswer?: string | null;
  rawScores?: Record<string, unknown> | null;
  pdfGenerated?: boolean;
}

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function mapRow(row: Record<string, unknown>): AssessmentResultRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    assessmentDate: String(row.assessmentDate),
    stabilityScore: typeof row.stabilityScore === "number" ? row.stabilityScore : null,
    performanceScore: typeof row.performanceScore === "number" ? row.performanceScore : null,
    alignmentScore: typeof row.alignmentScore === "number" ? row.alignmentScore : null,
    orientationScore: typeof row.orientationScore === "number" ? row.orientationScore : null,
    classification: typeof row.classification === "string" ? row.classification : null,
    trajectoryType: typeof row.trajectoryType === "string" ? row.trajectoryType : null,
    isInitial: row.isInitial === true,
    reflectionQ1: typeof row.reflectionQ1 === "string" ? row.reflectionQ1 : null,
    reflectionQ2: typeof row.reflectionQ2 === "string" ? row.reflectionQ2 : null,
    reflectionQ3: typeof row.reflectionQ3 === "string" ? row.reflectionQ3 : null,
    reflectionQ4: typeof row.reflectionQ4 === "string" ? row.reflectionQ4 : null,
    pathAdaptiveQ: typeof row.pathAdaptiveQ === "string" ? row.pathAdaptiveQ : null,
    pathAdaptiveAnswer:
      typeof row.pathAdaptiveAnswer === "string" ? row.pathAdaptiveAnswer : null,
    pdfGenerated: row.pdfGenerated === true,
    pdfUrl: typeof row.pdfUrl === "string" ? row.pdfUrl : null,
    pdfNarrative:
      row.pdfNarrative && typeof row.pdfNarrative === "object"
        ? (row.pdfNarrative as Record<string, unknown>)
        : null,
    rawResults: (row.rawResults as ResultsData | null) ?? null,
    rawScores: (row.rawScores as Record<string, unknown> | null) ?? null,
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

function reflectionsToColumns(reflections?: ReflectionAnswers | null) {
  if (!reflections) {
    return {
      reflectionQ1: null as string | null,
      reflectionQ2: null as string | null,
      reflectionQ3: null as string | null,
      reflectionQ4: null as string | null,
    };
  }
  return {
    reflectionQ1: (reflections.reflection_q1 ?? "").trim() || null,
    reflectionQ2: (reflections.reflection_q2 ?? "").trim() || null,
    reflectionQ3: (reflections.reflection_q3 ?? "").trim() || null,
    reflectionQ4: (reflections.reflection_q4 ?? "").trim() || null,
  };
}

export async function listAssessmentResults(userId: string): Promise<AssessmentResultRow[]> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("assessmentResult")
    .select("*")
    .eq("userId", userId)
    .order("assessmentDate", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  if (!Array.isArray(data)) return [];
  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function getLatestAssessmentResult(
  userId: string,
): Promise<AssessmentResultRow | null> {
  const rows = await listAssessmentResults(userId);
  return rows[0] ?? null;
}

/**
 * Baseline for the next reassessment: the most recent completed assessment.
 * Call at flow start (before inserting the new row).
 */
export async function getPriorAssessmentResult(
  userId: string,
): Promise<AssessmentResultRow | null> {
  return getLatestAssessmentResult(userId);
}

export async function insertAssessmentResult(
  input: InsertAssessmentResultInput,
): Promise<AssessmentResultRow> {
  const assessmentDate = input.assessmentDate ?? new Date().toISOString();
  const reflectionCols = reflectionsToColumns(input.reflections);

  const payload = {
    id: crypto.randomUUID(),
    userId: input.userId,
    assessmentDate,
    stabilityScore: input.results.stability_score,
    performanceScore: input.results.performance_score,
    alignmentScore: input.results.alignment_score,
    orientationScore: input.results.orientation_score,
    classification: input.results.classification.name,
    trajectoryType: input.isInitial ? null : (input.trajectoryType ?? null),
    isInitial: input.isInitial,
    ...reflectionCols,
    pathAdaptiveQ: input.pathAdaptiveQ?.trim() || null,
    pathAdaptiveAnswer: input.pathAdaptiveAnswer?.trim() || null,
    pdfGenerated: input.pdfGenerated ?? false,
    rawResults: input.results as unknown as never,
    rawScores: (input.rawScores ?? null) as unknown as never,
  };

  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("assessmentResult")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) throw error;
  return mapRow(data as Record<string, unknown>);
}

/** Latest non-initial reassessment (for PDF download on dashboard). */
export async function getLatestReassessmentResult(
  userId: string,
): Promise<AssessmentResultRow | null> {
  const rows = await listAssessmentResults(userId);
  return rows.find((row) => !row.isInitial) ?? null;
}

/** Day-0 baseline from assessment history (initial onboarding row). */
export async function getInitialAssessmentResult(
  userId: string,
): Promise<AssessmentResultRow | null> {
  const rows = await listAssessmentResults(userId);
  return rows.find((row) => row.isInitial) ?? null;
}

/** Admin: list distinct users who have assessment history (US-504). */
export async function listUsersWithAssessmentHistory(): Promise<
  Array<{ userId: string; firstName: string | null; email: string | null; count: number }>
> {
  const client = supabase as unknown as UntypedSupabase;
  const { data, error } = await client
    .from("assessmentResult")
    .select("userId")
    .order("assessmentDate", { ascending: false });

  if (error) {
    if (isSchemaUnavailable(error)) return [];
    throw error;
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const userId = (row as { userId?: string }).userId;
    if (!userId) continue;
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }

  const userIds = [...counts.keys()];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, firstName, email")
    .in("id", userIds);

  if (profileError) {
    if (isSchemaUnavailable(profileError)) {
      return userIds.map((userId) => ({
        userId,
        firstName: null,
        email: null,
        count: counts.get(userId) ?? 0,
      }));
    }
    throw profileError;
  }

  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { firstName: p.firstName ?? null, email: p.email ?? null },
    ]),
  );

  return userIds.map((userId) => ({
    userId,
    firstName: byId.get(userId)?.firstName ?? null,
    email: byId.get(userId)?.email ?? null,
    count: counts.get(userId) ?? 0,
  }));
}
