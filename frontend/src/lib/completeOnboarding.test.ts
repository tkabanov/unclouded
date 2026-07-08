import { describe, expect, it } from "vitest";
import { canCompleteOnboarding, type OnboardingCompletionData } from "./completeOnboarding";

const BASE_DATA: OnboardingCompletionData = {
  firstName: "Sam",
  roleType: "founder",
  primaryPillar: "stability",
  stabilityScores: { sleep: 3 },
  performanceScores: { focus: 3 },
  alignmentScores: { purpose: 3 },
  orientationScore: 3,
  loadSignals: {
    cognitive_load_signal: "manageable",
    relational_load_signal: "manageable",
    environmental_load_signal: "manageable",
    financial_load_signal: "manageable",
  },
  stateSignals: {
    nervous_system_state: "regulated",
    energy_state: "strong",
  },
  behavioralPatterns: {
    decision_style: "deliberate",
  },
  healthFlags: {
    selected_flags: ["none"],
    crisis_flag: false,
  },
};

describe("canCompleteOnboarding", () => {
  it("returns true when required load signals and health flags are present", () => {
    expect(canCompleteOnboarding(BASE_DATA)).toBe(true);
  });

  it("returns false when a required load signal is missing", () => {
    const incomplete = {
      ...BASE_DATA,
      loadSignals: {
        ...BASE_DATA.loadSignals,
        financial_load_signal: "",
      },
    };

    expect(canCompleteOnboarding(incomplete)).toBe(false);
  });

  it("returns false when no health flags are selected", () => {
    const incomplete = {
      ...BASE_DATA,
      healthFlags: {
        selected_flags: [],
        crisis_flag: false,
      },
    };

    expect(canCompleteOnboarding(incomplete)).toBe(false);
  });
});
