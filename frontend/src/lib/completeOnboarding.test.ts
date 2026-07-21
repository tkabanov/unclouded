import { CUSTOMER_ROLE } from "@/lib/enums/customerProfile";
import {
  canCompleteOnboarding,
  completeOnboarding,
  type OnboardingCompletionData,
} from "./completeOnboarding";
import { computeOnboardingModulePreview } from "./modules/moduleScheduler";
import { MODULE_SLUGS } from "./modules/moduleSlugs";
import type { OnboardingPayload } from "./userProfile";

vi.mock("./userProfile/onboardingProfilePipeline", () => ({
  runOnboardingProfilePipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./paths/pathsOnboardingEnrollmentApi", () => ({
  autoEnrollPathsAfterOnboarding: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./reassessment/completeReassessment", () => ({
  recordInitialAssessment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./email/transactionalEmailHooks", () => ({
  scheduleWelcomeEmailAfterOnboarding: vi.fn(),
}));

const BASE_DATA: OnboardingCompletionData = {
  firstName: "Sam",
  lastName: "Taylor",
  roleTypes: [CUSTOMER_ROLE.PRO],
  roleType: CUSTOMER_ROLE.PRO,
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

describe("completeOnboarding scheduler persist", () => {
  it("writes first_module and module_days from scheduler preview", async () => {
    const anchorDate = new Date("2026-07-17T12:00:00.000Z");
    const { preview, schedules } = computeOnboardingModulePreview(BASE_DATA, anchorDate);

    let savedPayload: OnboardingPayload | undefined;
    const saveOnboardingMock = vi.fn(async (payload: OnboardingPayload) => {
      savedPayload = payload;
    });
    const markOnboardingComplete = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn();

    await completeOnboarding(BASE_DATA, {
      userId: "user-1",
      saveOnboarding: saveOnboardingMock,
      markOnboardingComplete,
      navigate,
      anchorDate,
    });

    expect(savedPayload).toBeDefined();
    expect(savedPayload!.results?.first_module).toBe(preview.displayTitle);
    expect(savedPayload!.results?.module_days).toBe(preview.daysUntilUnlock);
    expect(savedPayload!.modulesCompletedCount).toBe(0);
    expect(Object.keys(savedPayload!.moduleSchedules ?? {})).toHaveLength(MODULE_SLUGS.length);
    expect(savedPayload!.moduleSchedules).toEqual(schedules);
    expect(navigate).toHaveBeenCalledWith("/dashboard");
  });
});
