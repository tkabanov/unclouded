import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  buildModuleSchedules,
} from "@/lib/modules/moduleScheduler";
import type { ModuleSchedulerInput } from "@/lib/modules/moduleSchedulerTypes";
import {
  buildModuleUnlockSchedulePatch,
  isNotificationSentToday,
  listModuleUnlockCandidatesFromRows,
  MODULE_UNLOCK_RESEND_MS,
  pickModuleUnlockForProfile,
  type ModuleUnlockProfileRow,
} from "../../../../supabase/functions/_shared/moduleUnlockLogic.ts";

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

function profileRow(
  overrides: Partial<ModuleUnlockProfileRow> & { id: string },
): ModuleUnlockProfileRow {
  return {
    onboardingCompleted: true,
    email: "user@example.com",
    firstName: "Alex",
    ...overrides,
  };
}

describe("moduleUnlockLogic", () => {
  it("returns initial unlock candidate on trigger day", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const candidate = pickModuleUnlockForProfile(
      profileRow({ id: "user-1", moduleSchedules: schedules }),
      now,
    );

    expect(candidate?.slug).toBe("body");
    expect(candidate?.kind).toBe("initial");
    expect(candidate?.displayTitle).toBe("Your Body's Story");
  });

  it("skips completed modules", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 5);
    const candidate = pickModuleUnlockForProfile(
      profileRow({
        id: "user-1",
        moduleSchedules: schedules,
        moduleBodyComplete: true,
      }),
      now,
    );

    expect(candidate).toBeNull();
  });

  it("schedules resend after three days when module remains incomplete", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const notifiedAt = addCalendarDays(ANCHOR, 5).toISOString();
    const patched = buildModuleUnlockSchedulePatch(
      schedules,
      "body",
      "initial",
      notifiedAt,
    );
    const resendDay = new Date(new Date(notifiedAt).getTime() + MODULE_UNLOCK_RESEND_MS);

    const candidate = pickModuleUnlockForProfile(
      profileRow({ id: "user-1", moduleSchedules: patched }),
      resendDay,
    );

    expect(candidate?.slug).toBe("body");
    expect(candidate?.kind).toBe("resend");
  });

  it("does not send a third notification for the same module after resend", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    let patched = buildModuleUnlockSchedulePatch(
      schedules,
      "body",
      "initial",
      addCalendarDays(ANCHOR, 5).toISOString(),
    );
    patched = buildModuleUnlockSchedulePatch(
      patched,
      "body",
      "resend",
      addCalendarDays(ANCHOR, 8).toISOString(),
    );

    const candidate = pickModuleUnlockForProfile(
      profileRow({ id: "user-1", moduleSchedules: patched }),
      addCalendarDays(ANCHOR, 12),
    );

    expect(candidate?.slug).not.toBe("body");
    expect(candidate?.kind).toBe("initial");
    expect(candidate?.slug).toBe("identity");
  });

  it("blocks a second notification on the same local day", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 7);

    expect(
      isNotificationSentToday(addCalendarDays(ANCHOR, 7).toISOString(), now, "UTC"),
    ).toBe(true);

    const candidate = pickModuleUnlockForProfile(
      profileRow({
        id: "user-1",
        moduleSchedules: schedules,
        lastNotificationSentAt: addCalendarDays(ANCHOR, 7).toISOString(),
        timeZone: "UTC",
      }),
      now,
    );

    expect(candidate).toBeNull();
  });

  it("picks the earliest scheduled module when multiple are eligible", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    const now = addCalendarDays(ANCHOR, 10);
    const candidates = listModuleUnlockCandidatesFromRows(
      [profileRow({ id: "user-1", moduleSchedules: schedules })],
      now,
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.slug).toBe("body");
  });

  it("skips users who have not finished onboarding", () => {
    const schedules = buildModuleSchedules(BASE_INPUT, ANCHOR);
    expect(
      pickModuleUnlockForProfile(
        profileRow({ id: "user-1", moduleSchedules: schedules, onboardingCompleted: false }),
        ANCHOR,
      ),
    ).toBeNull();
  });
});
