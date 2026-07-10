import { supabase } from "@/integrations/supabase/client";

/** onboardingData keys mirrored onto profiles columns (Bubble user table parity). */
const ONBOARDING_TO_PROFILE_COLUMN: Record<string, string> = {
  stabilityScore: "stabilityScore",
  alignmentScore: "alignmentScore",
  performanceScore: "performanceScore",
  orientationScore: "orientationScore",
  orientation_score1_number: "orientationScore",
  classification: "classification",
  pressureProfile: "pressureProfile",
  behavioralFingerprint: "behavioralFingerprint",
  aiConfidenceLevel: "aiConfidenceLevel",
};

function profileColumnsFromOnboardingPatch(
  onboardingPatch: Record<string, unknown>,
): Record<string, unknown> {
  const profilePatch: Record<string, unknown> = {};
  for (const [onboardingKey, profileKey] of Object.entries(ONBOARDING_TO_PROFILE_COLUMN)) {
    if (onboardingKey in onboardingPatch) {
      profilePatch[profileKey] = onboardingPatch[onboardingKey];
    }
  }
  return profilePatch;
}

export async function loadProfileRow(userId: string): Promise<{
  onboardingData: Record<string, unknown>;
  results: Record<string, unknown> | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboardingData, results")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const onboarding =
    data?.onboardingData &&
    typeof data.onboardingData === "object" &&
    !Array.isArray(data.onboardingData)
      ? (data.onboardingData as Record<string, unknown>)
      : {};

  const results =
    data?.results && typeof data.results === "object" && !Array.isArray(data.results)
      ? (data.results as Record<string, unknown>)
      : null;

  return { onboardingData: onboarding, results };
}

export async function patchOnboardingAndResults(
  userId: string,
  onboardingPatch: Record<string, unknown>,
  resultsPatch?: Record<string, unknown>,
): Promise<void> {
  const { onboardingData, results } = await loadProfileRow(userId);

  const updates: Record<string, unknown> = {
    ...profileColumnsFromOnboardingPatch(onboardingPatch),
    onboardingData: {
      ...onboardingData,
      ...onboardingPatch,
    },
  };

  if (resultsPatch && results) {
    updates.results = { ...results, ...resultsPatch };
  } else if (resultsPatch) {
    updates.results = resultsPatch;
  }

  const { error } = await supabase.from("profiles").update(updates as never).eq("id", userId);
  if (error) throw error;
}

export function readNumberField(
  onboarding: Record<string, unknown>,
  results: Record<string, unknown> | null,
  onboardingKey: string,
  resultsKey: string,
  fallback = 3,
): number {
  const fromOnboarding = onboarding[onboardingKey];
  if (typeof fromOnboarding === "number" && !Number.isNaN(fromOnboarding)) return fromOnboarding;

  const fromResults = results?.[resultsKey];
  if (typeof fromResults === "number" && !Number.isNaN(fromResults)) return fromResults;

  return fallback;
}
