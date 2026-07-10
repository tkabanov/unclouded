import { COACHING_MODE_LIST_FIELD } from "@/lib/dashboard/coachingModeApi";
import { resolveAiCoachingModes } from "./assignAiCoachingModes";
import {
  ALIGNMENT_SCORE_NUMBER_FIELD,
  PERFORMANCE_SCORE_NUMBER_FIELD,
  STABILITY_SCORE_NUMBER_FIELD,
} from "./pillarScoreUserData";
import { loadProfileRow, patchOnboardingAndResults, readNumberField } from "./profileFieldPatch";

export { resolveAiCoachingModes };

function readHealthFlag(
  onboarding: Record<string, unknown>,
  results: Record<string, unknown> | null,
  key: "recovery_mode_active" | "grief_mode_active",
): boolean {
  const healthFlags = onboarding.healthFlags;
  if (healthFlags && typeof healthFlags === "object" && !Array.isArray(healthFlags)) {
    const value = (healthFlags as Record<string, unknown>)[key];
    if (typeof value === "boolean") return value;
  }

  const fromResults = results?.[key];
  if (typeof fromResults === "boolean") return fromResults;

  return false;
}

function readCognitiveLoadSignalSlug(onboarding: Record<string, unknown>): string | null {
  const loadSignals = onboarding.loadSignals;
  if (!loadSignals || typeof loadSignals !== "object" || Array.isArray(loadSignals)) return null;

  const slug = (loadSignals as Record<string, unknown>).cognitive_load_signal;
  return typeof slug === "string" ? slug : null;
}

/** Bubble API event calculate_user_ai_coaching_mode (bTIEN). */
export async function calculateUserAiCoachingMode(userId: string): Promise<string[]> {
  const { onboardingData, results } = await loadProfileRow(userId);

  const modes = resolveAiCoachingModes({
    stability_score: readNumberField(
      onboardingData,
      results,
      STABILITY_SCORE_NUMBER_FIELD,
      "stability_score",
    ),
    alignment_score: readNumberField(
      onboardingData,
      results,
      ALIGNMENT_SCORE_NUMBER_FIELD,
      "alignment_score",
    ),
    performance_score: readNumberField(
      onboardingData,
      results,
      PERFORMANCE_SCORE_NUMBER_FIELD,
      "performance_score",
    ),
    recovery_mode_active: readHealthFlag(onboardingData, results, "recovery_mode_active"),
    grief_mode_active: readHealthFlag(onboardingData, results, "grief_mode_active"),
    cognitive_load_signal_slug: readCognitiveLoadSignalSlug(onboardingData),
  });

  await patchOnboardingAndResults(userId, {
    [COACHING_MODE_LIST_FIELD]: modes,
    ai_coaching_mode_os: modes[modes.length - 1],
  });

  return modes;
}
