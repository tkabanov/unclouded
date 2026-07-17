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
  /** FINAL Layer 4 */
  BUILDER: "builder",
  /** FINAL Layer 4 */
  OPTIMIZER: "optimizer",
  /**
   * Legacy Bubble slug — maps to builder for backward compatibility.
   * Prefer BUILDER / OPTIMIZER for new code.
   */
  STRATEGIST: "builder",
} as const;

export type AiCoachingModeSlug = (typeof AI_COACHING_MODE)[keyof typeof AI_COACHING_MODE];

/** Display strings from drsam-99657.bubble → ai_coaching_mode_os (+ FINAL builder/optimizer). */
export const AI_COACHING_MODE_LABELS: Record<AiCoachingModeSlug, string> = {
  protector: "protector", // bTIEC
  stabilizer: "stabilizer", // bTIEG
  simplifier: "simplifier", // bTIEH
  rebuilder: "rebuilder", // bTIEI
  builder: "builder",
  optimizer: "optimizer",
};

/** Chat header badge from system-assigned coaching mode. */
export function formatChatModeBadgeText(mode: AiCoachingModeSlug | null): string {
  if (!mode) return "Professional • Executive Coaching";
  const label = AI_COACHING_MODE_LABELS[mode] ?? mode;
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  return `${title} • Executive Coaching`;
}

export const AI_COACHING_MODE_ORDER: readonly AiCoachingModeSlug[] = [
  AI_COACHING_MODE.PROTECTOR,
  AI_COACHING_MODE.STABILIZER,
  AI_COACHING_MODE.SIMPLIFIER,
  AI_COACHING_MODE.REBUILDER,
  AI_COACHING_MODE.BUILDER,
  AI_COACHING_MODE.OPTIMIZER,
];

/** Bubble option set: ai_confidence_level_os (AI Confidence Level OS) */

export const AI_CONFIDENCE_LEVEL_OPTION_SET_ID = "ai_confidence_level_os" as const;

export const AI_CONFIDENCE_LEVEL = {
  /** bTIFK */
  EXPLORATORY: "exploratory",
  /** bTIFO — legacy; mapped to guided in prompt assembly */
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

/** Bubble ai_confidence_level_os range_contains_point bounds (bTIFK–bTIFQ). */
export const AI_CONFIDENCE_LEVEL_RANGES: readonly {
  slug: AiConfidenceLevelSlug;
  min: number;
  max: number;
}[] = [
  { slug: AI_CONFIDENCE_LEVEL.EXPLORATORY, min: 0, max: 0 }, // bTIFK
  { slug: AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS, min: 1, max: 2 }, // bTIFO
  { slug: AI_CONFIDENCE_LEVEL.GUIDED, min: 3, max: 4 }, // bTIFP
  { slug: AI_CONFIDENCE_LEVEL.DIRECT, min: 5, max: 6 }, // bTIFQ
];
