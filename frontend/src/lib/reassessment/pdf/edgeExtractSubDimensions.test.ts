import { describe, expect, it } from "vitest";
import { extractSubDimensions } from "../../../../../supabase/functions/generate-pup-pdf/extractSubDimensions.ts";

describe("edge extractSubDimensions", () => {
  it("matches client extraction for reassessment rawScores shape", () => {
    const groups = extractSubDimensions({
      stabilityScores: { q1: 1, q5: 5 },
      performanceScores: { q3: 3.2 },
    });
    expect(groups.map((g) => g.pillar)).toEqual(["Stability", "Performance"]);
    expect(groups[0]?.questions).toEqual([
      { label: "Q1", score: 1 },
      { label: "Q5", score: 5 },
    ]);
  });
});
