import { supabase } from "@/integrations/supabase/client";

const SOBRIETY_DATE_KEY = "sobriety_start_date_date";
const RECOVERY_MODE_KEY = "recovery_mode_active_boolean";

export interface ProfileFormState {
  firstName: string;
  email: string;
  sobrietyStartDate: string;
  recoveryModeActive: boolean;
}

export interface SaveProfileFormOptions {
  /** Auth email at load time — used for bTIhq UpdateCredentials parity. */
  originalEmail: string;
  /** Required when email changes (Bubble bTIhj old_password). */
  currentPassword?: string;
}

export class ProfileSaveError extends Error {
  constructor(
    message: string,
    readonly code: "password_required" | "invalid_password" | "save_failed" = "save_failed",
  ) {
    super(message);
    this.name = "ProfileSaveError";
  }
}

export async function loadProfileForm(
  userId: string,
  authEmail?: string | null,
): Promise<ProfileFormState> {
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
    email: authEmail ?? data?.email ?? "",
    sobrietyStartDate:
      typeof onboarding[SOBRIETY_DATE_KEY] === "string" ? onboarding[SOBRIETY_DATE_KEY] : "",
    recoveryModeActive:
      onboarding[RECOVERY_MODE_KEY] === true || onboarding[RECOVERY_MODE_KEY] === "true",
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** bTIhq profile-save-btn workflow parity: ChangeThing + conditional UpdateCredentials. */
export async function saveProfileForm(
  userId: string,
  values: ProfileFormState,
  options: SaveProfileFormOptions,
): Promise<void> {
  const nextEmail = values.email.trim();
  const originalEmail = options.originalEmail.trim();
  const emailChanged =
    nextEmail.length > 0 &&
    originalEmail.length > 0 &&
    normalizeEmail(nextEmail) !== normalizeEmail(originalEmail);

  if (emailChanged) {
    if (!options.currentPassword) {
      throw new ProfileSaveError(
        "Enter your current password to change your email.",
        "password_required",
      );
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: originalEmail,
      password: options.currentPassword,
    });
    if (reauthError) {
      throw new ProfileSaveError("Current password is incorrect.", "invalid_password");
    }

    const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail });
    if (emailError) throw emailError;
  }

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
      email: nextEmail || null,
      onboarding_data: {
        ...onboarding,
        [SOBRIETY_DATE_KEY]: values.sobrietyStartDate || null,
        [RECOVERY_MODE_KEY]: values.recoveryModeActive,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}
