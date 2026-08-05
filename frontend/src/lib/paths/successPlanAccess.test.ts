import { describe, expect, it } from "vitest";

import { TIER } from "@/lib/enums/tier";
import {
  isSuccessPlanPath,
  isSuccessPlanSubMode,
  resolveSuccessPlanAccess,
  userCanAccessPathClient,
} from "@/lib/paths/successPlanAccess";

describe("successPlanAccess", () => {
  it("detects success_plan subMode and triggerSignals", () => {
    expect(isSuccessPlanSubMode("success_plan")).toBe(true);
    expect(isSuccessPlanSubMode("directed_writing")).toBe(false);
    expect(
      isSuccessPlanPath({
        subMode: undefined,
        triggerSignals: "path_type:success_plan; flag:None",
      }),
    ).toBe(true);
    expect(isSuccessPlanPath({ subMode: "success_plan" })).toBe(true);
  });

  it("allows Free with HR assignment", () => {
    expect(
      resolveSuccessPlanAccess({
        userTier: TIER.FREE,
        hasSuccessPlanAddon: false,
        hasHrAssignment: true,
      }),
    ).toEqual({ allowed: true, reason: "hr_assign" });
  });

  it("blocks Free without HR assignment", () => {
    expect(
      resolveSuccessPlanAccess({
        userTier: TIER.FREE,
        hasSuccessPlanAddon: true,
        hasHrAssignment: false,
      }),
    ).toEqual({ allowed: false, reason: "upgrade_required" });
  });

  it("requires add-on for Pro without purchase", () => {
    expect(
      resolveSuccessPlanAccess({
        userTier: TIER.PRO,
        hasSuccessPlanAddon: false,
        hasHrAssignment: false,
      }),
    ).toEqual({ allowed: false, reason: "purchase_required" });
  });

  it("allows Pro/Premium with add-on", () => {
    expect(
      resolveSuccessPlanAccess({
        userTier: TIER.PRO,
        hasSuccessPlanAddon: true,
        hasHrAssignment: false,
      }),
    ).toEqual({ allowed: true, reason: "addon" });
    expect(
      resolveSuccessPlanAccess({
        userTier: TIER.PREMIUM,
        hasSuccessPlanAddon: true,
        hasHrAssignment: false,
      }),
    ).toEqual({ allowed: true, reason: "addon" });
  });

  it("userCanAccessPathClient keeps ordinary tier gate for non-SP", () => {
    expect(
      userCanAccessPathClient({
        isSuccessPlan: false,
        userTier: TIER.FREE,
        pathTier: TIER.PRO,
        hasSuccessPlanAddon: true,
        hasHrAssignment: false,
      }),
    ).toBe(false);
    expect(
      userCanAccessPathClient({
        isSuccessPlan: false,
        userTier: TIER.PRO,
        pathTier: TIER.PRO,
        hasSuccessPlanAddon: false,
        hasHrAssignment: false,
      }),
    ).toBe(true);
  });
});
