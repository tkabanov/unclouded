import type { CoachingModeSlug, ProfileData, ResolvedCoachingModes } from "./types.ts";
import { asNumberValue, asRecord, asString, isHighLoad, readOnboardingGroup } from "./profileHelpers.ts";

const SCORE_LOW = 3.2;
const SCORE_HIGH = 3.8;

/**
 * Classification-engine mode resolution (Build Brief Part E + FAQ priority):
 * - One primary from scores (never last-wins from stored mode lists)
 * - Protector REPLACES primary when recovery/grief
 * - Simplifier STACKS as overlay when cognitive load is high (if not already primary)
 */
export function resolveCoachingModes(profile: ProfileData): ResolvedCoachingModes {
  const results = asRecord(profile.results);
  const onboardingData = asRecord(profile.onboardingData);
  const loadSignals = readOnboardingGroup(onboardingData, "loadSignals");
  const stateSignals = readOnboardingGroup(onboardingData, "stateSignals");

  const stability = asNumberValue(results.stability_score);
  const alignment = asNumberValue(results.alignment_score);
  const performance = asNumberValue(results.performance_score);
  const recovery = results.recovery_mode_active === true;
  const grief = results.grief_mode_active === true;
  const cognitive = asString(loadSignals.cognitive_load_signal, "");
  const nervous = asString(stateSignals.nervous_system_state, "").toLowerCase();
  const depletedOrShutDown = nervous === "depleted" || nervous === "shut_down";

  let primary: CoachingModeSlug;

  if (recovery || grief) {
    primary = "protector";
  } else if (
    (Number.isFinite(stability) && (stability as number) < SCORE_LOW) ||
    depletedOrShutDown
  ) {
    primary = "stabilizer";
  } else if (Number.isFinite(alignment) && (alignment as number) < SCORE_LOW) {
    primary = "rebuilder";
  } else if (Number.isFinite(performance) && (performance as number) < SCORE_LOW) {
    primary = "simplifier";
  } else if (
    Number.isFinite(stability) &&
    Number.isFinite(alignment) &&
    Number.isFinite(performance) &&
    (stability as number) >= SCORE_HIGH &&
    (alignment as number) >= SCORE_HIGH &&
    (performance as number) >= SCORE_HIGH &&
    nervous === "regulated"
  ) {
    primary = "strategist";
  } else if (
    Number.isFinite(stability) &&
    Number.isFinite(alignment) &&
    Number.isFinite(performance) &&
    (stability as number) >= SCORE_HIGH &&
    (alignment as number) >= SCORE_HIGH &&
    (performance as number) >= SCORE_HIGH
  ) {
    // All scores strong but nervous system not regulated — still growth-capable; Brief prefers regulated for Strategist.
    primary = "strategist";
  } else {
    primary = "stabilizer";
  }

  const overlays: CoachingModeSlug[] = [];
  if (isHighLoad(cognitive) && primary !== "simplifier") {
    overlays.push("simplifier");
  }

  return {
    primary,
    overlays,
    active: [primary, ...overlays],
  };
}
