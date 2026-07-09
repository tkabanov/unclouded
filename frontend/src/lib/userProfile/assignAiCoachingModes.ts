import {
  AI_COACHING_MODE,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { getLoadSignalAnswerMeta } from "@/lib/enums/onboardingQuestions";

const SCORE_LOW_THRESHOLD = 3.2;
const SCORE_HIGH_THRESHOLD = 3.8;

export interface AiCoachingModeInput {
  stability_score: number;
  alignment_score: number;
  performance_score: number;
  recovery_mode_active: boolean;
  grief_mode_active: boolean;
  cognitive_load_signal_slug?: string | null;
}

/** Bubble API event calculate_user_ai_coaching_mode (bTIEN) — seven-action ChangeThing chain. */
export function resolveAiCoachingModes(input: AiCoachingModeInput): AiCoachingModeSlug[] {
  let modes: AiCoachingModeSlug[] = [AI_COACHING_MODE.STABILIZER];

  if (input.alignment_score < SCORE_LOW_THRESHOLD) {
    modes = [AI_COACHING_MODE.REBUILDER];
  }
  if (input.stability_score < SCORE_LOW_THRESHOLD) {
    modes = [AI_COACHING_MODE.STABILIZER];
  }
  if (input.performance_score < SCORE_LOW_THRESHOLD) {
    modes = [AI_COACHING_MODE.SIMPLIFIER];
  }
  if (
    input.stability_score >= SCORE_HIGH_THRESHOLD &&
    input.alignment_score >= SCORE_HIGH_THRESHOLD &&
    input.performance_score >= SCORE_HIGH_THRESHOLD
  ) {
    modes = [AI_COACHING_MODE.STRATEGIST];
  }
  if (input.recovery_mode_active || input.grief_mode_active) {
    modes = [AI_COACHING_MODE.PROTECTOR];
  }

  const cognitiveSlug = input.cognitive_load_signal_slug;
  if (cognitiveSlug) {
    const meta = getLoadSignalAnswerMeta(cognitiveSlug);
    if (meta?.intensity === "high" && !modes.includes(AI_COACHING_MODE.SIMPLIFIER)) {
      modes = [...modes, AI_COACHING_MODE.SIMPLIFIER];
    }
  }

  return modes;
}
