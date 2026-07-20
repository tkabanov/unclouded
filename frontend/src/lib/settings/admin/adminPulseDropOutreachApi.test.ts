import { describe, expect, it } from "vitest";

import {
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
