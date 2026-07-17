import { describe, expect, it } from "vitest";

import {
  ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS,
  ADMIN_SENSITIVE_HISTORY_FIELDS,
} from "./adminAnalyticsApi";

describe("admin analytics privacy whitelist", () => {
  it("selects only whitelisted module analytics columns", () => {
    expect(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS).toContain("modulesCompletedCount");
    expect(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS).toContain("moduleHistoryComplete");
    expect(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS).toContain("onboardingData");
  });

  it("does not include History answer fields in analytics select", () => {
    for (const field of ADMIN_SENSITIVE_HISTORY_FIELDS) {
      expect(ADMIN_MODULE_ANALYTICS_SELECT_COLUMNS).not.toContain(field);
    }
  });
});
