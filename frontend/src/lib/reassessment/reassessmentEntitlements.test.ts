import { describe, expect, it } from "vitest";
import { TIER } from "@/lib/enums/tier";
import {
  canAccessReassessment,
  canShowPremiumOnDemandLocked,
  canShowReassessNow,
  daysUntilPremiumOnDemand,
  hasPremiumOnDemandFeature,
  isReassessmentDue,
  resolveReassessmentCtaState,
  THIRTY_DAYS_MS,
} from "@/lib/reassessment/reassessmentEntitlements";
import { NINETY_DAYS_MS } from "@/lib/reassessment";

const day0 = "2026-01-01T00:00:00.000Z";
const day0Ms = new Date(day0).getTime();
const next90 = new Date(day0Ms + NINETY_DAYS_MS).toISOString();

describe("reassessmentEntitlements", () => {
  it("denies Free tier", () => {
    expect(
      canAccessReassessment({
        tier: TIER.FREE,
        lastAssessmentDate: day0,
        nextReassessmentDate: next90,
      }),
    ).toBe(false);
  });

  it("allows Pro only when due", () => {
    expect(
      canAccessReassessment(
        { tier: TIER.PRO, lastAssessmentDate: day0, nextReassessmentDate: next90 },
        day0Ms + NINETY_DAYS_MS - 1000,
      ),
    ).toBe(false);
    expect(
      canAccessReassessment(
        { tier: TIER.PRO, lastAssessmentDate: day0, nextReassessmentDate: next90 },
        day0Ms + NINETY_DAYS_MS + 1000,
      ),
    ).toBe(true);
  });

  it("allows Premium after day 30 on-demand when feature unlocked", () => {
    const premiumCtx = {
      tier: TIER.PREMIUM,
      lastAssessmentDate: day0,
      nextReassessmentDate: next90,
      canReassessOnDemand: true,
    };
    expect(canAccessReassessment(premiumCtx, day0Ms + THIRTY_DAYS_MS + 1000)).toBe(true);
    expect(canShowReassessNow(premiumCtx, day0Ms + THIRTY_DAYS_MS + 1000)).toBe(true);
  });

  it("unlocks Premium on-demand via reassessmentCompletedAt when flag is stale", () => {
    const premiumCtx = {
      tier: TIER.PREMIUM,
      lastAssessmentDate: day0,
      nextReassessmentDate: next90,
      canReassessOnDemand: false,
      reassessmentCompletedAt: day0,
    };
    expect(hasPremiumOnDemandFeature(premiumCtx)).toBe(true);
    expect(canShowPremiumOnDemandLocked(premiumCtx, day0Ms + 1000)).toBe(true);
    expect(daysUntilPremiumOnDemand(premiumCtx, day0Ms + 1000)).toBeGreaterThan(0);
    expect(canShowReassessNow(premiumCtx, day0Ms + THIRTY_DAYS_MS + 1000)).toBe(true);
  });

  it("marks due when next date reached", () => {
    expect(
      isReassessmentDue(
        { tier: TIER.PRO, lastAssessmentDate: day0, nextReassessmentDate: next90 },
        day0Ms + NINETY_DAYS_MS + 1,
      ),
    ).toBe(true);
  });
});

describe("resolveReassessmentCtaState", () => {
  it("prompts free users to upgrade", () => {
    expect(
      resolveReassessmentCtaState({
        tier: TIER.FREE,
        lastAssessmentDate: day0,
        nextReassessmentDate: next90,
      }).kind,
    ).toBe("upgrade");
  });

  it("locks Pro users until the 90-day date", () => {
    const state = resolveReassessmentCtaState(
      { tier: TIER.PRO, lastAssessmentDate: day0, nextReassessmentDate: next90 },
      day0Ms + 1000,
    );
    expect(state).toEqual({ kind: "locked", cycleDays: 90, daysRemaining: expect.any(Number) });
  });

  it("uses 30-day copy for premium on-demand waiting period", () => {
    const state = resolveReassessmentCtaState(
      {
        tier: TIER.PREMIUM,
        lastAssessmentDate: day0,
        nextReassessmentDate: next90,
        canReassessOnDemand: true,
      },
      day0Ms + 1000,
    );
    expect(state).toEqual({ kind: "locked", cycleDays: 30, daysRemaining: expect.any(Number) });
  });

  it("opens reassessment when due", () => {
    expect(
      resolveReassessmentCtaState(
        { tier: TIER.PRO, lastAssessmentDate: day0, nextReassessmentDate: next90 },
        day0Ms + NINETY_DAYS_MS + 1000,
      ),
    ).toEqual({ kind: "available", label: "Start reassessment" });
  });
});
