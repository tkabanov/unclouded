import { supabase } from "@/integrations/supabase/client";

const SOBRIETY_DATE_KEY = "sobriety_start_date";

export interface ProfileFormState {
  firstName: string;
  lastName: string;
  sobrietyStartDate: string;
}

export async function loadProfileForm(userId: string): Promise<ProfileFormState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("firstName, lastName, onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  return {
    firstName: data?.firstName ?? "",
    lastName: data?.lastName ?? "",
    sobrietyStartDate:
      typeof onboarding[SOBRIETY_DATE_KEY] === "string" ? onboarding[SOBRIETY_DATE_KEY] : "",
  };
}

export async function saveProfileForm(userId: string, values: ProfileFormState): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (existing?.onboardingData as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      firstName: values.firstName.trim() || null,
      lastName: values.lastName.trim() || null,
      onboardingData: {
        ...onboarding,
        [SOBRIETY_DATE_KEY]: values.sobrietyStartDate || null,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
