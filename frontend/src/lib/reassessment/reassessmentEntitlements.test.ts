import { describe, expect, it } from "vitest";
import { TIER } from "@/lib/enums/tier";
import {
  canAccessReassessment,
  canShowPremiumOnDemandLocked,
  canShowReassessNow,
  daysUntilPremiumOnDemand,
  hasPremiumOnDemandFeature,
  isReassessmentDue,
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
