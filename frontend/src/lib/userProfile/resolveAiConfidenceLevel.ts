import {
  AI_CONFIDENCE_LEVEL,
  type AiConfidenceLevelSlug,
} from "@/lib/enums/coachingMode";

/** Bubble DatabaseTriggerEvent bTIFU range_contains_point parity. */
export function computeAiConfidenceLevel(
  modulesCompletedCount: number,
): AiConfidenceLevelSlug {
  if (modulesCompletedCount <= 0) return AI_CONFIDENCE_LEVEL.EXPLORATORY;
  if (modulesCompletedCount <= 2) return AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS;
  if (modulesCompletedCount <= 5) return AI_CONFIDENCE_LEVEL.GUIDED;
  return AI_CONFIDENCE_LEVEL.DIRECT;
}
