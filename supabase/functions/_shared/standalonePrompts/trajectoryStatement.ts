export type TrajectoryStatementInput = {
  classificationBefore: string;
  classificationAfter: string;
  stabilityBefore: string;
  stabilityAfter: string;
  stabilityChange: string;
  performanceBefore: string;
  performanceAfter: string;
  performanceChange: string;
  alignmentBefore: string;
  alignmentAfter: string;
  alignmentChange: string;
  coachingModeBefore: string;
  coachingModeAfter: string;
  pathsCompleted: string;
  activeFlags: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LOOKBACK_DAYS = 90;

function parseAssessmentDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

/** Inclusive reassessment window for paths_completed (Prompt 4). */
export function resolveTrajectoryPeriodBounds(
  previousAssessmentDate: string | null | undefined,
  currentAssessmentDate: string | null | undefined,
  nowMs: number = Date.now(),
): { startIso: string; endIso: string } {
  const end = parseAssessmentDate(currentAssessmentDate) ?? new Date(nowMs);
  const startFromPrevious = parseAssessmentDate(previousAssessmentDate);
  const start =
    startFromPrevious ?? new Date(end.getTime() - DEFAULT_LOOKBACK_DAYS * MS_PER_DAY);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Count completed enrollments whose updatedAt falls in [startIso, endIso]. */
export function countCompletedEnrollmentsInPeriod(
  rows: Array<{ status?: string | null; updatedAt?: string | null }>,
  startIso: string,
  endIso: string,
): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return rows.filter((row) => {
    if (row.status !== "completed") return false;
    const updated = typeof row.updatedAt === "string" ? Date.parse(row.updatedAt) : NaN;
    if (!Number.isFinite(updated)) return false;
    return updated >= start && updated <= end;
  }).length;
}

export function buildTrajectoryStatementPrompt(input: TrajectoryStatementInput): {
  system: string;
  prompt: string;
} {
  const system =
    "You are Kota — the AI coaching presence inside Uncloud360. A user has just completed their 90-day reassessment. You are generating their trajectory statement — a brief narrative of what their data shows about the last 90 days. Return only the trajectory statement text. No JSON. No title. No preamble. 2–3 sentences only.";

  const prompt = `REASSESSMENT DATA
Classification at start: ${input.classificationBefore}
Classification now: ${input.classificationAfter}
Stability: ${input.stabilityBefore} → ${input.stabilityAfter} (${input.stabilityChange})
Performance: ${input.performanceBefore} → ${input.performanceAfter} (${input.performanceChange})
Alignment: ${input.alignmentBefore} → ${input.alignmentAfter} (${input.alignmentChange})
Coaching mode at start: ${input.coachingModeBefore}
Coaching mode now: ${input.coachingModeAfter}
Paths completed this period: ${input.pathsCompleted}
Active flags: ${input.activeFlags}

WHAT YOU ARE GENERATING
A trajectory statement of 2–3 sentences. Plain language. Honest. The statement should:
— Name the most significant movement in the data (the dimension that changed most)
— Name what that movement reflects — what it likely means in real terms for this person
— If the classification changed, acknowledge the transition specifically
— If scores declined in any dimension, name that honestly without alarm
— End with a forward-facing observation about what the next 90 days should focus on

WHAT IT IS NOT
Not celebratory unless the movement genuinely warrants it. Not generic ("you've made great progress"). Specific to this user's actual data. Not a list of all three scores. A narrative that makes the data human.

EXAMPLES OF GOOD TRAJECTORY STATEMENTS
"Over the last 90 days your Stability has strengthened significantly — moving from [x] to [y]. That shift is reflected in your classification moving from [before] to [after], which means the foundation is more solid than when you started. The next 90 days belong to [lowest dimension] — that's where the real work is now."
"Your Performance and Alignment scores held steady this period while Stability declined slightly. That pattern is consistent with someone who has been navigating a significant load — the fact that execution didn't fall apart is the real data point here. Recovery and stabilization remain the focus."`;

  return { system, prompt };
}
