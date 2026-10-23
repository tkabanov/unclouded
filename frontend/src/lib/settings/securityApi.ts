import { signOutEverywhere } from "@/lib/auth/sessionAuth";
import { supabase } from "@/integrations/supabase/client";

export class SecurityChangePasswordError extends Error {
  constructor(
    message: string,
    readonly code: "password_required" | "invalid_password" | "update_failed" = "update_failed",
  ) {
    super(message);
    this.name = "SecurityChangePasswordError";
  }
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!currentPassword) {
    throw new SecurityChangePasswordError(
      "Enter your current password.",
      "password_required",
    );
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) {
    throw new SecurityChangePasswordError("Current password is incorrect.", "invalid_password");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export { sendPasswordResetEmail } from "@/lib/auth/passwordResetApi";

/**
 * NCLDD-63 (OVR-081): full account deletion via the `delete-account` edge function — cancels
 * Stripe, removes stored files and deletes the auth user (all data cascades). Then signs out.
 */
export async function requestAccountDeletion(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { confirm: true },
  });
  if (error || (data as { ok?: boolean } | null)?.ok !== true) {
    throw new Error("Couldn't delete your account. Please contact support.");
  }

  await signOutEverywhere();
}
