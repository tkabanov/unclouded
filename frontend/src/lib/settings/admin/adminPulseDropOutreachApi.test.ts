import { describe, expect, it } from "vitest";

import {
  coerceFiniteNumber,
  computePulseDropPoints,
  formatPulseDropSummary,
  mapPulseDropOutreachCandidate,
} from "./adminPulseDropOutreachApi";

describe("adminPulseDropOutreachApi", () => {
  it("computes drop points when latest pulse is below baseline", () => {
    expect(computePulseDropPoints(7.5, 4)).toBe(3.5);
    expect(computePulseDropPoints(6, 6)).toBe(0);
    expect(computePulseDropPoints(null, 4)).toBeNull();
  });

  it("coerces numeric strings from PostgREST", () => {
    expect(coerceFiniteNumber("5.71")).toBe(5.71);
    expect(coerceFiniteNumber(null)).toBeNull();
  });

  it("maps profile + latest check-in when pulseBaseline is a numeric string", () => {
    const candidate = mapPulseDropOutreachCandidate(
      {
        id: "user-2",
        firstName: "Alex",
        email: "req04-absence@test.com",
        pulseBaseline: "6" as unknown as number,
        significantPulseDrop: true,
        updatedAt: "2026-07-21T12:20:46.000Z",
        results: { grief_mode_active: false, recovery_mode_active: false },
      },
      { userId: "user-2", mood: 2, date: "2026-07-21T12:20:45.000Z" },
    );

    expect(candidate.pulseBaseline).toBe(6);
    expect(candidate.latestPulse).toBe(2);
    expect(candidate.pulseDropPoints).toBe(4);
    expect(formatPulseDropSummary(candidate.pulseBaseline, candidate.latestPulse)).toBe(
      "2 (−4 from 6)",
    );
  });

  it("maps profile + latest check-in into outreach candidate", () => {
    const candidate = mapPulseDropOutreachCandidate(
      {
        id: "user-1",
        firstName: "Sam",
        email: "sam@example.com",
        pulseBaseline: 7,
        significantPulseDrop: true,
        updatedAt: "2026-07-20T10:00:00.000Z",
        results: { grief_mode_active: true },
      },
      { userId: "user-1", mood: 3, date: "2026-07-20T09:00:00.000Z" },
    );

    expect(candidate.userId).toBe("user-1");
    expect(candidate.pulseDropPoints).toBe(4);
    expect(candidate.griefModeActive).toBe(true);
    expect(candidate.recoveryModeActive).toBe(false);
  });

  it("formats pulse drop summary for admin table", () => {
    expect(formatPulseDropSummary(7, 4)).toBe("4 (−3 from 7)");
    expect(formatPulseDropSummary(null, null)).toBe("—");
  });
});
