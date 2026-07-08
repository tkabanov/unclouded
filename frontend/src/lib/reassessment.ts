import type { ResultsData } from "./classification";

// 4 optional progress reflection questions.
// These are NOT scored. They feed the AI context block and the PDF report.
export interface ReflectionQuestion {
  field: string;
  question: string;
  placeholder: string;
}

export const reflectionQuestions: ReflectionQuestion[] = [
  {
    field: "whats_different",
    question: "Looking back over the last 90 days, what feels genuinely different now?",
    placeholder: "e.g. I'm sleeping better and I react less to small setbacks…",
  },
  {
    field: "proud_of",
    question: "What's one change or win you're proud of?",
    placeholder: "e.g. I finally set a boundary at work and it held…",
  },
  {
    field: "still_hard",
    question: "What still feels hard or unresolved?",
    placeholder: "e.g. Evenings still feel heavy and I struggle to wind down…",
  },
  {
    field: "focus_next",
    question: "What would you like your coach to focus on for the next season?",
    placeholder: "e.g. Building a consistent morning routine and follow-through…",
  },
];

export type ReflectionAnswers = Record<string, string>;

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
  const deltas = computeScoreDeltas(first, second);
  const improved = deltas.filter((d) => d.delta >= 0.2).length;
  const declined = deltas.filter((d) => d.delta <= -0.2).length;
  const steady = deltas.length - improved - declined;
  const overallDelta =
    Math.round((deltas.reduce((sum, d) => sum + d.delta, 0) / deltas.length) * 10) / 10;
  const classificationChanged =
    first.classification.key !== second.classification.key;

  const name = firstName || "there";
  let headline: string;
  if (overallDelta >= 0.3) {
    headline = `You've made real progress, ${name}. Most dimensions moved in the right direction over the last 90 days.`;
  } else if (overallDelta <= -0.3) {
    headline = `The last 90 days have been heavier, ${name}. Some dimensions have slipped — this is useful information, not a failure.`;
  } else {
    headline = `You've held steady over the last 90 days, ${name}. Stability like this is often where lasting change starts.`;
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

export function isReassessmentDue(onboardingCompletedAt: string | null): boolean {
  if (!onboardingCompletedAt) return false;
  const completed = new Date(onboardingCompletedAt).getTime();
  if (Number.isNaN(completed)) return false;
  return Date.now() - completed >= NINETY_DAYS_MS;
}

export function daysUntilReassessment(onboardingCompletedAt: string | null): number {
  if (!onboardingCompletedAt) return 90;
  const completed = new Date(onboardingCompletedAt).getTime();
  if (Number.isNaN(completed)) return 90;
  const remaining = NINETY_DAYS_MS - (Date.now() - completed);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
