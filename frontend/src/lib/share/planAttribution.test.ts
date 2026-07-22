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

  it("normalizes founding plan values", () => {
    expect(normalizeSignupPlan("FOUNDING")).toBe(FOUNDING_SIGNUP_PLAN);
  });

  it("rejects unknown plan values", () => {
    expect(normalizeSignupPlan("pro")).toBeNull();
    expect(normalizeSignupPlan("")).toBeNull();
  });

  it("reads plan from search params", () => {
    expect(readPlanFromSearch("?plan=founding&ref=K8234V9B")).toBe(FOUNDING_SIGNUP_PLAN);
  });

  it("persists pending founding plan for signup", () => {
    capturePlanFromSearch("?plan=founding");
    expect(peekPendingSignupPlan()).toBe(FOUNDING_SIGNUP_PLAN);
  });

  it("builds signup auth metadata", () => {
    expect(buildSignupPlanMetadata(FOUNDING_SIGNUP_PLAN)).toEqual({
      [SIGNUP_PLAN_AUTH_METADATA_KEY]: FOUNDING_SIGNUP_PLAN,
    });
    expect(buildSignupPlanMetadata(null)).toBeUndefined();
  });
});
