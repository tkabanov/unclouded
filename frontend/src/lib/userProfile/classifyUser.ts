import {
  classifications,
  type ClassificationType,
} from "@/lib/classification";

/** Bubble classification_os value ids (bTHyq … bTHyy). */
export const CLASSIFICATION_OS = {
  CAPACITY_EROSION: "bTHyq",
  PERFORMANCE_STAGNATION: "bTHyr",
  ALIGNMENT_FRACTURE: "bTHys",
  HIGH_OUTPUT_HIDDEN_INSTABILITY: "bTHym",
  OPTIMIZATION_READY: "bTHyw",
  COMFORTABLE_PLATEAU: "bTHyx",
  BUILDING_MOMENTUM: "bTHyy",
} as const;

export type ClassificationOsSlug =
  (typeof CLASSIFICATION_OS)[keyof typeof CLASSIFICATION_OS];

export const CLASSIFICATION_OS_BY_KEY: Record<string, ClassificationOsSlug> = {
  capacity_erosion: CLASSIFICATION_OS.CAPACITY_EROSION,
  performance_stagnation: CLASSIFICATION_OS.PERFORMANCE_STAGNATION,
  alignment_fracture: CLASSIFICATION_OS.ALIGNMENT_FRACTURE,
  high_output_hidden_instability: CLASSIFICATION_OS.HIGH_OUTPUT_HIDDEN_INSTABILITY,
  optimization_ready: CLASSIFICATION_OS.OPTIMIZATION_READY,
  comfortable_plateau: CLASSIFICATION_OS.COMFORTABLE_PLATEAU,
  building_momentum: CLASSIFICATION_OS.BUILDING_MOMENTUM,
};

const CLASSIFICATION_KEY_BY_OS: Record<ClassificationOsSlug, string> = {
  [CLASSIFICATION_OS.CAPACITY_EROSION]: "capacity_erosion",
  [CLASSIFICATION_OS.PERFORMANCE_STAGNATION]: "performance_stagnation",
  [CLASSIFICATION_OS.ALIGNMENT_FRACTURE]: "alignment_fracture",
  [CLASSIFICATION_OS.HIGH_OUTPUT_HIDDEN_INSTABILITY]: "high_output_hidden_instability",
  [CLASSIFICATION_OS.OPTIMIZATION_READY]: "optimization_ready",
  [CLASSIFICATION_OS.COMFORTABLE_PLATEAU]: "comfortable_plateau",
  [CLASSIFICATION_OS.BUILDING_MOMENTUM]: "building_momentum",
};

export interface ClassificationScoreInput {
  performance_score: number;
  stability_score: number;
  alignment_score: number;
  orientation_score: number;
}

export interface ClassificationResolution {
  classification: ClassificationType;
  classification_os: ClassificationOsSlug;
}

/**
 * Bubble custom event bTHzg (/api/bTHzi) — ordered TerminateWorkflow branches.
 * Mirrors actions bTHzu → bTHzz → bTIAE → bTIAG → bTIAL → bTIAQ → bTIAS.
 */
function resolveClassificationOs(input: ClassificationScoreInput): ClassificationOsSlug {
  const performance = input.performance_score;
  const stability = input.stability_score;
  const alignment = input.alignment_score;
  const orientation = input.orientation_score;

  // bTHzu: performance >= 4 && stability < 3.2
  if (performance >= 4 && stability < 3.2) {
    return CLASSIFICATION_OS.HIGH_OUTPUT_HIDDEN_INSTABILITY;
  }
  // bTHzz: stability < 3.2
  if (stability < 3.2) {
    return CLASSIFICATION_OS.CAPACITY_EROSION;
  }
  // bTIAE: performance < 3.2
  if (performance < 3.2) {
    return CLASSIFICATION_OS.PERFORMANCE_STAGNATION;
  }
  // bTIAG: alignment < 3.2
  if (alignment < 3.2) {
    return CLASSIFICATION_OS.ALIGNMENT_FRACTURE;
  }
  // bTIAL: performance >= 3.8 && stability >= 3.8 && alignment >= 3.8
  if (performance >= 3.8 && stability >= 3.8 && alignment >= 3.8) {
    return CLASSIFICATION_OS.OPTIMIZATION_READY;
  }
  // bTIAQ: performance/stability/alignment in [3, 3.5] and orientation <= 3
  if (
    performance >= 3 &&
    stability >= 3 &&
    alignment >= 3 &&
    performance <= 3.5 &&
    stability <= 3.5 &&
    alignment <= 3.5 &&
    orientation <= 3
  ) {
    return CLASSIFICATION_OS.COMFORTABLE_PLATEAU;
  }
  // bTIAS: default
  return CLASSIFICATION_OS.BUILDING_MOMENTUM;
}

/** Bubble custom event bTHzg — pillar scores → classification_os branch. */
export function resolveClassification(
  input: ClassificationScoreInput,
): ClassificationResolution {
  const classification_os = resolveClassificationOs(input);
  const key = CLASSIFICATION_KEY_BY_OS[classification_os];
  const classification = classifications[key] ?? classifications.building_momentum;

  return { classification, classification_os };
}
