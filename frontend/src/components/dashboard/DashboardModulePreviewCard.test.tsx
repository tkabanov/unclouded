import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import DashboardModulePreviewCard from "@/components/dashboard/DashboardModulePreviewCard";
import { DashboardUserProvider } from "@/hooks/useDashboardUser";
import { buildModuleSchedules } from "@/lib/modules/moduleScheduler";
import type { ModuleSchedulerInput } from "@/lib/modules/moduleSchedulerTypes";
import type { UserProfile } from "@/lib/userProfile";
import { useUserProfile } from "@/lib/userProfile";

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: vi.fn(),
}));

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

function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    firstName: "Alex",
    roleType: "founder",
    primaryPillar: "emotional",
    results: {
      stability_score: 3.5,
      performance_score: 3.5,
      alignment_score: 3.5,
      orientation_score: 3.5,
      pressure_profile: "steady",
      tradeoff_statement: "Test tradeoff",
      classification: {
        key: "capacity_erosion",
        name: "Capacity Erosion",
        description: "",
        focusAreas: [],
      },
      recovery_mode_active: false,
      grief_mode_active: false,
      trauma_informed_mode: false,
      first_module: "body",
      module_days: 5,
    },
    onboardingCompleted: true,
    onboardingCompletedAt: ANCHOR.toISOString(),
    onboardingData: null,
    subscribed: false,
    tier: null,
    lastAssessmentDate: null,
    nextReassessmentDate: null,
    canReassessOnDemand: false,
    reassessmentResults: null,
    reassessmentReflections: null,
    reassessmentCompletedAt: null,
    ...overrides,
  };
}

function renderCard(profile: UserProfile) {
  vi.mocked(useUserProfile).mockReturnValue({
    profile,
    loading: false,
    saveOnboarding: vi.fn(),
    markOnboardingComplete: vi.fn(),
    persistOnboardingDraft: vi.fn(),
    saveReassessment: vi.fn(),
    simulate90DaysElapsed: vi.fn(),
    loadDemoComparison: vi.fn(),
    refresh: vi.fn(),
  });

  return render(
    <MemoryRouter>
      <DashboardUserProvider>
        <DashboardModulePreviewCard />
      </DashboardUserProvider>
    </MemoryRouter>,
  );
}

describe("DashboardModulePreviewCard", () => {
  it("renders nothing when all modules are complete", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const { container } = renderCard(
      buildProfile({
        moduleSchedules: schedules,
        moduleIdentityComplete: true,
        moduleRelationalComplete: true,
        moduleHistoryComplete: true,
        moduleFinancialComplete: true,
        moduleBodyComplete: true,
        moduleMeaningComplete: true,
      }),
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows Start link when the preview module is available", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = new Date(ANCHOR);
    now.setUTCDate(now.getUTCDate() + 5);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    renderCard(buildProfile({ moduleSchedules: schedules }));

    expect(screen.getByRole("heading", { name: "Know Yourself Deeper" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start/i })).toHaveAttribute(
      "href",
      "/settings/know-yourself/body",
    );

    vi.useRealTimers();
  });

  it("shows locked copy when the preview module is not yet unlocked", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);

    renderCard(buildProfile({ moduleSchedules: schedules }));

    expect(screen.getByRole("button", { name: /Coming in 5 days/i })).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Start/i })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("links View all to the profile settings tab", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);

    renderCard(buildProfile({ moduleSchedules: schedules }));

    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
      "href",
      "/settings?tab=profile",
    );

    vi.useRealTimers();
  });
});
