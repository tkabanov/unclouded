import {
  AI_CONFIDENCE_LEVEL,
  AI_CONFIDENCE_LEVEL_RANGES,
  type AiConfidenceLevelSlug,
} from "@/lib/enums/coachingMode";

/** Bubble DatabaseTriggerEvent bTIFU range_contains_point parity. */
export function computeAiConfidenceLevel(
  modulesCompletedCount: number,
): AiConfidenceLevelSlug {
  const match = AI_CONFIDENCE_LEVEL_RANGES.find(
    (range) =>
      modulesCompletedCount >= range.min && modulesCompletedCount <= range.max,
  );
  return match?.slug ?? AI_CONFIDENCE_LEVEL.DIRECT;
}
