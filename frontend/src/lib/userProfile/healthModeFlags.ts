export interface HealthModeFlags {
  recoveryModeActive: boolean;
  griefModeActive: boolean;
  traumaInformedMode: boolean;
}

export interface HealthModeProfileSource {
  onboardingData?: Record<string, unknown> | null;
  results?: {
    recovery_mode_active?: boolean;
    grief_mode_active?: boolean;
    trauma_informed_mode?: boolean;
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
  };
}
