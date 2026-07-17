import type { CoachingModeSlug, ProfileData, ResolvedCoachingModes } from "./types.ts";
import { asNumberValue, asRecord, asString, isHighLoad, readOnboardingGroup } from "./profileHelpers.ts";

/** FINAL Layer 4 thresholds. */
const REBUILDER_MAX = 2.5;
const STABILIZER_MAX = 3.2;
const BUILDER_MAX = 4.0;

function resolvePrimaryMode(
  results: Record<string, unknown>,
  stateSignals: Record<string, unknown>,
): CoachingModeSlug {
  const stability = asNumberValue(results.stability_score);
  const performance = asNumberValue(results.performance_score);
  const nervous = asString(stateSignals.nervous_system_state, "").toLowerCase();
  const depletedOrShutDown =
    nervous === "depleted" ||
    nervous === "shut_down" ||
    nervous === "shutdown" ||
    nervous === "flat";

  if (
    (Number.isFinite(stability) && (stability as number) < REBUILDER_MAX) ||
    depletedOrShutDown
  ) {
    return "rebuilder";
  }

  if (
    Number.isFinite(stability) &&
    Number.isFinite(performance) &&
    (stability as number) > BUILDER_MAX &&
    (performance as number) > BUILDER_MAX
  ) {
    return "optimizer";
  }

  if (Number.isFinite(stability) && (stability as number) < STABILIZER_MAX) {
    return "stabilizer";
  }

  // Stability 3.2–4.0, or >4.0 without performance >4.0
  return "builder";
}

/**
 * Classification-engine mode resolution (FINAL Prompt Library Layer 4):
 * - One primary from stability/performance (never last-wins from stored mode lists)
 * - Protector STACKS as overlay when recovery/grief (does not replace primary)
 * - Simplifier STACKS as overlay when cognitive load is high (never primary from low performance)
 */
export function resolveCoachingModes(profile: ProfileData): ResolvedCoachingModes {
  const results = asRecord(profile.results);
  const onboardingData = asRecord(profile.onboardingData);
  const loadSignals = readOnboardingGroup(onboardingData, "loadSignals");
  const stateSignals = readOnboardingGroup(onboardingData, "stateSignals");

  const recovery = results.recovery_mode_active === true;
  const grief = results.grief_mode_active === true;
  const cognitive = asString(loadSignals.cognitive_load_signal, "");

  const primary = resolvePrimaryMode(results, stateSignals);

  const overlays: CoachingModeSlug[] = [];
  if (recovery || grief) {
    overlays.push("protector");
  }
  if (isHighLoad(cognitive)) {
    overlays.push("simplifier");
  }

  return {
    primary,
    overlays,
    active: [primary, ...overlays],
  };
}
