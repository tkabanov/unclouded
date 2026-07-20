import { describe, expect, it } from "vitest";
import {
  buildDailyTeamPulseTrend,
  classifyStabilityBand,
  computeAverageSessionEngagement,
  computeStabilityBandPercentages,
  recentDayKeys,
} from "./managerAggregateHelpers";

describe("managerAggregateHelpers", () => {
  it("classifies stability bands without classification names", () => {
    expect(classifyStabilityBand(2.4)).toBe("low");
    expect(classifyStabilityBand(2.5)).toBe("moderate");
    expect(classifyStabilityBand(3.9)).toBe("moderate");
    expect(classifyStabilityBand(4)).toBe("high");
  });

  it("computes band percentages for opted-in cohort scores", () => {
    expect(computeStabilityBandPercentages([2, 2.5, 3.5, 4.2])).toEqual({
      low: 25,
      moderate: 50,
      high: 25,
    });
  });

  it("builds daily team pulse averages over 30 days", () => {
    const points = buildDailyTeamPulseTrend(
      [
        { date: "2026-07-19", mood: 4 },
        { date: "2026-07-19", mood: 6 },
        { date: "2026-07-20", mood: 8 },
      ],
      3,
      new Date("2026-07-20T12:00:00.000Z"),
    );

    expect(points).toHaveLength(3);
    expect(points[1].value).toBe(5);
    expect(points[2].value).toBe(8);
  });

  it("computes average session engagement per opted-in member", () => {
    expect(
      computeAverageSessionEngagement(
        [
          { userId: "u1", createdAt: "2026-07-15T10:00:00.000Z" },
          { userId: "u1", createdAt: "2026-07-16T10:00:00.000Z" },
          { userId: "u2", createdAt: "2026-06-01T10:00:00.000Z" },
        ],
        5,
        "2026-07-01T00:00:00.000Z",
      ),
    ).toBe(0.4);
  });

  it("returns consecutive day keys ending today", () => {
    expect(recentDayKeys(3, new Date("2026-07-20T12:00:00.000Z"))).toEqual([
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
    ]);
  });
});
