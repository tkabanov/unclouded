import { describe, expect, it } from "vitest";
import {
  isEnterpriseUser,
  isFreeTierEntitlement,
  resolveUserEntitlement,
} from "@/lib/entitlements/userEntitlement";
import { resolveCurrentTier } from "@/lib/settings/subscriptionApi";

describe("resolveUserEntitlement", () => {
  it("treats enterprise users as subscribed with billing and session bypass", () => {
    const entitlement = resolveUserEntitlement({
      accountType: "enterprise",
      enterpriseTier: "premium",
      subscribed: false,
      tier: "free",
    });

    expect(entitlement).toEqual({
      accountType: "enterprise",
      tier: "premium",
      subscribed: true,
      bypassBilling: true,
      bypassSessionLimit: true,
    });
    expect(isEnterpriseUser(entitlement)).toBe(true);
  });

  it("defaults enterprise tier to pro when enterpriseTier is missing", () => {
    expect(
      resolveUserEntitlement({
        accountType: "enterprise",
        enterpriseTier: null,
        tier: "free",
      }).tier,
    ).toBe("pro");
  });

  it("keeps individual free users on session limits", () => {
    expect(
      isFreeTierEntitlement({
        accountType: "individual",
        subscribed: false,
        tier: "free",
      }),
    ).toBe(true);
  });

  it("allows subscribed individual users unlimited sessions", () => {
    expect(
      isFreeTierEntitlement({
        accountType: "individual",
        subscribed: true,
        tier: "free",
      }),
    ).toBe(false);
  });
});

describe("resolveCurrentTier with enterprise profile fields", () => {
  it("prefers enterprise tier over stale free tier columns", () => {
    expect(resolveCurrentTier(false, "free", "enterprise", "premium")).toBe("premium");
  });
});
