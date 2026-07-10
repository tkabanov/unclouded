import { supabase } from "@/integrations/supabase/client";
import type { PillarQuestionScores } from "./aggregatePillarScore";

export type QuestionFieldPrefix = "sq" | "aq" | "pq";

const NESTED_SCORES_KEY: Record<QuestionFieldPrefix, string> = {
  sq: "stabilityScores",
  aq: "alignmentScores",
  pq: "performanceScores",
};

/** Bubble user fields: sq1_number … pq5_number (UDS user type). */
export function readQuestionScores(
  onboardingData: Record<string, unknown>,
  prefix: QuestionFieldPrefix,
): PillarQuestionScores {
  const nestedKey = NESTED_SCORES_KEY[prefix];
  const nested = onboardingData[nestedKey];
  const nestedObj =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : null;

  const readOne = (index: number): number => {
    const field = `${prefix}${index}`;
    const bubbleField = `${field}_number`;
    const raw =
      onboardingData[bubbleField] ??
      nestedObj?.[field] ??
      nestedObj?.[bubbleField];
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) return parsed;
    }
    throw new Error(`Missing onboarding answer ${field}`);
  };

  return {
    q1: readOne(1),
    q2: readOne(2),
    q3: readOne(3),
    q4: readOne(4),
    q5: readOne(5),
  };
}

export async function loadOnboardingData(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (
    !data?.onboardingData ||
    typeof data.onboardingData !== "object" ||
    Array.isArray(data.onboardingData)
  ) {
    throw new Error("Profile onboardingData is missing");
  }

  return data.onboardingData as Record<string, unknown>;
}

export const STABILITY_SCORE_NUMBER_FIELD = "stabilityScore" as const;
export const ALIGNMENT_SCORE_NUMBER_FIELD = "alignmentScore" as const;
export const PERFORMANCE_SCORE_NUMBER_FIELD = "performanceScore" as const;

const RESULTS_KEY_BY_SCORE_FIELD = {
  [STABILITY_SCORE_NUMBER_FIELD]: "stability_score",
  [ALIGNMENT_SCORE_NUMBER_FIELD]: "alignment_score",
  [PERFORMANCE_SCORE_NUMBER_FIELD]: "performance_score",
} as const;

export type PillarScoreNumberField = keyof typeof RESULTS_KEY_BY_SCORE_FIELD;

export async function patchPillarScoreNumber(
  userId: string,
  scoreField: PillarScoreNumberField,
  score: number,
): Promise<void> {
  const { data, error: loadError } = await supabase
    .from("profiles")
    .select("onboardingData, results")
    .eq("id", userId)
    .single();

  if (loadError) throw loadError;

  const existingOnboarding =
    data?.onboardingData &&
    typeof data.onboardingData === "object" &&
    !Array.isArray(data.onboardingData)
      ? (data.onboardingData as Record<string, unknown>)
      : {};

  const resultsKey = RESULTS_KEY_BY_SCORE_FIELD[scoreField];
  const existingResults =
    data?.results && typeof data.results === "object" && !Array.isArray(data.results)
      ? (data.results as Record<string, unknown>)
      : null;

  const updates: Record<string, unknown> = {
    [scoreField]: score,
    onboardingData: {
      ...existingOnboarding,
      [scoreField]: score,
    },
  };

  if (existingResults) {
    updates.results = { ...existingResults, [resultsKey]: score };
  }

  const { error } = await supabase.from("profiles").update(updates as never).eq("id", userId);
  if (error) throw error;
}
