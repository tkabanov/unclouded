import { supabase } from "@/integrations/supabase/client";

const SOBRIETY_DATE_KEY = "sobriety_start_date_date";
const RECOVERY_MODE_KEY = "recovery_mode_active_boolean";

export interface ProfileFormState {
  firstName: string;
  email: string;
  sobrietyStartDate: string;
  recoveryModeActive: boolean;
}

export async function loadProfileForm(userId: string): Promise<ProfileFormState> {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, email, onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const onboarding =
    (data?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};

  return {
    firstName: data?.first_name ?? "",
    email: data?.email ?? "",
    sobrietyStartDate:
      typeof onboarding[SOBRIETY_DATE_KEY] === "string" ? onboarding[SOBRIETY_DATE_KEY] : "",
    recoveryModeActive: onboarding[RECOVERY_MODE_KEY] === true || onboarding[RECOVERY_MODE_KEY] === "true",
  };
}

/** bTIhq profile-save-btn workflow parity. */
export async function saveProfileForm(
  userId: string,
  values: ProfileFormState,
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("onboarding_data")
    .eq("id", userId)
    .maybeSingle();

  if (readError) throw readError;

  const onboarding =
    (existing?.onboarding_data as Record<string, unknown> | null | undefined) ?? {};

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.firstName.trim() || null,
      email: values.email.trim() || null,
      onboarding_data: {
        ...onboarding,
        [SOBRIETY_DATE_KEY]: values.sobrietyStartDate || null,
        [RECOVERY_MODE_KEY]: values.recoveryModeActive,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
