import type { UserProfile } from "@/lib/userProfile";
import {
  ADMIN_CONSOLE_ROUTE,
  isSettingsAdminUser,
} from "@/lib/settings/isSettingsAdminUser";

export type PostAuthRoute = "/dashboard" | "/onboarding" | typeof ADMIN_CONSOLE_ROUTE;

export function isOnboardingComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (isSettingsAdminUser(profile.roleType)) return true;
  return profile.onboardingCompleted;
}

export function resolvePostAuthRoute(profile: UserProfile | null | undefined): PostAuthRoute {
  if (isSettingsAdminUser(profile?.roleType)) {
    return ADMIN_CONSOLE_ROUTE;
  }
  return isOnboardingComplete(profile) ? "/dashboard" : "/onboarding";
}
