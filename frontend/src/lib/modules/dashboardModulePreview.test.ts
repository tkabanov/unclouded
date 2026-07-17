import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  buildModuleSchedules,
} from "./moduleScheduler";
import type { ModuleSchedulerInput } from "./moduleSchedulerTypes";
import {
  resolveDashboardModulePreview,
  resolveModuleSurfaceLabelsToSlugs,
  selectDashboardModuleItem,
} from "./dashboardModulePreview";
import { buildModuleListItems } from "./moduleListState";

const ANCHOR = new Date("2026-07-17T12:00:00.000Z");

const BASE_FLAGS = {
  recovery_mode_active: false,
  grief_mode_active: false,
  trauma_informed_mode: false,
};

const BASE_INPUT: ModuleSchedulerInput = {
  stabilityScores: { stability_score: 3.5 },
  performanceScores: { performance_score: 3.5 },
  alignmentScores: { alignment_score: 3.5 },
  loadSignals: {
    cognitive_load_signal: "mind_feels_clear_most_of_the_time",
    relational_load_signal: "relationships_feel_mostly_supportive",
    environmental_load_signal: "life_feels_mostly_manageable",
    financial_load_signal: "financial_situation_feels_stable",
  },
  stateSignals: {
    nervous_system_state: "regulated",
    energy_level_signal: "strong",
  },
  behavioralPatterns: {
    pressure_response_pattern: "push_through",
  },
  healthFlags: { grief_mode_active: false },
};

describe("dashboardModulePreview", () => {
  it("maps surface labels to module slugs and ignores section label", () => {
    expect(resolveModuleSurfaceLabelsToSlugs(["Know Yourself Deeper"])).toEqual([]);
    expect(resolveModuleSurfaceLabelsToSlugs(["Identity Lens", "What Holds You"])).toEqual([
      "identity",
      "meaning",
    ]);
    expect(resolveModuleSurfaceLabelsToSlugs(["The Identity Lens"])).toEqual(["identity"]);
  });

  it("selects earliest locked module for default surfacing at onboarding anchor", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems({ moduleSchedules: schedules }, ANCHOR);

    expect(
      selectDashboardModuleItem(items, ["Know Yourself Deeper"])?.slug,
    ).toBe("body");
  });

  it("selects available module at unlock day", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const items = buildModuleListItems({ moduleSchedules: schedules }, now);

    expect(
      selectDashboardModuleItem(items, ["Know Yourself Deeper"])?.status,
    ).toBe("available");
    expect(
      selectDashboardModuleItem(items, ["Know Yourself Deeper"])?.slug,
    ).toBe("body");
  });

  it("returns null when all modules are complete", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems(
      {
        moduleSchedules: schedules,
        moduleIdentityComplete: true,
        moduleRelationalComplete: true,
        moduleHistoryComplete: true,
        moduleFinancialComplete: true,
        moduleBodyComplete: true,
        moduleMeaningComplete: true,
      },
      ANCHOR,
    );

    expect(selectDashboardModuleItem(items, ["Know Yourself Deeper"])).toBeNull();
    expect(
      resolveDashboardModulePreview({
        profile: {
          moduleSchedules: schedules,
          moduleIdentityComplete: true,
          moduleRelationalComplete: true,
          moduleHistoryComplete: true,
          moduleFinancialComplete: true,
          moduleBodyComplete: true,
          moduleMeaningComplete: true,
        },
        classificationKey: "capacity_erosion",
        healthFlags: BASE_FLAGS,
        now: ANCHOR,
      }),
    ).toBeNull();
  });

  it("prefers global available module over locked preferred modules", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const items = buildModuleListItems({ moduleSchedules: schedules }, now);

    expect(
      selectDashboardModuleItem(items, ["Identity Lens", "What Holds You"])?.slug,
    ).toBe("body");
  });

  it("prefers earliest locked preferred module when none are available globally", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems({ moduleSchedules: schedules }, ANCHOR);

    expect(
      selectDashboardModuleItem(items, ["Identity Lens", "What Holds You"])?.slug,
    ).toBe("identity");
  });

  it("uses alignment_fracture dashboard config for preferred surfacing", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    expect(
      resolveDashboardModulePreview({
        profile: { moduleSchedules: schedules },
        classificationKey: "alignment_fracture",
        healthFlags: BASE_FLAGS,
        now: ANCHOR,
      })?.slug,
    ).toBe("identity");
  });
});
