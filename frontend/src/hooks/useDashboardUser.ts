import { createContext, useContext, useMemo, createElement, type ReactNode } from "react";
import { useUserProfile, type UserProfile } from "@/lib/userProfile";
import {
  readCoachingModeList,
  readPreferredCoachingMode,
} from "@/lib/dashboard/coachingModeApi";
import type { AiCoachingModeSlug } from "@/lib/enums/coachingMode";

/** Display fields for dashboard widget slots (IR current_user binding). */
export interface DashboardUserDisplay {
  firstName: string;
  roleType: string;
  primaryPillar: string;
  classificationName: string | null;
  classificationKey: string | null;
  pressureProfile: string | null;
  recoveryModeActive: boolean;
  griefModeActive: boolean;
  traumaInformedMode: boolean;
  subscribed: boolean;
  onboardingCompleted: boolean;
  hasResults: boolean;
  coachingModeList: AiCoachingModeSlug[];
  preferredCoachingMode: AiCoachingModeSlug | null;
  profile: UserProfile | null;
}

const DashboardUserContext = createContext<DashboardUserDisplay | null>(null);

export function mapProfileToDashboardUser(profile: UserProfile | null): DashboardUserDisplay {
  return {
    firstName: profile?.firstName?.trim() ?? "",
    roleType: profile?.roleType ?? "",
    primaryPillar: profile?.primaryPillar ?? "",
    classificationName: profile?.results?.classification.name ?? null,
    classificationKey: profile?.results?.classification.key ?? null,
    pressureProfile: profile?.results?.pressure_profile ?? null,
    recoveryModeActive: profile?.results?.recovery_mode_active ?? false,
    griefModeActive: profile?.results?.grief_mode_active ?? false,
    traumaInformedMode: profile?.results?.trauma_informed_mode ?? false,
    subscribed: profile?.subscribed ?? false,
    onboardingCompleted: profile?.onboardingCompleted ?? false,
    hasResults: Boolean(profile?.results),
    coachingModeList: readCoachingModeList(profile?.onboardingData),
    preferredCoachingMode: readPreferredCoachingMode(profile?.onboardingData),
    profile,
  };
}

/** Derives dashboard display fields from the authenticated user profile. */
export function useDashboardUser(): DashboardUserDisplay {
  const { profile } = useUserProfile();
  return useMemo(() => mapProfileToDashboardUser(profile), [profile]);
}

export function DashboardUserProvider({ children }: { children: ReactNode }) {
  const user = useDashboardUser();
  return createElement(DashboardUserContext.Provider, { value: user }, children);
}

/** Access dashboard user display fields from widget slots inside DashboardMain. */
export function useDashboardUserContext(): DashboardUserDisplay {
  const ctx = useContext(DashboardUserContext);
  if (!ctx) {
    throw new Error("useDashboardUserContext must be used within DashboardUserProvider");
  }
  return ctx;
}
