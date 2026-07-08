/** Bubble custom event bTHxW — q1–q5 score aggregator; return value bTHxo */

export interface PillarQuestionScores {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
}

/**
 * Average of five question scores, rounded to one decimal.
 * Matches onboarding step components and Bubble bTHxW TerminateWorkflow return.
 */
export function computePillarScore({ q1, q2, q3, q4, q5 }: PillarQuestionScores): number {
  const scores = [q1, q2, q3, q4, q5];
  for (const score of scores) {
    if (typeof score !== "number" || Number.isNaN(score)) {
      throw new Error("Pillar score inputs must be numbers");
    }
  }
  return Math.round((scores.reduce((sum, value) => sum + value, 0) / 5) * 10) / 10;
}
