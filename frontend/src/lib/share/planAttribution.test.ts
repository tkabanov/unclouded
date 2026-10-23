import { beforeEach, describe, expect, it } from "vitest";

import {
  FOUNDING_SIGNUP_PLAN,
  SIGNUP_PLAN_AUTH_METADATA_KEY,
  buildSignupPlanMetadata,
  capturePlanFromSearch,
  clearPendingSignupPlan,
  isFoundingEligible,
  normalizeSignupPlan,
  peekPendingSignupPlan,
  readPlanFromSearch,
} from "./planAttribution";

describe("planAttribution", () => {
  beforeEach(() => {
    clearPendingSignupPlan();
  });

  it("ignores the closed founding campaign link (OVR-079)", () => {
    expect(normalizeSignupPlan("FOUNDING")).toBeNull();
    expect(normalizeSignupPlan("pro")).toBeNull();
    expect(readPlanFromSearch("?plan=founding&ref=K8234V9B")).toBeNull();
    capturePlanFromSearch("?plan=founding");
    expect(peekPendingSignupPlan()).toBeNull();
  });

  it("builds signup auth metadata", () => {
    expect(buildSignupPlanMetadata(FOUNDING_SIGNUP_PLAN)).toEqual({
      [SIGNUP_PLAN_AUTH_METADATA_KEY]: FOUNDING_SIGNUP_PLAN,
    });
    expect(buildSignupPlanMetadata(null)).toBeUndefined();
  });

  it("isFoundingEligible only for already-enrolled members", () => {
    expect(isFoundingEligible({ isFoundingMember: true })).toBe(true);
    expect(isFoundingEligible({ signupPlan: "founding" })).toBe(false);
    expect(isFoundingEligible({ signupPlan: "pro", isFoundingMember: false })).toBe(false);
  });

  it("isFoundingEligible keeps enrolled members and blocks forfeited ones", () => {
    expect(
      isFoundingEligible({
        signupPlan: "founding",
        foundingDiscountForfeitedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isFoundingEligible({
        isFoundingMember: true,
        foundingDiscountForfeitedAt: "2026-08-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });
});
