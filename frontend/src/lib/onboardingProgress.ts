import type { CustomerRoleSlug } from "@/lib/enums/customerProfile";
import { syncLegacyRoleType } from "@/lib/enums/customerRoleTypes";
import type { OnboardingStepSlug } from "@/lib/enums/onboardingSteps";
import {
  buildLoadSignalCustomStates,
  type HealthFlagsPayload,
} from "@/lib/enums/onboardingQuestions";
import type { OnboardingDraftPayload, UserProfile } from "@/lib/userProfile";

export const ONBOARDING_PROGRESS_STEP_KEY = "onboardingStep" as const;

export interface OnboardingFormState {
  firstName: string;
  lastName: string;
  roleTypes: CustomerRoleSlug[];
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

export const EMPTY_HEALTH_FLAGS: HealthFlagsPayload = {
  recovery_mode_active: false,
  grief_mode_active: false,
  health_flag3: false,
  health_flag4: false,
  health_flag5: false,
  health_flag6: false,
  health_none_of_the_above: false,
  selected_flags: [],
};

export function createEmptyOnboardingFormState(): OnboardingFormState {
  return {
    firstName: "",
    lastName: "",
    roleTypes: [],
    primaryPillar: "",
    stabilityScores: {},
    performanceScores: {},
    alignmentScores: {},
    orientationScore: 0,
    loadSignals: {},
    stateSignals: {},
    behavioralPatterns: {},
    healthFlags: EMPTY_HEALTH_FLAGS,
  };
}

export function mergeOnboardingFormState(
  base: OnboardingFormState,
  patch: Partial<OnboardingFormState>,
): OnboardingFormState {
  return {
    ...base,
    ...patch,
    stabilityScores: patch.stabilityScores
      ? { ...base.stabilityScores, ...patch.stabilityScores }
      : base.stabilityScores,
    performanceScores: patch.performanceScores
      ? { ...base.performanceScores, ...patch.performanceScores }
      : base.performanceScores,
    alignmentScores: patch.alignmentScores
      ? { ...base.alignmentScores, ...patch.alignmentScores }
      : base.alignmentScores,
    loadSignals: patch.loadSignals ? { ...base.loadSignals, ...patch.loadSignals } : base.loadSignals,
    stateSignals: patch.stateSignals
      ? { ...base.stateSignals, ...patch.stateSignals }
      : base.stateSignals,
    behavioralPatterns: patch.behavioralPatterns
      ? { ...base.behavioralPatterns, ...patch.behavioralPatterns }
      : base.behavioralPatterns,
    roleTypes: patch.roleTypes ?? base.roleTypes,
    healthFlags: patch.healthFlags ?? base.healthFlags,
  };
}

export function buildOnboardingDataRecord(
  form: OnboardingFormState,
  resumeStep: OnboardingStepSlug,
): Record<string, unknown> {
  return {
    stabilityScores: form.stabilityScores,
    performanceScores: form.performanceScores,
    alignmentScores: form.alignmentScores,
    orientationScore: form.orientationScore,
    loadSignals: form.loadSignals,
    loadSignalCustomStates: buildLoadSignalCustomStates(form.loadSignals),
    stateSignals: form.stateSignals,
    behavioralPatterns: form.behavioralPatterns,
    healthFlags: form.healthFlags,
    roleTypes: form.roleTypes,
    roleType: syncLegacyRoleType(form.roleTypes) ?? "",
    primaryPillar: form.primaryPillar,
    [ONBOARDING_PROGRESS_STEP_KEY]: resumeStep,
  };
}

export function buildOnboardingDraftPayload(
  form: OnboardingFormState,
  resumeStep: OnboardingStepSlug,
): OnboardingDraftPayload {
  const payload: OnboardingDraftPayload = {
    onboardingData: buildOnboardingDataRecord(form, resumeStep),
  };

  if (form.firstName) payload.firstName = form.firstName;
  if (form.lastName) payload.lastName = form.lastName;
  if (form.roleTypes.length > 0) {
    payload.roleTypes = form.roleTypes;
    payload.roleType = syncLegacyRoleType(form.roleTypes) ?? undefined;
  }
  if (form.primaryPillar) payload.primaryPillar = form.primaryPillar;

  return payload;
}

export function readOnboardingFormStateFromProfile(profile: UserProfile): {
  form: OnboardingFormState;
  resumeStep: OnboardingStepSlug | null;
} {
  const onboardingData = profile.onboardingData ?? {};

  return {
    form: {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      roleTypes: profile.roleTypes ?? [],
      primaryPillar: profile.primaryPillar ?? "",
      stabilityScores: (onboardingData.stabilityScores as Record<string, number> | undefined) ?? {},
      performanceScores: (onboardingData.performanceScores as Record<string, number> | undefined) ?? {},
      alignmentScores: (onboardingData.alignmentScores as Record<string, number> | undefined) ?? {},
      orientationScore: (onboardingData.orientationScore as number | undefined) ?? 0,
      loadSignals: (onboardingData.loadSignals as Record<string, string> | undefined) ?? {},
      stateSignals: (onboardingData.stateSignals as Record<string, string> | undefined) ?? {},
      behavioralPatterns:
        (onboardingData.behavioralPatterns as Record<string, string> | undefined) ?? {},
      healthFlags: (onboardingData.healthFlags as HealthFlagsPayload | undefined) ?? EMPTY_HEALTH_FLAGS,
    },
    resumeStep:
      (onboardingData[ONBOARDING_PROGRESS_STEP_KEY] as OnboardingStepSlug | undefined) ?? null,
  };
}
