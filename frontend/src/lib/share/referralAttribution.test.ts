import { beforeEach, describe, expect, it } from "vitest";

import {
  REFERRAL_CODE_AUTH_METADATA_KEY,
  buildSignupReferralMetadata,
  captureReferralFromSearch,
  clearPendingReferralCode,
  normalizeInboundReferralCode,
  peekPendingReferralCode,
  readReferralCodeFromSearch,
} from "./referralAttribution";

describe("referralAttribution", () => {
  beforeEach(() => {
    clearPendingReferralCode();
  });

  it("normalizes referral codes to uppercase", () => {
    expect(normalizeInboundReferralCode("k8234v9b")).toBe("K8234V9B");
  });

  it("rejects malformed referral codes", () => {
    expect(normalizeInboundReferralCode("bad code!")).toBeNull();
    expect(normalizeInboundReferralCode("")).toBeNull();
  });

  it("reads ref from search params", () => {
    expect(readReferralCodeFromSearch("?ref=K8234V9B&plan=founding")).toBe("K8234V9B");
  });

  it("persists pending referral for signup", () => {
    captureReferralFromSearch("?ref=K8234V9B");
    expect(peekPendingReferralCode()).toBe("K8234V9B");
  });

  it("builds signup auth metadata", () => {
    expect(buildSignupReferralMetadata("K8234V9B")).toEqual({
      [REFERRAL_CODE_AUTH_METADATA_KEY]: "K8234V9B",
    });
    expect(buildSignupReferralMetadata(null)).toBeUndefined();
  });
});
