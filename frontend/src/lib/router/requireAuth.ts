import { useAuth } from "@/hooks/useAuth";
import { isRecoveryAuthorized } from "@/lib/auth/recoverySession";

export const AUTH_REDIRECT_PATH = "/" as const;
export const PASSWORD_RECOVERY_PATH = "/reset_pw" as const;

export type RequireAuthState = "loading" | "authenticated" | "unauthenticated" | "recovery";

/** Resolve whether the current session may access routes with `requiresAuth` meta. */
export function useRequireAuth(): RequireAuthState {
  const { user, session, loading } = useAuth();

  if (loading) {
    return "loading";
  }

  if (!user) {
    return "unauthenticated";
  }

  if (isRecoveryAuthorized(session)) {
    return "recovery";
  }

  return "authenticated";
}
