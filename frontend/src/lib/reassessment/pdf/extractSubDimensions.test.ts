import { describe, expect, it } from "vitest";
import {
  extractSubDimensions,
  sanitizeSubDimensions,
} from "@/lib/reassessment/pdf/extractSubDimensions";

describe("extractSubDimensions", () => {
  it("returns empty for missing raw scores", () => {
    expect(extractSubDimensions(null)).toEqual([]);
    expect(extractSubDimensions({})).toEqual([]);
  });

  it("maps pillar question maps into labeled groups", () => {
    const groups = extractSubDimensions({
      stabilityScores: { q1: 3, q2: 4, stability_score: 3.5 },
      performanceScores: { q1: 2.5 },
      alignmentScores: {},
    });
    expect(groups).toHaveLength(2);
    expect(groups[0]?.pillar).toBe("Stability");
    expect(groups[0]?.questions.map((q) => q.label)).toEqual(["Q1", "Q2"]);
    expect(groups[1]?.pillar).toBe("Performance");
  });

  it("sanitizes edge payload labels and drops aggregates", () => {
    const cleaned = sanitizeSubDimensions([
      {
        pillar: "Stability",
        questions: [
          { label: "sq1", score: 5 },
          { label: "stability_score", score: 4 },
          { label: "sq2", score: 3 },
        ],
      },
      {
        pillar: "Performance",
        questions: [{ label: "performance_score", score: 4.4 }],
      },
    ]);
    expect(cleaned).toEqual([
      {
        pillar: "Stability",
        questions: [
          { label: "Q1", score: 5 },
          { label: "Q2", score: 3 },
        ],
      },
    ]);
  });
});
