import { resolveClassification } from "./classifyUser";
import {
  ALIGNMENT_SCORE_NUMBER_FIELD,
  PERFORMANCE_SCORE_NUMBER_FIELD,
  STABILITY_SCORE_NUMBER_FIELD,
} from "./pillarScoreUserData";
import { loadProfileRow, patchOnboardingAndResults, readNumberField } from "./profileFieldPatch";

export const CLASSIFICATION_OPTION_FIELD = "classification" as const;
export const ORIENTATION_SCORE1_NUMBER_FIELD = "orientation_score1_number" as const;

/** Bubble API event calculate_user_classification (bTHzC). */
export async function calculateUserClassification(userId: string): Promise<string> {
  const { onboardingData, results } = await loadProfileRow(userId);

  const stability = readNumberField(
    onboardingData,
    results,
    STABILITY_SCORE_NUMBER_FIELD,
    "stability_score",
  );
  const performance = readNumberField(
    onboardingData,
    results,
    PERFORMANCE_SCORE_NUMBER_FIELD,
    "performance_score",
  );
  const alignment = readNumberField(
    onboardingData,
    results,
    ALIGNMENT_SCORE_NUMBER_FIELD,
    "alignment_score",
  );
  const orientation = readNumberField(
    onboardingData,
    results,
    ORIENTATION_SCORE1_NUMBER_FIELD,
    "orientation_score",
  );

  const orientationFromCamel = onboardingData.orientationScore;
  const resolvedOrientation =
    typeof orientationFromCamel === "number" && !Number.isNaN(orientationFromCamel)
      ? orientationFromCamel
      : orientation;

  const { classification, classification_os } = resolveClassification({
    stability_score: stability,
    performance_score: performance,
    alignment_score: alignment,
    orientation_score: resolvedOrientation,
  });

  await patchOnboardingAndResults(
    userId,
    { [CLASSIFICATION_OPTION_FIELD]: classification_os },
    { classification },
  );

  return classification_os;
}
