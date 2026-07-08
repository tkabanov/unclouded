import { supabase } from "@/integrations/supabase/client";

export async function loadProfileRow(userId: string): Promise<{
  onboarding_data: Record<string, unknown>;
  results: Record<string, unknown> | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_data, results")
    .eq("id", userId)
    .single();

  if (error) throw error;

  const onboarding =
    data?.onboarding_data &&
    typeof data.onboarding_data === "object" &&
    !Array.isArray(data.onboarding_data)
      ? (data.onboarding_data as Record<string, unknown>)
      : {};

  const results =
    data?.results && typeof data.results === "object" && !Array.isArray(data.results)
      ? (data.results as Record<string, unknown>)
      : null;

  return { onboarding_data: onboarding, results };
}

export async function patchOnboardingAndResults(
  userId: string,
  onboardingPatch: Record<string, unknown>,
  resultsPatch?: Record<string, unknown>,
): Promise<void> {
  const { onboarding_data, results } = await loadProfileRow(userId);

  const updates: Record<string, unknown> = {
    onboarding_data: {
      ...onboarding_data,
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
