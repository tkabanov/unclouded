import { describe, expect, it } from "vitest";

import { resolveEnrollmentCodeSectionMode } from "./SettingsEnrollmentCodeSection";

describe("resolveEnrollmentCodeSectionMode", () => {
  it("shows redeem for individual users", () => {
    expect(
      resolveEnrollmentCodeSectionMode({
        accountType: "individual",
        isPortalOnlyHr: false,
      }),
    ).toBe("redeem");
  });

  it("shows covered status for enterprise employees", () => {
    expect(
      resolveEnrollmentCodeSectionMode({
        accountType: "enterprise",
        isPortalOnlyHr: false,
      }),
    ).toBe("covered");
  });

  it("hides for portal-only HR (dual-mode is members/invite, not self-redeem)", () => {
    expect(
      resolveEnrollmentCodeSectionMode({
        accountType: "individual",
        isPortalOnlyHr: true,
      }),
    ).toBe("hidden");
  });
});
