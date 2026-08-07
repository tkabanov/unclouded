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
Not celebratory unless the movement genuinely warrants it. Not generic ("you've made great progress"). Specific to this user's actual data. Not a list of all three scores. A narrative that makes the data human.`;

  return { system, prompt };
}
