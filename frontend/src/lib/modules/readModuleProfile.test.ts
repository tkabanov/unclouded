import { describe, expect, it } from "vitest";

import {
  readModuleCompleteFlags,
  readModulesCompletedCount,
  readModuleSchedules,
} from "./readModuleProfile";

describe("readModulesCompletedCount", () => {
  it("prefers profile column over onboardingData JSON", () => {
    expect(
      readModulesCompletedCount({
        modulesCompletedCount: 2,
        onboardingData: { modules_completed_count_number: 5 },
      }),
    ).toBe(2);
  });

  it("falls back to onboardingData when column is missing", () => {
    expect(
      readModulesCompletedCount({
        onboardingData: { modules_completed_count_number: 3 },
      }),
    ).toBe(3);
  });
});

describe("readModuleCompleteFlags", () => {
  it("reads boolean columns when present", () => {
    expect(
      readModuleCompleteFlags({
        moduleIdentityComplete: true,
        moduleBodyComplete: false,
        onboardingData: { module_body_complete: true },
      }),
    ).toEqual({
      moduleIdentityComplete: true,
      moduleRelationalComplete: false,
      moduleHistoryComplete: false,
      moduleFinancialComplete: false,
      moduleBodyComplete: false,
      moduleMeaningComplete: false,
    });
  });

  it("falls back to onboardingData flags when columns absent", () => {
    expect(
      readModuleCompleteFlags({
        onboardingData: {
          module_history_complete: true,
          module_financial_complete_boolean: true,
        },
      }),
    ).toEqual({
      moduleIdentityComplete: false,
      moduleRelationalComplete: false,
      moduleHistoryComplete: true,
      moduleFinancialComplete: true,
      moduleBodyComplete: false,
      moduleMeaningComplete: false,
    });
  });
});

describe("readModuleSchedules", () => {
  it("returns empty object for null schedules", () => {
    expect(readModuleSchedules({ moduleSchedules: null })).toEqual({});
  });

  it("parses valid schedule entries and ignores unknown slugs", () => {
    expect(
      readModuleSchedules({
        moduleSchedules: {
          body: {
            scheduledAt: "2026-07-20T00:00:00.000Z",
            unlockedAt: null,
            completedAt: null,
          },
          invalid: { scheduledAt: "2026-07-21T00:00:00.000Z" },
        },
      }),
    ).toEqual({
      body: {
        scheduledAt: "2026-07-20T00:00:00.000Z",
        unlockedAt: null,
        completedAt: null,
        unlockNotifiedAt: null,
        unlockResentAt: null,
        refreshOfferedAt: null,
        refreshReason: null,
      },
    });
  });
});
