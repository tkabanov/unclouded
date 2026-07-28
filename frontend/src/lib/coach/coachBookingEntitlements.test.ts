import { describe, expect, it } from "vitest";
import { TIER } from "@/lib/enums/tier";
import {
  canAccessHumanCoachingCard,
  canBookGroupCoachSession,
  canBookHumanCoach,
  resolveOneOnOneButtonState,
  shouldShowHumanCoachingCard,
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

describe("shouldShowHumanCoachingCard", () => {
  it("shows entry points for every tier (Free uses upsell on click)", () => {
    expect(shouldShowHumanCoachingCard(TIER.FREE)).toBe(true);
    expect(shouldShowHumanCoachingCard(TIER.PRO)).toBe(true);
    expect(shouldShowHumanCoachingCard(TIER.PREMIUM)).toBe(true);
    expect(canAccessHumanCoachingCard(TIER.FREE)).toBe(true);
  });
});

describe("resolveOneOnOneButtonState", () => {
  it("offers the booking when Premium has enough credits", () => {
    const state = resolveOneOnOneButtonState({
      effectiveTier: TIER.PREMIUM,
      creditBalance: 2,
    });

    expect(state.kind).toBe("bookable");
    expect(state.label).toBe("Book a 1:1 Session");
    expect(state.helper).toBe("Two credits will be used after your booking is confirmed.");
  });

  it("warns that credits expire while a cancellation is scheduled", () => {
    const state = resolveOneOnOneButtonState({
      effectiveTier: TIER.PREMIUM,
      creditBalance: 4,
      creditsExpireAtLabel: "August 26, 2026",
    });

    expect(state.kind).toBe("bookable");
    expect(state.helper).toContain("August 26, 2026");
  });

  it("blocks the booking below the two-credit cost", () => {
    const state = resolveOneOnOneButtonState({
      effectiveTier: TIER.PREMIUM,
      creditBalance: 1,
    });

    expect(state.kind).toBe("insufficientCredits");
    expect(state.helper).toBe(
      "You currently have 1 credit. Two credits are required to book one 30-minute 1:1 session.",
    );
  });

  it("explains that leftover credits died with the subscription", () => {
    const state = resolveOneOnOneButtonState({ effectiveTier: TIER.PRO, creditBalance: 3 });

    expect(state.kind).toBe("creditsUnavailable");
    expect(state.helper).toContain("no longer available");
  });

  it("upsells Premium when the user never had credits", () => {
    const state = resolveOneOnOneButtonState({ effectiveTier: TIER.FREE, creditBalance: 0 });

    expect(state.kind).toBe("locked");
    expect(state.label).toBe("Unlock 1:1 Sessions");
  });
});
