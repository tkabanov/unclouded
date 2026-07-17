import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  buildModuleSchedules,
} from "./moduleScheduler";
import type { ModuleSchedulerInput } from "./moduleSchedulerTypes";
import {
  buildModuleListItems,
  countCompletedModuleItems,
  formatDaysUntilUnlockLabel,
  getNextActionableModule,
} from "./moduleListState";
import { MODULE_DEFAULT_UNLOCK_DAYS } from "./moduleRegistry";
import { MODULE_SLUGS } from "./moduleSlugs";

const ANCHOR = new Date("2026-07-17T12:00:00.000Z");

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

describe("moduleListState", () => {
  it("builds six items in canonical slug order", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems({ moduleSchedules: schedules }, ANCHOR);

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.slug)).toEqual([...MODULE_SLUGS]);
    expect(items.every((item) => item.displayTitle.length > 0)).toBe(true);
    expect(items.every((item) => item.presentationCopy.length > 0)).toBe(true);
  });

  it("marks all modules locked on fresh onboarding schedules at anchor", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems({ moduleSchedules: schedules }, ANCHOR);

    expect(items.every((item) => item.status === "locked")).toBe(true);
    expect(countCompletedModuleItems(items)).toBe(0);
    expect(items.find((item) => item.slug === "body")?.daysUntilUnlock).toBe(5);
  });

  it("returns one available module when schedule date is reached", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const items = buildModuleListItems({ moduleSchedules: schedules }, now);

    const available = items.filter((item) => item.status === "available");
    expect(available.map((item) => item.slug)).toContain("body");
    expect(getNextActionableModule(items)?.slug).toBe("body");
  });

  it("returns mixed completed, available, and locked items", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const items = buildModuleListItems(
      {
        moduleSchedules: schedules,
        moduleIdentityComplete: true,
      },
      now,
    );

    expect(countCompletedModuleItems(items)).toBe(1);
    expect(items.find((item) => item.slug === "identity")?.status).toBe("completed");
    expect(items.find((item) => item.slug === "financial")?.status).toBe("locked");
    expect(items.find((item) => item.slug === "body")?.status).toBe("available");
  });

  it("falls back to registry default unlock days for legacy profiles without schedules", () => {
    const items = buildModuleListItems({}, ANCHOR);

    expect(items).toHaveLength(6);
    expect(items.every((item) => item.status === "locked")).toBe(true);
    expect(items.find((item) => item.slug === "identity")?.daysUntilUnlock).toBe(
      MODULE_DEFAULT_UNLOCK_DAYS.identity,
    );
    expect(items.find((item) => item.slug === "meaning")?.daysUntilUnlock).toBe(
      MODULE_DEFAULT_UNLOCK_DAYS.meaning,
    );
  });

  it("formats locked copy for 0, 1, and N days", () => {
    expect(formatDaysUntilUnlockLabel(0)).toBe("Unlocks today");
    expect(formatDaysUntilUnlockLabel(1)).toBe("Coming in 1 day");
    expect(formatDaysUntilUnlockLabel(14)).toBe("Coming in 14 days");
  });

  it("returns earliest locked module when none are available", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const items = buildModuleListItems({ moduleSchedules: schedules }, ANCHOR);

    expect(getNextActionableModule(items)?.slug).toBe("body");
  });
});
