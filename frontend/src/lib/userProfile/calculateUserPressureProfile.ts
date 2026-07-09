import { extractLoadSignalSlugs } from "@/lib/enums/onboardingQuestions";
import { STATE_NERVOUS_SYSTEM } from "@/lib/enums/wellnessState";
import { resolvePressureProfile } from "./buildPressureProfile";
import { loadProfileRow, patchOnboardingAndResults } from "./profileFieldPatch";

export const PRESSURE_PROFILE_TEXT_FIELD = "pressure_profile_text" as const;

function readSignalRecord(
  onboarding: Record<string, unknown>,
  key: string,
): Record<string, string> {
  const raw = onboarding[key];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [field, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") out[field] = value;
  }
  return out;
}

/** Bubble API event calculate_user_pressure_profile (bTIBO). */
export async function calculateUserPressureProfile(userId: string): Promise<string> {
  const { onboarding_data } = await loadProfileRow(userId);

  const loadSignals = readSignalRecord(onboarding_data, "loadSignals");
  const stateSignals = readSignalRecord(onboarding_data, "stateSignals");

  const loadSignalSlugs = extractLoadSignalSlugs(loadSignals);
  const nervousSystemSlug =
    stateSignals.nervous_system_state ?? STATE_NERVOUS_SYSTEM.REGULATED;

  const profile = resolvePressureProfile(loadSignalSlugs, nervousSystemSlug);

  await patchOnboardingAndResults(
    userId,
    { [PRESSURE_PROFILE_TEXT_FIELD]: profile },
    { pressure_profile: profile },
  );

  return profile;
}
