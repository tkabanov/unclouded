import {
  classifications,
  computeClassification,
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

export interface ClassificationScoreInput {
  performance_score: number;
  stability_score: number;
  alignment_score: number;
  orientation_score: number;
  /** Required for Capacity Erosion (System Overload) branch — same as Step 12. */
  pressure_profile?: string;
}

export interface ClassificationResolution {
  classification: ClassificationType;
  classification_os: ClassificationOsSlug;
}

/**
 * Persist/pipeline classification — same rules as Step 12 `computeClassification`
 * (OVR-041; replaces Bubble bTHzg thresholds such as performance >= 4 for High Output).
 */
export function resolveClassification(
  input: ClassificationScoreInput,
): ClassificationResolution {
  const classification = computeClassification(
    input.stability_score,
    input.performance_score,
    input.alignment_score,
    input.pressure_profile ?? "",
  );
  const classification_os =
    CLASSIFICATION_OS_BY_KEY[classification.key] ?? CLASSIFICATION_OS.BUILDING_MOMENTUM;

  return {
    classification: classifications[classification.key] ?? classification,
    classification_os,
  };
}
