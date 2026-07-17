import { describe, expect, it } from "vitest";

import { computeOnboardingModulePreview } from "@/lib/modules/moduleScheduler";
import type { ModuleSchedulerInput } from "@/lib/modules/moduleSchedulerTypes";
import { resolveUnlockDay } from "@/lib/modules/moduleAcceleratedTriggers";

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

describe("computeOnboardingModulePreview", () => {
  it("builds six schedule entries and preview for default onboarding input", () => {
    const { schedules, preview } = computeOnboardingModulePreview(BASE_INPUT, ANCHOR);
    expect(Object.keys(schedules)).toHaveLength(6);
    expect(preview.daysUntilUnlock).toBeGreaterThanOrEqual(0);
    expect(preview.displayTitle).toBeTruthy();
  });

  it("tie-breaks preview toward body when body and identity share earliest day", () => {
    const input = inputWith({
      performanceScores: { performance_score: 3.0 },
      behavioralPatterns: { pressure_response_pattern: "overthink" },
    });
    expect(resolveUnlockDay("body", input)).toBe(5);
    expect(resolveUnlockDay("identity", input)).toBe(5);

    const { preview } = computeOnboardingModulePreview(input, ANCHOR);
    expect(preview.slug).toBe("body");
    expect(preview.daysUntilUnlock).toBe(5);
    expect(preview.displayTitle).toBe("Your Body's Story");
  });
});
