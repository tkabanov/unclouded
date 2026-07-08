/** Bubble option set: onboarding_step_os (Onboarding Step OS) */

export const ONBOARDING_STEP_OPTION_SET_ID = "onboarding_step_os" as const;

export const ONBOARDING_STEP = {
  /** bTHHu */
  WELCOME: "welcome",
  /** bTHHv */
  NAME: "name",
  /** bTHHw */
  ROLE: "role",
  /** bTHIA */
  PILLAR: "pillar",
  /** bTHIB */
  STABILITY: "stability",
  /** bTHIC */
  PERFORMANCE: "performance",
  /** bTHIG */
  ALIGNMENT: "alignment",
  /** bTHIH */
  ORIENTATION: "orientation",
  /** bTHII */
  LOAD_SIGNALS: "load_signals",
  /** bTHIM */
  STATE_SIGNALS: "state_signals",
  /** bTHIN */
  BEHAVIORAL_PATTERN: "behavioral_pattern",
  /** bTHIO */
  HEALTH_WELLNESS_FLAGS: "health___wellness_flags",
  /** bTIFm */
  RESULTS: "results",
} as const;

export type OnboardingStepSlug = (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];

/** Display strings from ir/inventory.json → onboarding_step_os */
export const ONBOARDING_STEP_LABELS: Record<OnboardingStepSlug, string> = {
  welcome: "Welcome", // bTHHu
  name: "Name", // bTHHv
  role: "Role", // bTHHw
  pillar: "Pillar", // bTHIA
  stability: "Stability", // bTHIB
  performance: "Performance", // bTHIC
  alignment: "Alignment", // bTHIG
  orientation: "Orientation", // bTHIH
  load_signals: "Load Signals", // bTHII
  state_signals: "State Signals", // bTHIM
  behavioral_pattern: "Behavioral Pattern", // bTHIN
  health___wellness_flags: "Health & Wellness Flags", // bTHIO
  results: "Results", // bTIFm
};

export const ONBOARDING_STEP_ORDER: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.WELCOME,
  ONBOARDING_STEP.NAME,
  ONBOARDING_STEP.ROLE,
  ONBOARDING_STEP.PILLAR,
  ONBOARDING_STEP.STABILITY,
  ONBOARDING_STEP.PERFORMANCE,
  ONBOARDING_STEP.ALIGNMENT,
  ONBOARDING_STEP.ORIENTATION,
  ONBOARDING_STEP.LOAD_SIGNALS,
  ONBOARDING_STEP.STATE_SIGNALS,
  ONBOARDING_STEP.BEHAVIORAL_PATTERN,
  ONBOARDING_STEP.HEALTH_WELLNESS_FLAGS,
  ONBOARDING_STEP.RESULTS,
];
