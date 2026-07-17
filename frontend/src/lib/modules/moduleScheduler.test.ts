import { describe, expect, it } from "vitest";

import { resolveUnlockDay } from "./moduleAcceleratedTriggers";
import {
  addCalendarDays,
  buildModuleSchedules,
  getModuleAvailability,
  getOnboardingModulePreview,
} from "./moduleScheduler";
import type { ModuleSchedulerInput } from "./moduleSchedulerTypes";
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

function inputWith(overrides: Partial<ModuleSchedulerInput>): ModuleSchedulerInput {
  return {
    ...BASE_INPUT,
    ...overrides,
    stabilityScores: { ...BASE_INPUT.stabilityScores, ...overrides.stabilityScores },
    performanceScores: { ...BASE_INPUT.performanceScores, ...overrides.performanceScores },
    alignmentScores: { ...BASE_INPUT.alignmentScores, ...overrides.alignmentScores },
    loadSignals: { ...BASE_INPUT.loadSignals, ...overrides.loadSignals },
    stateSignals: { ...BASE_INPUT.stateSignals, ...overrides.stateSignals },
    behavioralPatterns: { ...BASE_INPUT.behavioralPatterns, ...overrides.behavioralPatterns },
    healthFlags: { ...BASE_INPUT.healthFlags, ...overrides.healthFlags },
  };
}

describe("moduleScheduler", () => {
  it("builds six schedule entries for default onboarding input", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    expect(Object.keys(schedules)).toHaveLength(6);
    for (const slug of MODULE_SLUGS) {
      expect(schedules[slug]?.scheduledAt).toBeTruthy();
    }
  });

  it("uses default schedule when no accelerated triggers fire", () => {
    expect(resolveUnlockDay("body", BASE_INPUT)).toBe(5);
    expect(resolveUnlockDay("identity", BASE_INPUT)).toBe(7);
    expect(resolveUnlockDay("financial", BASE_INPUT)).toBe(10);
    expect(resolveUnlockDay("relational", BASE_INPUT)).toBe(14);
    expect(resolveUnlockDay("history", BASE_INPUT)).toBe(21);
    expect(resolveUnlockDay("meaning", BASE_INPUT)).toBe(30);

    const preview = getOnboardingModulePreview(
      buildModuleSchedules(BASE_INPUT, ANCHOR),
      ANCHOR,
      ANCHOR,
    );
    expect(preview.slug).toBe("body");
    expect(preview.displayTitle).toBe("Your Body's Story");
    expect(preview.daysUntilUnlock).toBe(5);
  });

  it("accelerates financial to day 0 when financial load is high", () => {
    const input = inputWith({
      loadSignals: {
        financial_load_signal: "financial_stress_is_significant_daily_presence",
      },
    });
    expect(resolveUnlockDay("financial", input)).toBe(0);
    const schedules = buildModuleSchedules(input, ANCHOR);
    expect(schedules.financial?.scheduledAt).toBe(addCalendarDays(ANCHOR, 0).toISOString());
  });

  it("accelerates body to day 3 when nervous system is shut down", () => {
    const input = inputWith({
      stateSignals: { nervous_system_state: "shut_down", energy_level_signal: "strong" },
    });
    expect(resolveUnlockDay("body", input)).toBe(3);
    expect(buildModuleSchedules(input, ANCHOR).body?.scheduledAt).toBe(
      addCalendarDays(ANCHOR, 3).toISOString(),
    );
  });

  it("accelerates body to day 3 when energy level is depleted", () => {
    const input = inputWith({
      stateSignals: { nervous_system_state: "regulated", energy_level_signal: "depleted" },
    });
    expect(resolveUnlockDay("body", input)).toBe(3);
  });

  it("accelerates identity to day 5 when performance is low and pattern is overthink", () => {
    const input = inputWith({
      performanceScores: { performance_score: 3.0 },
      behavioralPatterns: { pressure_response_pattern: "overthink" },
    });
    expect(resolveUnlockDay("identity", input)).toBe(5);
  });

  it("accelerates relational to day 7 when relational load is high", () => {
    const input = inputWith({
      loadSignals: {
        relational_load_signal: "significant_conflict_or_strain_in_key_relationships",
      },
    });
    expect(resolveUnlockDay("relational", input)).toBe(7);
  });

  it("accelerates history to day 10 when stability is low", () => {
    const input = inputWith({
      stabilityScores: { stability_score: 3.0 },
    });
    expect(resolveUnlockDay("history", input)).toBe(10);
  });

  it("accelerates history to day 10 when grief mode is active", () => {
    const input = inputWith({
      healthFlags: { grief_mode_active: true },
    });
    expect(resolveUnlockDay("history", input)).toBe(10);
  });

  it("accelerates meaning to day 14 when alignment is low", () => {
    const input = inputWith({
      alignmentScores: { alignment_score: 3.0 },
    });
    expect(resolveUnlockDay("meaning", input)).toBe(14);
  });

  it("tie-breaks preview toward body when body and identity share earliest day", () => {
    const input = inputWith({
      performanceScores: { performance_score: 3.0 },
      behavioralPatterns: { pressure_response_pattern: "overthink" },
    });
    const schedules = buildModuleSchedules(input, ANCHOR);
    expect(resolveUnlockDay("body", input)).toBe(5);
    expect(resolveUnlockDay("identity", input)).toBe(5);

    const preview = getOnboardingModulePreview(schedules, ANCHOR, ANCHOR);
    expect(preview.slug).toBe("body");
    expect(preview.daysUntilUnlock).toBe(5);
  });

  it("returns locked availability before scheduledAt", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 2);
    const availability = getModuleAvailability({ moduleSchedules: schedules }, now);
    expect(availability.body.status).toBe("locked");
    expect(availability.body.daysUntilUnlock).toBe(3);
  });

  it("returns available when now is on or after scheduledAt", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const availability = getModuleAvailability({ moduleSchedules: schedules }, now);
    expect(availability.body.status).toBe("available");
    expect(availability.body.daysUntilUnlock).toBe(0);
    expect(availability.body.unlockedAt).toBe(schedules.body?.scheduledAt ?? null);
  });

  it("returns completed when module complete flag is set", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const availability = getModuleAvailability(
      {
        moduleSchedules: schedules,
        moduleIdentityComplete: true,
      },
      ANCHOR,
    );
    expect(availability.identity.status).toBe("completed");
    expect(availability.identity.daysUntilUnlock).toBe(0);
  });

  it("returns refresh_available when completed module has refresh offer", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const availability = getModuleAvailability(
      {
        moduleSchedules: {
          ...schedules,
          identity: {
            ...schedules.identity!,
            refreshOfferedAt: "2026-10-15T00:00:00.000Z",
            refreshReason: "reassessment_90d",
          },
        },
        moduleIdentityComplete: true,
      },
      ANCHOR,
    );
    expect(availability.identity.status).toBe("refresh_available");
  });
});
