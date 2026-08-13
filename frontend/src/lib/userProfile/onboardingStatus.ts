import type { UserProfile } from "@/lib/userProfile";
import {
  ADMIN_CONSOLE_ROUTE,
  isSettingsAdminUser,
} from "@/lib/settings/isSettingsAdminUser";
import { EMPLOYER_PORTAL_ROUTE } from "@/lib/employer/routes";
import { listHrWorkplaces } from "@/lib/employer/workplaceHrPortalApi";

export type PostAuthRoute =
  | "/dashboard"
  | "/onboarding"
  | typeof ADMIN_CONSOLE_ROUTE
  | typeof EMPLOYER_PORTAL_ROUTE;

export type PostAuthRouteOptions = {
  /** HR primary/delegate without clinical enterprise enrollment (OVR-055). */
  isPortalOnlyHr?: boolean;
};

export function isEnterpriseAccountType(accountType: string | null | undefined): boolean {
  return (accountType ?? "individual").trim().toLowerCase() === "enterprise";
}

/** Portal-only HR: has employer portal access but is not an enrolled enterprise employee. */
export function isPortalOnlyHrProfile(
  profile: UserProfile | null | undefined,
  isHrContact: boolean,
): boolean {
  return Boolean(isHrContact && profile && !isEnterpriseAccountType(profile.accountType));
}

export function isOnboardingComplete(
  profile: UserProfile | null | undefined,
  options?: PostAuthRouteOptions,
): boolean {
  if (!profile) return false;
  if (isSettingsAdminUser(profile.roleType)) return true;
  if (options?.isPortalOnlyHr) return true;
  return profile.onboardingCompleted;
}

export function resolvePostAuthRoute(
  profile: UserProfile | null | undefined,
  options?: PostAuthRouteOptions,
): PostAuthRoute {
  if (isSettingsAdminUser(profile?.roleType)) {
    return ADMIN_CONSOLE_ROUTE;
  }
  if (options?.isPortalOnlyHr) {
    return EMPLOYER_PORTAL_ROUTE;
  }
  return isOnboardingComplete(profile) ? "/dashboard" : "/onboarding";
}

/**
 * Async post-auth destination: detects portal-only HR via workplaces + accountType.
 */
export async function resolvePostAuthRouteForUser(params: {
  profile: UserProfile | null | undefined;
  userId: string | null | undefined;
  email: string | null | undefined;
}): Promise<PostAuthRoute> {
  const { profile, userId, email } = params;
  if (isSettingsAdminUser(profile?.roleType)) {
    return ADMIN_CONSOLE_ROUTE;
  }
  if (!isEnterpriseAccountType(profile?.accountType)) {
    const workplaces = await listHrWorkplaces(email, userId);
    if (workplaces.length > 0) {
      return EMPLOYER_PORTAL_ROUTE;
    }
  }
  return isOnboardingComplete(profile) ? "/dashboard" : "/onboarding";
}
