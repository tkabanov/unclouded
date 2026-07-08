import { calculateUserAiCoachingMode } from "./calculateUserAiCoachingMode";
import { calculateUserAlignment } from "./calculateUserAlignment";
import { calculateUserBehavioralFingerprint } from "./calculateUserBehavioralFingerprint";
import { calculateUserClassification } from "./calculateUserClassification";
import { calculateUserPerformance } from "./calculateUserPerformance";
import { calculateUserPressureProfile } from "./calculateUserPressureProfile";
import { calculateUserStability } from "./calculateUserStability";

/**
 * Runs stability → alignment → performance pillar calculators.
 * Mirrors ScheduleAPIEvent chain on bTGNJ workflows bTHVC / bTHja / bTHgY.
 */
export async function runPillarScoreCalculators(userId: string): Promise<void> {
  await calculateUserStability(userId);
  await calculateUserAlignment(userId);
  await calculateUserPerformance(userId);
}

/**
 * Full onboarding profile pipeline after AUTH-05 save:
 * pillar scores → classification → pressure profile → behavioral fingerprint → AI coaching modes.
 */
export async function runOnboardingProfilePipeline(userId: string): Promise<void> {
  await runPillarScoreCalculators(userId);
  await calculateUserClassification(userId);
  await calculateUserPressureProfile(userId);
  await calculateUserBehavioralFingerprint(userId);
  await calculateUserAiCoachingMode(userId);
}
