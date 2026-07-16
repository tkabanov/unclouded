import type { CoachingModeSlug, ProfileData, ResolvedCoachingModes } from "./types.ts";
import { asNumberValue, asRecord, asString, isHighLoad, readOnboardingGroup } from "./profileHelpers.ts";

const SCORE_LOW = 3.2;
const SCORE_HIGH = 3.8;

function resolvePrimaryMode(
  results: Record<string, unknown>,
  loadSignals: Record<string, unknown>,
  stateSignals: Record<string, unknown>,
): CoachingModeSlug {
  const stability = asNumberValue(results.stability_score);
  const alignment = asNumberValue(results.alignment_score);
  const performance = asNumberValue(results.performance_score);
  const nervous = asString(stateSignals.nervous_system_state, "").toLowerCase();
  const depletedOrShutDown = nervous === "depleted" || nervous === "shut_down";

  if (
    (Number.isFinite(stability) && (stability as number) < SCORE_LOW) ||
    depletedOrShutDown
  ) {
    return "stabilizer";
  }
  if (Number.isFinite(alignment) && (alignment as number) < SCORE_LOW) {
    return "rebuilder";
  }
  if (Number.isFinite(performance) && (performance as number) < SCORE_LOW) {
    return "simplifier";
  }
  if (
    Number.isFinite(stability) &&
    Number.isFinite(alignment) &&
    Number.isFinite(performance) &&
    (stability as number) >= SCORE_HIGH &&
    (alignment as number) >= SCORE_HIGH &&
    (performance as number) >= SCORE_HIGH
  ) {
    return "strategist";
  }
  return "stabilizer";
}

/**
 * Classification-engine mode resolution (Developer FAQ + Build Brief):
 * - One primary from scores (never last-wins from stored mode lists)
 * - Protector STACKS as overlay when recovery/grief (does not replace primary)
 * - Simplifier STACKS as overlay when cognitive load is high (if not already primary)
 */
export function resolveCoachingModes(profile: ProfileData): ResolvedCoachingModes {
  const results = asRecord(profile.results);
  const onboardingData = asRecord(profile.onboardingData);
  const loadSignals = readOnboardingGroup(onboardingData, "loadSignals");
  const stateSignals = readOnboardingGroup(onboardingData, "stateSignals");

  const recovery = results.recovery_mode_active === true;
  const grief = results.grief_mode_active === true;
  const cognitive = asString(loadSignals.cognitive_load_signal, "");

  const primary = resolvePrimaryMode(results, loadSignals, stateSignals);

  const overlays: CoachingModeSlug[] = [];
  if (recovery || grief) {
    overlays.push("protector");
  }
  if (isHighLoad(cognitive) && primary !== "simplifier") {
    overlays.push("simplifier");
  }

  return {
    primary,
    overlays,
    active: [primary, ...overlays],
  };
}
