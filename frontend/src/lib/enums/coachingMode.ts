/** Bubble option set: ai_coaching_mode_os (AI Coaching Mode OS) */

export const AI_COACHING_MODE_OPTION_SET_ID = "ai_coaching_mode_os" as const;

export const AI_COACHING_MODE = {
  /** bTIEC */
  PROTECTOR: "protector",
  /** bTIEG */
  STABILIZER: "stabilizer",
  /** bTIEH */
  SIMPLIFIER: "simplifier",
  /** bTIEI */
  REBUILDER: "rebuilder",
  /** bTIEM */
  STRATEGIST: "strategist",
} as const;

export type AiCoachingModeSlug = (typeof AI_COACHING_MODE)[keyof typeof AI_COACHING_MODE];

/** Display strings from drsam-99657.bubble → ai_coaching_mode_os */
export const AI_COACHING_MODE_LABELS: Record<AiCoachingModeSlug, string> = {
  protector: "protector", // bTIEC
  stabilizer: "stabilizer", // bTIEG
  simplifier: "simplifier", // bTIEH
  rebuilder: "rebuilder", // bTIEI
  strategist: "strategist", // bTIEM
};

export const AI_COACHING_MODE_ORDER: readonly AiCoachingModeSlug[] = [
  AI_COACHING_MODE.PROTECTOR,
  AI_COACHING_MODE.STABILIZER,
  AI_COACHING_MODE.SIMPLIFIER,
  AI_COACHING_MODE.REBUILDER,
  AI_COACHING_MODE.STRATEGIST,
];

/** Bubble option set: ai_confidence_level_os (AI Confidence Level OS) */

export const AI_CONFIDENCE_LEVEL_OPTION_SET_ID = "ai_confidence_level_os" as const;

export const AI_CONFIDENCE_LEVEL = {
  /** bTIFK */
  EXPLORATORY: "exploratory",
  /** bTIFO */
  EXPLORATORY_PLUS: "exploratory_",
  /** bTIFP */
  GUIDED: "guided",
  /** bTIFQ */
  DIRECT: "direct",
} as const;

export type AiConfidenceLevelSlug =
  (typeof AI_CONFIDENCE_LEVEL)[keyof typeof AI_CONFIDENCE_LEVEL];

/** Display strings from drsam-99657.bubble → ai_confidence_level_os */
export const AI_CONFIDENCE_LEVEL_LABELS: Record<AiConfidenceLevelSlug, string> = {
  exploratory: "exploratory", // bTIFK
  exploratory_: "exploratory+", // bTIFO
  guided: "guided", // bTIFP
  direct: "direct", // bTIFQ
};

export const AI_CONFIDENCE_LEVEL_ORDER: readonly AiConfidenceLevelSlug[] = [
  AI_CONFIDENCE_LEVEL.EXPLORATORY,
  AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS,
  AI_CONFIDENCE_LEVEL.GUIDED,
  AI_CONFIDENCE_LEVEL.DIRECT,
];
