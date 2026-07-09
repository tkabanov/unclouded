import { describe, expect, it } from "vitest";
import { AI_CONFIDENCE_LEVEL } from "@/lib/enums/coachingMode";
import { computeAiConfidenceLevel } from "./resolveAiConfidenceLevel";

describe("computeAiConfidenceLevel (bTIFU range_contains_point)", () => {
  it.each([
    [0, AI_CONFIDENCE_LEVEL.EXPLORATORY],
    [1, AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS],
    [2, AI_CONFIDENCE_LEVEL.EXPLORATORY_PLUS],
    [3, AI_CONFIDENCE_LEVEL.GUIDED],
    [4, AI_CONFIDENCE_LEVEL.GUIDED],
    [5, AI_CONFIDENCE_LEVEL.DIRECT],
    [6, AI_CONFIDENCE_LEVEL.DIRECT],
    [7, AI_CONFIDENCE_LEVEL.DIRECT],
  ])("modules count %i → %s", (count, expected) => {
    expect(computeAiConfidenceLevel(count)).toBe(expected);
  });
});
