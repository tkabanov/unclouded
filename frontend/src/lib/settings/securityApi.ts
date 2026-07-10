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
