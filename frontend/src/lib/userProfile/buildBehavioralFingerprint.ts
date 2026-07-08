/** Bubble custom event bTICa — pressure response + non-followthrough → fingerprint text. */

const PRESSURE_LABELS: Record<string, string> = {
  avoid: "Avoidant under pressure",
  overthink: "Analytical delay pattern",
  push_through: "Push-through responder",
  seek_help: "Support-seeking responder",
  variable: "Context-dependent responder",
};

const FOLLOWTHROUGH_LABELS: Record<string, string> = {
  motivation: "Motivation drop-off",
  overwhelm: "Overwhelm shutdown",
  distraction: "Attention drift",
  wrong_goal: "Goal misalignment",
  waiting: "Readiness waiting pattern",
};

export function resolveBehavioralFingerprint(
  pressureResponse: string,
  nonFollowthroughReason: string,
): string {
  const pressure = PRESSURE_LABELS[pressureResponse] ?? "Mixed pressure response";
  const followthrough = FOLLOWTHROUGH_LABELS[nonFollowthroughReason] ?? "Variable follow-through";
  return `${pressure}; ${followthrough}`;
}
