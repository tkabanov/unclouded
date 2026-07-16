import { describe, expect, it } from "vitest";
import { classifications, type ResultsData } from "@/lib/classification";
import { computeTrajectoryType, TRAJECTORY_TYPE } from "@/lib/reassessment/trajectory";

function base(overrides: Partial<ResultsData> = {}): ResultsData {
  return {
    stability_score: 3,
    performance_score: 3,
    alignment_score: 3,
    orientation_score: 3,
    pressure_profile: "Sustainable Load",
    tradeoff_statement: "test",
    classification: classifications.building_momentum,
    recovery_mode_active: false,
    grief_mode_active: false,
    trauma_informed_mode: false,
    first_module: "Hard Seasons",
    module_days: 42,
    ...overrides,
  };
}

describe("computeTrajectoryType", () => {
  it("returns across-the-board growth when all three rise", () => {
    expect(
      computeTrajectoryType(
        base(),
        base({ stability_score: 3.5, performance_score: 3.5, alignment_score: 3.5 }),
      ),
    ).toBe(TRAJECTORY_TYPE.ACROSS_THE_BOARD_GROWTH);
  });

  it("returns holding steady when deltas are small", () => {
    expect(
      computeTrajectoryType(
        base(),
        base({ stability_score: 3.1, performance_score: 2.9, alignment_score: 3.05 }),
      ),
    ).toBe(TRAJECTORY_TYPE.HOLDING_STEADY);
  });

  it("returns navigating difficulty when scores decline", () => {
    expect(
      computeTrajectoryType(
        base(),
        base({ stability_score: 2.5, performance_score: 2.6, alignment_score: 2.7 }),
      ),
    ).toBe(TRAJECTORY_TYPE.NAVIGATING_DIFFICULTY);
  });

  it("returns stabilizing when stability leads", () => {
    expect(
      computeTrajectoryType(base(), base({ stability_score: 3.8 })),
    ).toBe(TRAJECTORY_TYPE.STABILIZING);
  });

  it("returns rebuilding when alignment leads", () => {
    expect(
      computeTrajectoryType(base(), base({ alignment_score: 3.8 })),
    ).toBe(TRAJECTORY_TYPE.REBUILDING);
  });

  it("returns gaining momentum when performance leads", () => {
    expect(
      computeTrajectoryType(base(), base({ performance_score: 3.8 })),
    ).toBe(TRAJECTORY_TYPE.GAINING_MOMENTUM);
  });

  it("returns mixed movement when dimensions diverge", () => {
    expect(
      computeTrajectoryType(
        base(),
        base({ stability_score: 3.6, performance_score: 2.4 }),
      ),
    ).toBe(TRAJECTORY_TYPE.MIXED_MOVEMENT);
  });
});
