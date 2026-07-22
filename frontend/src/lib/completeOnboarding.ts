import { computeResults, type ResultsData } from "@/lib/classification";
import {
  identifyUser,
  trackProductEvent,
} from "@/lib/analytics/productAnalytics";
import { scheduleWelcomeEmailAfterOnboarding } from "@/lib/email/transactionalEmailHooks";
import type { CustomerRoleSlug } from "@/lib/enums/customerProfile";
import { syncLegacyRoleType } from "@/lib/enums/customerRoleTypes";
import { computeOnboardingModulePreview } from "@/lib/modules/moduleScheduler";
import { autoEnrollPathsAfterOnboarding } from "@/lib/paths/pathsOnboardingEnrollmentApi";
import { recordInitialAssessment } from "@/lib/reassessment/completeReassessment";
import { runOnboardingProfilePipeline } from "@/lib/userProfile/onboardingProfilePipeline";
import type { OnboardingPayload, SaveOnboardingOptions } from "@/lib/userProfile";

export const ONBOARDING_COMPLETE_ROUTE = "/dashboard" as const;

const REQUIRED_LOAD_SIGNAL_FIELDS = [
  "cognitive_load_signal",
  "relational_load_signal",
  "environmental_load_signal",
  "financial_load_signal",
] as const;

export interface OnboardingCompletionData {
  firstName: string;
  lastName: string;
  roleTypes: CustomerRoleSlug[];
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
  userEmail?: string;
  saveOnboarding: (payload: OnboardingPayload, options?: SaveOnboardingOptions) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  /** Reload profile context after pipeline patches coaching modes (API-05 / DASH-02). */
  refreshProfile?: () => Promise<void>;
  navigate: (path: string) => void;
  /** Anchor for module scheduler — must match Results preview when provided. */
  anchorDate?: Date;
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
  {
    userId,
    userEmail,
    saveOnboarding,
    markOnboardingComplete,
    refreshProfile,
    navigate,
    anchorDate: anchorDateOverride,
  }: CompleteOnboardingDeps
): Promise<void> {
  if (!canCompleteOnboarding(data)) {
    throw new Error("Required onboarding signals are not complete");
  }

  const anchorDate = anchorDateOverride ?? new Date();
  const { schedules: moduleSchedules, preview } = computeOnboardingModulePreview(
    data,
    anchorDate,
    anchorDate,
  );

  const coreResults = computeResults(
    data.stabilityScores,
    data.performanceScores,
    data.alignmentScores,
    data.orientationScore,
    data.loadSignals,
    data.stateSignals,
    data.behavioralPatterns,
    data.healthFlags
  );

  const results: ResultsData = {
    ...coreResults,
    first_module: preview.displayTitle,
    module_days: preview.daysUntilUnlock,
  };

  const payload: OnboardingPayload = {
    firstName: data.firstName,
    lastName: data.lastName,
    roleTypes: data.roleTypes,
    roleType: syncLegacyRoleType(data.roleTypes) ?? data.roleType,
    primaryPillar: data.primaryPillar,
    results,
    modulesCompletedCount: 0,
    moduleSchedules,
    onboardingData: {
      stabilityScores: data.stabilityScores,
      performanceScores: data.performanceScores,
      alignmentScores: data.alignmentScores,
      orientationScore: data.orientationScore,
      loadSignals: data.loadSignals,
      stateSignals: data.stateSignals,
      behavioralPatterns: data.behavioralPatterns,
      healthFlags: data.healthFlags,
      modules_completed_count_number: 0,
    },
  };

  // Persist answers without marking complete — prevents dashboard redirect before pipeline runs.
  await saveOnboarding(payload, { markComplete: false, refresh: false });

  await runOnboardingProfilePipeline(userId);

  await markOnboardingComplete();

  trackProductEvent("onboarding_completed");
  trackProductEvent("classification_assigned", {
    classification: results.classification?.name ?? results.classification?.key ?? null,
  });
  identifyUser(userId, {
    classification: results.classification?.name ?? results.classification?.key ?? null,
  });

  try {
    await recordInitialAssessment(userId, results);
  } catch (err) {
    console.warn("Failed to record initial assessmentResult row", err);
  }

  await autoEnrollPathsAfterOnboarding({
    userId,
    primaryPillar: data.primaryPillar,
    results,
  });

  scheduleWelcomeEmailAfterOnboarding({
    userId,
    email: userEmail,
    firstName: data.firstName,
  });

  navigate(ONBOARDING_COMPLETE_ROUTE);
}
