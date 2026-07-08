import { computeResults } from "@/lib/classification";
import { SIDEBAR_NAV_ROUTES } from "@/lib/enums/navigation";
import type { HealthFlagsPayload } from "@/lib/enums/onboardingQuestions";
import { runOnboardingProfilePipeline } from "@/lib/userProfile/onboardingProfilePipeline";
import type { OnboardingPayload } from "@/lib/userProfile";

/** Bubble dashboard page id — post-onboarding destination (bTHDT) */
export const ONBOARDING_COMPLETE_DESTINATION_BUBBLE_ID = "bTHDT" as const;

export const ONBOARDING_COMPLETE_ROUTE = SIDEBAR_NAV_ROUTES.dashboard;

const REQUIRED_LOAD_SIGNAL_FIELDS = [
  "cognitive_load_signal",
  "relational_load_signal",
  "environmental_load_signal",
  "financial_load_signal",
] as const;

export interface OnboardingCompletionData {
  firstName: string;
  roleType: string;
  primaryPillar: string;
  stabilityScores: Record<string, number>;
  performanceScores: Record<string, number>;
  alignmentScores: Record<string, number>;
  orientationScore: number;
  loadSignals: Record<string, string>;
  stateSignals: Record<string, string>;
  behavioralPatterns: Record<string, string>;
  healthFlags: HealthFlagsPayload;
}

export interface CompleteOnboardingDeps {
  userId: string;
  saveOnboarding: (payload: OnboardingPayload) => Promise<void>;
  navigate: (path: string) => void;
}

/** True when all load-signal and health-flag steps have required answers. */
export function canCompleteOnboarding(data: OnboardingCompletionData): boolean {
  const loadComplete = REQUIRED_LOAD_SIGNAL_FIELDS.every((field) => Boolean(data.loadSignals[field]));
  const healthComplete = data.healthFlags.selected_flags.length > 0;
  return loadComplete && healthComplete;
}

/**
 * Final onboarding step: persist profile, set onboarding_complete, route to dashboard (bTHDT).
 */
export async function completeOnboarding(
  data: OnboardingCompletionData,
  { userId, saveOnboarding, navigate }: CompleteOnboardingDeps
): Promise<void> {
  if (!canCompleteOnboarding(data)) {
    throw new Error("Required onboarding signals are not complete");
  }

  const results = computeResults(
    data.stabilityScores,
    data.performanceScores,
    data.alignmentScores,
    data.orientationScore,
    data.loadSignals,
    data.stateSignals,
    data.behavioralPatterns,
    data.healthFlags
  );

  await saveOnboarding({
    firstName: data.firstName,
    roleType: data.roleType,
    primaryPillar: data.primaryPillar,
    results,
    onboardingData: {
      stabilityScores: data.stabilityScores,
      performanceScores: data.performanceScores,
      alignmentScores: data.alignmentScores,
      orientationScore: data.orientationScore,
      loadSignals: data.loadSignals,
      stateSignals: data.stateSignals,
      behavioralPatterns: data.behavioralPatterns,
      healthFlags: data.healthFlags,
    },
  });

  await runOnboardingProfilePipeline(userId);

  navigate(ONBOARDING_COMPLETE_ROUTE);
}
