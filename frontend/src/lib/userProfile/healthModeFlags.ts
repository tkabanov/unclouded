import { CUSTOMER_ROLE } from "@/lib/enums/customerProfile";
import { profileHasCustomerRole } from "@/lib/enums/customerRoleTypes";

export interface HealthModeFlags {
  recoveryModeActive: boolean;
  griefModeActive: boolean;
  traumaInformedMode: boolean;
  /** REQ-15 — major life transition unlocks Unsent Letter path visibility. */
  transitionFlagActive: boolean;
}

export interface HealthModeProfileSource {
  onboardingData?: Record<string, unknown> | null;
  results?: {
    recovery_mode_active?: boolean;
    grief_mode_active?: boolean;
    trauma_informed_mode?: boolean;
  } | null;
  roleType?: string | null;
  roleTypes?: readonly string[] | null;
  aboutYou?: {
    careerStage?: string | null;
    employmentStatus?: string | null;
  } | null;
}

function readBooleanFlag(
  healthFlags: Record<string, unknown> | null,
  results: HealthModeProfileSource["results"],
  healthKey: "recovery_mode_active" | "grief_mode_active",
  resultsKey: keyof NonNullable<HealthModeProfileSource["results"]>,
): boolean {
  const fromHealth = healthFlags?.[healthKey];
  if (fromHealth === true) return true;

  const fromResults = results?.[resultsKey];
  return fromResults === true;
}

function readLoadSignals(
  onboardingData: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const raw = onboardingData?.loadSignals;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

/** Mirrors chat load modifier resolution for path library gating (REQ-15). */
export function resolveTransitionFlagActive(
  profile: HealthModeProfileSource | null | undefined,
): boolean {
  const onboardingData = profile?.onboardingData ?? null;
  if (onboardingData?.transition_flag === true) return true;

  const loadSignals = readLoadSignals(onboardingData);
  if (loadSignals?.transition_flag === true) return true;

  if (profileHasCustomerRole(profile?.roleTypes, profile?.roleType, CUSTOMER_ROLE.TRANSITION)) {
    return true;
  }

  const careerStage = profile?.aboutYou?.careerStage?.trim().toLowerCase();
  if (careerStage === "career_transition") return true;

  const employmentStatus = profile?.aboutYou?.employmentStatus?.trim().toLowerCase();
  if (employmentStatus === "between_roles") return true;

  return false;
}

/** Canonical UI/backend flag resolution from profile results + onboarding healthFlags. */
export function resolveHealthModeFlags(
  profile: HealthModeProfileSource | null | undefined,
): HealthModeFlags {
  const healthFlags =
    profile?.onboardingData?.healthFlags &&
    typeof profile.onboardingData.healthFlags === "object" &&
    !Array.isArray(profile.onboardingData.healthFlags)
      ? (profile.onboardingData.healthFlags as Record<string, unknown>)
      : null;

  const results = profile?.results ?? null;

  return {
    recoveryModeActive: readBooleanFlag(
      healthFlags,
      results,
      "recovery_mode_active",
      "recovery_mode_active",
    ),
    griefModeActive: readBooleanFlag(healthFlags, results, "grief_mode_active", "grief_mode_active"),
    traumaInformedMode: results?.trauma_informed_mode === true,
    transitionFlagActive: resolveTransitionFlagActive(profile),
  };
}
