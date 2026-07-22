import { describe, expect, it } from "vitest";
import { TIER } from "@/lib/enums/tier";
import {
  canAccessHumanCoachingCard,
  canBookGroupCoachSession,
  canBookHumanCoach,
} from "@/lib/coach/coachBookingEntitlements";

describe("canBookHumanCoach", () => {
  it("allows Premium tier only", () => {
    expect(canBookHumanCoach(TIER.PREMIUM)).toBe(true);
    expect(canBookHumanCoach(TIER.PRO)).toBe(false);
    expect(canBookHumanCoach(TIER.FREE)).toBe(false);
  });
});

describe("canBookGroupCoachSession", () => {
  it("allows Pro and Premium", () => {
    expect(canBookGroupCoachSession(TIER.PRO)).toBe(true);
    expect(canBookGroupCoachSession(TIER.PREMIUM)).toBe(true);
    expect(canBookGroupCoachSession(TIER.FREE)).toBe(false);
  });
});

describe("canAccessHumanCoachingCard", () => {
  it("matches Pro+ access", () => {
    expect(canAccessHumanCoachingCard(TIER.PRO)).toBe(true);
    expect(canAccessHumanCoachingCard(TIER.PREMIUM)).toBe(true);
    expect(canAccessHumanCoachingCard(TIER.FREE)).toBe(false);
  });
});
