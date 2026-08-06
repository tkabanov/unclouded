import type { ResultsData } from "./classification";

// 4 optional progress reflection questions (Reassessment Questions Part 2 §3).
// These are NOT scored. They feed the AI context block and the PDF report.
export interface ReflectionQuestion {
  field: string;
  question: string;
  placeholder: string;
}

export const reflectionQuestions: ReflectionQuestion[] = [
  {
    field: "reflection_q1",
    question:
      "Looking back at the past 90 days, what has shifted most in how you show up — even if the change is small?",
    placeholder: "e.g. I pause before reacting, and I notice stress earlier…",
  },
  {
    field: "reflection_q2",
    question:
      "What has been the hardest part of this period, and what does that tell you about what you most need right now?",
    placeholder: "e.g. Evenings still feel heavy — I need more recovery, not more effort…",
  },
  {
    field: "reflection_q3",
    question:
      "What are you most ready to let go of, change, or move past as you head into the next 90 days?",
    placeholder: "e.g. The habit of saying yes when I mean no…",
  },
  {
    field: "reflection_q4",
    question:
      "If you could name one thing that would make the next 90 days meaningfully different from the last 90, what would it be?",
    placeholder: "e.g. Protecting one non-negotiable morning routine…",
  },
];

/** Lovable prototype field aliases (legacy demo / import paths). */
export const LEGACY_REFLECTION_FIELD_ALIASES: Record<string, string> = {
  whats_different: "reflection_q1",
  still_hard: "reflection_q2",
  proud_of: "reflection_q3",
  focus_next: "reflection_q4",
};

export function readReflectionAnswer(
  reflections: ReflectionAnswers | null | undefined,
  field: string,
): string {
  const direct = reflections?.[field]?.trim();
  if (direct) return direct;
  for (const [legacyField, mappedField] of Object.entries(LEGACY_REFLECTION_FIELD_ALIASES)) {
    if (mappedField === field) {
      const legacy = reflections?.[legacyField]?.trim();
      if (legacy) return legacy;
    }
  }
  return "";
}

export type ReflectionAnswers = Record<string, string>;

/**
 * Index of the reflection slot replaced by a path-adaptive variant
 * (Reassessment Questions Part 2 — Question 4).
 */
export const PATH_ADAPTIVE_QUESTION_SLOT = 3;

/** Standard reflection bank with Question 4 overridden when a path-adaptive prompt exists. */
export function reflectionQuestionsWithAdaptive(
  pathAdaptiveQ?: string | null,
): ReflectionQuestion[] {
  const adaptive = pathAdaptiveQ?.trim();
  if (!adaptive) return reflectionQuestions;
  return reflectionQuestions.map((q, i) =>
    i === PATH_ADAPTIVE_QUESTION_SLOT ? { ...q, question: adaptive } : q,
  );
}

// One score dimension compared across the two assessments.
export interface ScoreDelta {
  key: string;
  label: string;
  first: number;
  second: number;
  delta: number;
}

const DIMENSIONS: { key: keyof ResultsData; label: string }[] = [
  { key: "stability_score", label: "Stability" },
  { key: "performance_score", label: "Performance" },
  { key: "alignment_score", label: "Alignment" },
  { key: "orientation_score", label: "Orientation" },
];

export function computeScoreDeltas(first: ResultsData, second: ResultsData): ScoreDelta[] {
  return DIMENSIONS.map(({ key, label }) => {
    const a = (first[key] as number) ?? 0;
    const b = (second[key] as number) ?? 0;
    return {
      key: String(key),
      label,
      first: a,
      second: b,
      delta: Math.round((b - a) * 10) / 10,
    };
  });
}

export interface ProgressSummary {
  overallDelta: number;
  improved: number;
  declined: number;
  steady: number;
  classificationChanged: boolean;
  headline: string;
}

export function summarizeProgress(
  first: ResultsData,
  second: ResultsData,
  firstName: string
): ProgressSummary {
  const deltas = computeScoreDeltas(first, second).filter((d) =>
    ["stability_score", "performance_score", "alignment_score"].includes(d.key),
  );
  const improved = deltas.filter((d) => d.delta >= 0.2).length;
  const declined = deltas.filter((d) => d.delta <= -0.2).length;
  const steady = deltas.length - improved - declined;
  const overallDelta =
    Math.round((deltas.reduce((sum, d) => sum + d.delta, 0) / Math.max(deltas.length, 1)) * 10) /
    10;
  const classificationChanged = first.classification.key !== second.classification.key;

  const name = firstName || "there";
  let headline: string;
  if (overallDelta >= 0.3) {
    headline = `You've made real progress, ${name}. Most dimensions moved in the right direction over the last 90 days.`;
  } else if (overallDelta <= -0.3) {
    headline = `Hard seasons show up in data. This is information, not failure, ${name}.`;
  } else {
    headline = `Holding steady is not nothing, ${name}. Stability like this is often where lasting change starts.`;
  }

  return {
    overallDelta,
    improved,
    declined,
    steady,
    classificationChanged,
    headline,
  };
}

// Roughly 90 days in milliseconds.
export const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** @deprecated Prefer reassessmentEntitlements.isReassessmentDue with date context. */
export function isReassessmentDue(onboardingCompletedAt: string | null): boolean {
  if (!onboardingCompletedAt) return false;
  const completed = new Date(onboardingCompletedAt).getTime();
  if (Number.isNaN(completed)) return false;
  return Date.now() - completed >= NINETY_DAYS_MS;
}

/** @deprecated Prefer reassessmentEntitlements.daysUntilReassessmentDue. */
export function daysUntilReassessment(onboardingCompletedAt: string | null): number {
  if (!onboardingCompletedAt) return 90;
  const completed = new Date(onboardingCompletedAt).getTime();
  if (Number.isNaN(completed)) return 90;
  const remaining = NINETY_DAYS_MS - (Date.now() - completed);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export {
  canAccessReassessment,
  canShowReassessNow,
  isReassessmentDue as isReassessmentDueForTier,
  daysUntilReassessmentDue,
} from "./reassessment/reassessmentEntitlements";
