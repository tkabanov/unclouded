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

export interface ClassificationScoreInput {
  performance_score: number;
  stability_score: number;
  alignment_score: number;
  orientation_score: number;
  pressure_profile?: string;
}

export interface ClassificationResolution {
  classification: ClassificationType;
  classification_os: ClassificationOsSlug;
}

function resolveClassificationType(
  stability: number,
  performance: number,
  alignment: number,
  pressureProfile: string,
): ClassificationType {
  if (stability < 3.0 && pressureProfile === "System Overload") {
    return classifications.capacity_erosion;
  }
  if (stability < 3.2 && performance >= 3.5) {
    return classifications.high_output_hidden_instability;
  }
  if (alignment < 3.0 && performance >= 3.0) {
    return classifications.alignment_fracture;
  }
  if (performance < 3.0 && stability >= 3.0) {
    return classifications.performance_stagnation;
  }
  if (stability >= 3.8 && performance >= 3.8 && alignment >= 3.8) {
    return classifications.optimization_ready;
  }
  if (stability >= 3.5 && performance >= 3.5 && alignment >= 3.5) {
    return classifications.building_momentum;
  }
  if (stability >= 3.2 && performance >= 3.0 && alignment >= 3.0) {
    return classifications.comfortable_plateau;
  }
  if (stability < performance) return classifications.high_output_hidden_instability;
  if (alignment < stability) return classifications.alignment_fracture;
  return classifications.capacity_erosion;
}

/** Bubble custom event bTHzg — pillar scores → classification_os branch. */
export function resolveClassification(
  input: ClassificationScoreInput,
): ClassificationResolution {
  const pressureProfile = input.pressure_profile ?? "Moderate Load";
  const classification = resolveClassificationType(
    input.stability_score,
    input.performance_score,
    input.alignment_score,
    pressureProfile,
  );

  const classification_os =
    CLASSIFICATION_OS_BY_KEY[classification.key] ?? CLASSIFICATION_OS.CAPACITY_EROSION;

  return { classification, classification_os };
}
