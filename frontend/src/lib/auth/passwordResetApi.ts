import { getAppOrigin } from "@/lib/appUrl";
import { supabase } from "@/integrations/supabase/client";
import { isRecoveryAuthorized } from "@/lib/auth/recoverySession";
import { clearRecoveryAuthorization } from "@/lib/auth/recoverySessionState";

const PASSWORD_RESET_REDIRECT_PATH = "/reset_pw";

export function getPasswordResetRedirectUrl(): string {
  return `${getAppOrigin()}${PASSWORD_RESET_REDIRECT_PATH}`;
}

export class PasswordRecoveryError extends Error {
  constructor(message = "This reset link is invalid or has expired. Request a new one.") {
    super(message);
    this.name = "PasswordRecoveryError";
  }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) throw error;
}

/**
 * Unauthenticated reset request — always resolves so callers cannot infer account existence.
 */
export async function requestPasswordResetEmail(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(email);
  } catch {
    // Anti-enumeration: same outcome whether the email exists or the request failed.
  }
}

export async function completePasswordRecovery(newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!isRecoveryAuthorized(session)) {
    throw new PasswordRecoveryError();
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.message.toLowerCase().includes("session")) {
      throw new PasswordRecoveryError();
    }
    throw error;
  }

  clearRecoveryAuthorization();
}
