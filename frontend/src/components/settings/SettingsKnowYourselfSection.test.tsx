import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import SettingsKnowYourselfSection from "@/components/settings/SettingsKnowYourselfSection";
import {
  addCalendarDays,
  buildModuleSchedules,
} from "@/lib/modules/moduleScheduler";
import type { ModuleSchedulerInput } from "@/lib/modules/moduleSchedulerTypes";

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

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/userProfile", () => ({
  useUserProfile: () => ({ refresh: vi.fn().mockResolvedValue(undefined) }),
}));

function renderSection(profile: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <SettingsKnowYourselfSection profile={profile} />
    </MemoryRouter>,
  );
}

describe("SettingsKnowYourselfSection", () => {
  it("renders nothing when profile is missing", () => {
    const { container } = renderSection(null as unknown as Record<string, unknown>);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders six module cards and progress for mixed completion", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    renderSection({
      moduleSchedules: schedules,
      moduleIdentityComplete: true,
      moduleBodyComplete: true,
    });

    expect(screen.getByRole("heading", { name: "Know Yourself Deeper" })).toBeInTheDocument();
    expect(screen.getByText(/2\/6 completed\./)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);

    vi.useRealTimers();
  });

  it("links available modules to the wizard route", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 7);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    renderSection({
      moduleSchedules: schedules,
      moduleBodyComplete: true,
    });

    const startLink = screen.getByRole("link", { name: "Start" });
    expect(startLink).toHaveAttribute("href", "/settings/know-yourself/identity");

    vi.useRealTimers();
  });

  it("shows locked copy and disabled action for future modules", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);

    renderSection({ moduleSchedules: schedules });

    expect(screen.getAllByRole("button", { name: /Coming in \d+ days/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Start" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows completed state without a Start action", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);

    renderSection({
      moduleSchedules: schedules,
      moduleIdentityComplete: true,
    });

    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start" })).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("shows sensitive content indicator for history module", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);

    vi.useFakeTimers();
    vi.setSystemTime(ANCHOR);

    renderSection({ moduleSchedules: schedules });

    expect(screen.getByLabelText("Contains sensitive content")).toBeInTheDocument();

    vi.useRealTimers();
  });
});
