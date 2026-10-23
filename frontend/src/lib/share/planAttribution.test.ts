import { beforeEach, describe, expect, it } from "vitest";

import {
  FOUNDING_SIGNUP_PLAN,
  SIGNUP_PLAN_AUTH_METADATA_KEY,
  buildSignupPlanMetadata,
  capturePlanFromSearch,
  clearPendingSignupPlan,
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
});
