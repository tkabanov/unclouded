import { describe, expect, it } from "vitest";
import { adminDataSourceNotice } from "./adminDataSource";

describe("adminDataSourceNotice", () => {
  it("returns null for table-backed data", () => {
    expect(adminDataSourceNotice("table", "plans")).toBeNull();
  });

  it("describes onboarding fallback", () => {
    expect(adminDataSourceNotice("onboarding", "workplaces")).toContain("onboardingData");
  });

  it("describes static demo catalog", () => {
    expect(adminDataSourceNotice("static", "resources")).toContain("demo resources");
  });
});
