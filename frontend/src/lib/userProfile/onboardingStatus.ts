import type { UserProfile } from "@/lib/userProfile";

export function isOnboardingComplete(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.onboardingCompleted || profile.results != null;
}

export function resolvePostAuthRoute(profile: UserProfile | null | undefined): "/dashboard" | "/onboarding" {
  return isOnboardingComplete(profile) ? "/dashboard" : "/onboarding";
}
