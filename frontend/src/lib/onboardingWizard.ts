import {
  ONBOARDING_STEP,
  ONBOARDING_STEP_ORDER,
  type OnboardingStepSlug,
} from "@/lib/enums/onboardingSteps";

/** Bubble custom events on page bTGNJ (workflows bTHIe / bTHJC). */
export const ONBOARDING_WORKFLOW_EVENTS = {
  NEXT_STEP: "bTHIT",
  PREVIOUS_STEP: "bTHIw",
} as const;

/** 12 scored steps after welcome. */
export const ONBOARDING_SCORED_STEP_COUNT = ONBOARDING_STEP_ORDER.length - 1;

export function getStepIndex(step: OnboardingStepSlug): number {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

export function advanceStep(current: OnboardingStepSlug): OnboardingStepSlug | null {
  const index = getStepIndex(current);
  if (index < 0 || index >= ONBOARDING_STEP_ORDER.length - 1) return null;
  return ONBOARDING_STEP_ORDER[index + 1] ?? null;
}

export function retreatStep(current: OnboardingStepSlug): OnboardingStepSlug | null {
  const index = getStepIndex(current);
  if (index <= 0) return null;
  return ONBOARDING_STEP_ORDER[index - 1] ?? null;
}

export function getStepDisplayNumber(step: OnboardingStepSlug): number | null {
  const index = getStepIndex(step);
  if (index <= 0) return null;
  return index;
}

export function showsWizardChrome(step: OnboardingStepSlug): boolean {
  return step !== ONBOARDING_STEP.WELCOME;
}

export function canGoBack(step: OnboardingStepSlug): boolean {
  return retreatStep(step) !== null && step !== ONBOARDING_STEP.WELCOME;
}
