import { COACHING_MODE_LIST_FIELD } from "@/lib/dashboard/coachingModeApi";
import { resolveAiCoachingModes } from "./assignAiCoachingModes";
import { CLASSIFICATION_OPTION_FIELD } from "./calculateUserClassification";
import { BEHAVIORAL_FINGERPRINT_TEXT_FIELD } from "./calculateUserBehavioralFingerprint";
import { PRESSURE_PROFILE_TEXT_FIELD } from "./calculateUserPressureProfile";
import { loadProfileRow, patchOnboardingAndResults } from "./profileFieldPatch";

export { resolveAiCoachingModes };

/** Bubble API event calculate_user_ai_coaching_mode (bTIEN). */
export async function calculateUserAiCoachingMode(userId: string): Promise<string[]> {
  const { onboarding_data } = await loadProfileRow(userId);

  const modes = resolveAiCoachingModes({
    classification_os:
      typeof onboarding_data[CLASSIFICATION_OPTION_FIELD] === "string"
        ? onboarding_data[CLASSIFICATION_OPTION_FIELD]
        : null,
    pressure_profile_text:
      typeof onboarding_data[PRESSURE_PROFILE_TEXT_FIELD] === "string"
        ? onboarding_data[PRESSURE_PROFILE_TEXT_FIELD]
        : null,
    behavioral_fingerprint_text:
      typeof onboarding_data[BEHAVIORAL_FINGERPRINT_TEXT_FIELD] === "string"
        ? onboarding_data[BEHAVIORAL_FINGERPRINT_TEXT_FIELD]
        : null,
  });

  await patchOnboardingAndResults(userId, {
    [COACHING_MODE_LIST_FIELD]: modes,
    ai_coaching_mode_os: modes[modes.length - 1],
  });

  return modes;
}
