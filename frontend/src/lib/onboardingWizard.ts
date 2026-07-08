import {
  ONBOARDING_STEP,
  ONBOARDING_STEP_ORDER,
  type OnboardingStepSlug,
} from "@/lib/enums/onboardingSteps";

/** Bubble custom events on page bTGNJ (workflows bTHIe / bTHJC). */
export const ONBOARDING_WORKFLOW_EVENTS = {
  /** Workflow bTHIT — `next_step` with `current_step` param; action bTHIg ChangeThing */
  NEXT_STEP: "bTHIT",
  /** Workflow bTHIw — `previous_step` with `current_step` param; action bTHIy ChangeThing */
  PREVIOUS_STEP: "bTHIw",
} as const;

/** Bubble bTHEQ: `Step N of {option_set.count - 1}` → 12 scored steps after welcome. */
export const ONBOARDING_SCORED_STEP_COUNT = ONBOARDING_STEP_ORDER.length - 1;

export function getStepIndex(step: OnboardingStepSlug): number {
  return ONBOARDING_STEP_ORDER.indexOf(step);
}

/** Mirrors Bubble `next_step`: option_set filtered by current number + 1. */
export function advanceStep(current: OnboardingStepSlug): OnboardingStepSlug | null {
  const index = getStepIndex(current);
  if (index < 0 || index >= ONBOARDING_STEP_ORDER.length - 1) return null;
  return ONBOARDING_STEP_ORDER[index + 1] ?? null;
}

/** Mirrors Bubble `previous_step`: option_set filtered by current number - 1. */
export function retreatStep(current: OnboardingStepSlug): OnboardingStepSlug | null {
  const index = getStepIndex(current);
  if (index <= 0) return null;
  return ONBOARDING_STEP_ORDER[index - 1] ?? null;
}

/** Display index for bTHEQ progress text (`Step N of 12`). */
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

/**
 * Step registry — maps onboarding_step_os slugs to Bubble element groups under bTHHM.
 * Question panel UIs remain in step components (AUTH-04/05); shell only routes by slug.
 */
export const ONBOARDING_STEP_BUBBLE_GROUPS: Record<OnboardingStepSlug, string | null> = {
  [ONBOARDING_STEP.WELCOME]: null,
  [ONBOARDING_STEP.NAME]: "bTHJK",
  [ONBOARDING_STEP.ROLE]: "bTHMo",
  [ONBOARDING_STEP.PILLAR]: "bTHRN",
  [ONBOARDING_STEP.STABILITY]: "bTHUO",
  [ONBOARDING_STEP.PERFORMANCE]: "bTHfq",
  [ONBOARDING_STEP.ALIGNMENT]: "bTHiv",
  [ONBOARDING_STEP.ORIENTATION]: "bTHkb",
  [ONBOARDING_STEP.LOAD_SIGNALS]: "bTHnK",
  [ONBOARDING_STEP.STATE_SIGNALS]: "bTHpZ",
  [ONBOARDING_STEP.BEHAVIORAL_PATTERN]: "bTHrF",
  [ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS]: "bTHtb",
  [ONBOARDING_STEP.RESULTS]: "bTIKH",
};
