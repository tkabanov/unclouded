import { describe, expect, it } from "vitest";
import {
  buildWeeklyPulseTrend,
  buildWeeklySessionsPerActiveUserTrend,
  computePathEngagementPercent,
  recentWeekStarts,
  startOfWeekUtc,
} from "./employerMetricsHelpers";

describe("employerMetricsHelpers", () => {
  it("uses Monday as week start", () => {
    expect(startOfWeekUtc(new Date("2026-07-15T12:00:00.000Z"))).toBe("2026-07-13");
  });

  it("builds anonymized weekly pulse averages", () => {
    const points = buildWeeklyPulseTrend(
      [
        { date: "2026-07-14", mood: 4 },
        { date: "2026-07-15", mood: 6 },
        { date: "2026-07-21", mood: 8 },
      ],
      2,
      new Date("2026-07-22T12:00:00.000Z"),
    );

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(5);
    expect(points[1].value).toBe(8);
  });

  it("computes sessions per active user for each week", () => {
    const points = buildWeeklySessionsPerActiveUserTrend(
      [
        { userId: "u1", createdAt: "2026-07-14T10:00:00.000Z" },
        { userId: "u1", createdAt: "2026-07-15T10:00:00.000Z" },
        { userId: "u2", createdAt: "2026-07-15T11:00:00.000Z" },
        { userId: "u3", createdAt: "2026-07-21T10:00:00.000Z" },
      ],
      2,
      new Date("2026-07-22T12:00:00.000Z"),
    );

    expect(points[0].value).toBe(1.5);
    expect(points[1].value).toBe(1);
  });

  it("computes path engagement percent from active enrollments", () => {
    expect(
      computePathEngagementPercent(
        [
          { userId: "u1", status: "active" },
          { userId: "u1", status: "completed" },
          { userId: "u2", status: "paused" },
          { userId: "u3", status: "active" },
        ],
        5,
      ),
    ).toBe(40);
  });

  it("returns eight recent week starts by default", () => {
    expect(recentWeekStarts(8, new Date("2026-07-22T12:00:00.000Z"))).toHaveLength(8);
  });
});
