import { useAuth } from "@/hooks/useAuth";

export const AUTH_REDIRECT_PATH = "/" as const;

export type RequireAuthState = "loading" | "authenticated" | "unauthenticated";

/** Resolve whether the current session may access routes with `requiresAuth` meta. */
export function useRequireAuth(): RequireAuthState {
  const { user, loading } = useAuth();

  if (loading) {
    return "loading";
  }

  if (!user) {
    return "unauthenticated";
  }

  return "authenticated";
}
