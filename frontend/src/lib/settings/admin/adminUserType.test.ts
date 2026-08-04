import { describe, expect, it } from "vitest";
import {
  adminUserTypeLabel,
  resolveAdminUserType,
} from "@/lib/settings/admin/adminUserType";

describe("resolveAdminUserType", () => {
  it("maps enterprise contract tier", () => {
    expect(
      resolveAdminUserType({
        accountType: "enterprise",
        enterpriseTier: "premium",
      }),
    ).toBe("premium");
    expect(
      resolveAdminUserType({
        accountType: "enterprise",
        enterpriseTier: "pro",
      }),
    ).toBe("pro");
  });

  it("returns canceled for inactive subscriptions", () => {
    expect(
      resolveAdminUserType({
        accountType: "individual",
        subscriptionStatus: "inactive",
        subscriptionPlanTier: "pro",
      }),
    ).toBe("canceled");
  });

  it("returns paid tier while scheduled to cancel", () => {
    expect(
      resolveAdminUserType({
        subscriptionStatus: "scheduledToCancel",
        subscriptionPlanTier: "premium",
      }),
    ).toBe("premium");
  });

  it("returns free by default", () => {
    expect(resolveAdminUserType({})).toBe("free");
  });

  it("uses legacy subscribed flag as pro", () => {
    expect(
      resolveAdminUserType({
        subscribed: true,
        tier: "free",
      }),
    ).toBe("pro");
  });
});

describe("adminUserTypeLabel", () => {
  it("labels all types", () => {
    expect(adminUserTypeLabel("free")).toBe("Free");
    expect(adminUserTypeLabel("pro")).toBe("Pro");
    expect(adminUserTypeLabel("premium")).toBe("Premium");
    expect(adminUserTypeLabel("canceled")).toBe("Canceled");
  });
});
