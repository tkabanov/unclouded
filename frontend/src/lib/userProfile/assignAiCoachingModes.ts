import {
  AI_COACHING_MODE,
  type AiCoachingModeSlug,
} from "@/lib/enums/coachingMode";
import { getLoadSignalAnswerMeta } from "@/lib/enums/onboardingQuestions";

/** FINAL Layer 4 thresholds. */
const REBUILDER_MAX = 2.5;
const STABILIZER_MAX = 3.2;
const BUILDER_MAX = 4.0;

export interface AiCoachingModeInput {
  stability_score: number;
  alignment_score: number;
  performance_score: number;
  recovery_mode_active: boolean;
  grief_mode_active: boolean;
  cognitive_load_signal_slug?: string | null;
}

function resolvePrimaryMode(input: AiCoachingModeInput): AiCoachingModeSlug {
  if (input.stability_score < REBUILDER_MAX) {
    return AI_COACHING_MODE.REBUILDER;
  }
  if (
    input.stability_score > BUILDER_MAX &&
    input.performance_score > BUILDER_MAX
  ) {
    return AI_COACHING_MODE.OPTIMIZER;
  }
  if (input.stability_score < STABILIZER_MAX) {
    return AI_COACHING_MODE.STABILIZER;
  }
  return AI_COACHING_MODE.BUILDER;
}

/**
 * FINAL Layer 4 mode assignment (aligned with chat resolveCoachingModes).
 * Protector / Simplifier stack as overlays — do not replace primary.
 */
export function resolveAiCoachingModes(input: AiCoachingModeInput): AiCoachingModeSlug[] {
  const primary = resolvePrimaryMode(input);
  const modes: AiCoachingModeSlug[] = [primary];

  if (input.recovery_mode_active || input.grief_mode_active) {
    modes.push(AI_COACHING_MODE.PROTECTOR);
  }

  const cognitiveSlug = input.cognitive_load_signal_slug;
  if (cognitiveSlug) {
    const meta = getLoadSignalAnswerMeta(cognitiveSlug);
    if (meta?.intensity === "high" && !modes.includes(AI_COACHING_MODE.SIMPLIFIER)) {
      modes.push(AI_COACHING_MODE.SIMPLIFIER);
    }
  }

  return modes;
}
