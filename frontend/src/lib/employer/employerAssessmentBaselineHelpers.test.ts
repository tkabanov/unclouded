import { describe, expect, it } from "vitest";

import {
  computeEmployerAssessmentBaseline,
  EMPLOYER_CLASSIFICATION_SMALL_CELL_MIN,
} from "../../../../supabase/functions/_shared/employerAssessmentBaselineHelpers.ts";

describe("employerAssessmentBaselineHelpers", () => {
  it("aggregates stability bands and score means", () => {
    const baseline = computeEmployerAssessmentBaseline([
      {
        classification: "Building Momentum",
        stabilityScore: 4.2,
        performanceScore: 3.8,
        alignmentScore: 4.0,
        results: { classification: { key: "building_momentum" } },
      },
      {
        classification: "Capacity Erosion",
        stabilityScore: 2.1,
        performanceScore: 3.0,
        alignmentScore: 2.5,
        results: { classification: { key: "capacity_erosion" } },
      },
    ]);

    expect(baseline.avgStability).toBe(3.15);
    expect(baseline.stabilityBands?.high).toBeGreaterThan(0);
    expect(baseline.classificationDistribution).toHaveLength(2);
  });

  it("suppresses classification buckets below the small-cell minimum", () => {
    const baseline = computeEmployerAssessmentBaseline([
      {
        results: { classification: { key: "building_momentum" } },
      },
      {
        results: { classification: { key: "capacity_erosion" } },
      },
      {
        results: { classification: { key: "optimization_ready" } },
      },
    ]);

    const loneBucket = baseline.classificationDistribution.find((row) => row.count === 1);
    expect(loneBucket?.suppressed).toBe(true);
    expect(EMPLOYER_CLASSIFICATION_SMALL_CELL_MIN).toBe(2);
    expect(baseline.hasSuppressedClassificationCells).toBe(true);
  });
});
