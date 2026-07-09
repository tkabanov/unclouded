/** Bubble custom event bTICa — pressure_response + non_followthrough → fingerprint text (bTICV). */

const VARIABLE_PRESSURE_RESPONSE = "variable";

const SITUATIONALLY_ADAPTIVE =
  "Situationally Adaptive — no dominant pattern, context-dependent";

const BEHAVIORAL_FINGERPRINT_LOOKUP: Record<string, Record<string, string>> = {
  avoid: {
    waiting: "Avoidant / Conditional — delays until conditions feel perfect",
    overwhelm: "Avoidant / Shutdown — withdraws when load exceeds capacity",
    wrong_goal: "Avoidant / Misaligned — avoids because goal isn't actually right",
  },
  overthink: {
    motivation: "Analytical / Motivation Gap — insight-rich, execution-poor",
    wrong_goal: "Analytical / Direction Seeker — overthinks because goal feels unclear",
    overwhelm: "Analytical / Paralyzed — analysis loops when overwhelmed",
  },
  push_through: {
    motivation: "Driver / Depletion Risk — pushes until fuel runs out",
    overwhelm: "Driver / Capacity Ceiling — high output until wall hits",
    distraction: "Driver / Scattered — effortful but not focused",
  },
  seek_help: {
    distraction: "Collaborative / Diffuse Focus — support-dependent, easily redirected",
    wrong_goal: "Collaborative / Direction Seeker — uses others to find right path",
    motivation: "Collaborative / Sustain Gap — needs external energy to maintain",
  },
};

export function resolveBehavioralFingerprint(
  pressureResponse: string,
  nonFollowthroughReason: string,
): string {
  if (pressureResponse === VARIABLE_PRESSURE_RESPONSE) {
    return SITUATIONALLY_ADAPTIVE;
  }

  return BEHAVIORAL_FINGERPRINT_LOOKUP[pressureResponse]?.[nonFollowthroughReason] ?? "";
}
