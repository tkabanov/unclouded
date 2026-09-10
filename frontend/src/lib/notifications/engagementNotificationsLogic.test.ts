import { describe, expect, it } from "vitest";

import {
  CHECKIN_REMINDER_LOCAL_HOUR,
  getLocalHour,
  INACTIVITY_FOLLOWUP_DAYS,
  isDailyCheckinReminderDue,
  isInactivityFollowupDue,
  resolveInactivityBaseline,
} from "../../../../supabase/functions/_shared/engagementNotificationsLogic.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("isDailyCheckinReminderDue", () => {
  const evening = new Date("2026-09-10T20:00:00Z"); // 20:00 UTC — past the 18:00 window

  it("skips a user who already checked in today", () => {
    const row = { id: "u1", onboardingCompleted: true, timeZone: "UTC", checkinReminderSentAt: null };
    expect(isDailyCheckinReminderDue(row, true, evening)).toBe(false);
  });

  it("is due for a user who has not checked in today, past the local evening hour", () => {
    const row = { id: "u1", onboardingCompleted: true, timeZone: "UTC", checkinReminderSentAt: null };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(true);
  });

  it("skips a user already reminded today (same-period dedupe)", () => {
    const row = {
      id: "u1",
      onboardingCompleted: true,
      timeZone: "UTC",
      checkinReminderSentAt: "2026-09-10T18:05:00Z",
    };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(false);
  });

  it("is due again the next day after being reminded yesterday", () => {
    const row = {
      id: "u1",
      onboardingCompleted: true,
      timeZone: "UTC",
      checkinReminderSentAt: "2026-09-09T18:05:00Z",
    };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(true);
  });

  it("is not due before the local evening hour", () => {
    const morning = new Date("2026-09-10T09:00:00Z");
    const row = { id: "u1", onboardingCompleted: true, timeZone: "UTC", checkinReminderSentAt: null };
    expect(isDailyCheckinReminderDue(row, false, morning)).toBe(false);
  });

  it("treats an empty/missing timezone as UTC", () => {
    const row = { id: "u1", onboardingCompleted: true, timeZone: null, checkinReminderSentAt: null };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(true);
    expect(getLocalHour(evening, null)).toBe(20);
    expect(getLocalHour(evening, "")).toBe(20);
  });

  it("respects a user's own timezone for the evening window", () => {
    // 20:00 UTC is 12:00 in America/Los_Angeles (UTC-8 in September, DST -7 → 13:00).
    // Either way it's well before an 18:00 local evening window.
    const row = {
      id: "u1",
      onboardingCompleted: true,
      timeZone: "America/Los_Angeles",
      checkinReminderSentAt: null,
    };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(false);
  });

  it("skips a user who has not completed onboarding", () => {
    const row = { id: "u1", onboardingCompleted: false, timeZone: "UTC", checkinReminderSentAt: null };
    expect(isDailyCheckinReminderDue(row, false, evening)).toBe(false);
  });

  it("CHECKIN_REMINDER_LOCAL_HOUR is a sane evening hour", () => {
    expect(CHECKIN_REMINDER_LOCAL_HOUR).toBeGreaterThanOrEqual(17);
    expect(CHECKIN_REMINDER_LOCAL_HOUR).toBeLessThanOrEqual(21);
  });
});

describe("isInactivityFollowupDue", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  const nowMs = now.getTime();

  function baseRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "u1",
      onboardingCompleted: true,
      onboardingCompletedAt: "2026-01-01T00:00:00Z",
      createdAt: "2025-12-01T00:00:00Z",
      inactivityFollowupBaselineActivityAt: null,
      ...overrides,
    };
  }

  it("is not due for a user idle 4 days", () => {
    const lastActivityAt = new Date(nowMs - 4 * DAY_MS).toISOString();
    expect(isInactivityFollowupDue(baseRow(), lastActivityAt, nowMs)).toBe(false);
  });

  it("is due for a user idle exactly 5 days", () => {
    const lastActivityAt = new Date(nowMs - INACTIVITY_FOLLOWUP_DAYS * DAY_MS).toISOString();
    expect(isInactivityFollowupDue(baseRow(), lastActivityAt, nowMs)).toBe(true);
  });

  it("is due for a user idle more than 5 days", () => {
    const lastActivityAt = new Date(nowMs - 9 * DAY_MS).toISOString();
    expect(isInactivityFollowupDue(baseRow(), lastActivityAt, nowMs)).toBe(true);
  });

  it("falls back to onboardingCompletedAt, then createdAt, when there is no activity yet", () => {
    const row = baseRow({ onboardingCompletedAt: new Date(nowMs - 6 * DAY_MS).toISOString() });
    expect(isInactivityFollowupDue(row, null, nowMs)).toBe(true);
    expect(resolveInactivityBaseline(row, null)).toBe(row.onboardingCompletedAt);

    const rowNoOnboardingDate = baseRow({
      onboardingCompletedAt: null,
      createdAt: new Date(nowMs - 6 * DAY_MS).toISOString(),
    });
    expect(isInactivityFollowupDue(rowNoOnboardingDate, null, nowMs)).toBe(true);
  });

  it("skips a user already followed-up for this exact inactivity streak", () => {
    const lastActivityAt = new Date(nowMs - 9 * DAY_MS).toISOString();
    const row = baseRow({ inactivityFollowupBaselineActivityAt: lastActivityAt });
    expect(isInactivityFollowupDue(row, lastActivityAt, nowMs)).toBe(false);
  });

  it("re-arms after a new activity moves the baseline forward, once idle 5 more days", () => {
    const oldActivity = new Date(nowMs - 20 * DAY_MS).toISOString();
    const row = baseRow({ inactivityFollowupBaselineActivityAt: oldActivity });

    // A new activity 3 days ago: not idle 5 days yet against the new baseline.
    const newActivity = new Date(nowMs - 3 * DAY_MS).toISOString();
    expect(isInactivityFollowupDue(row, newActivity, nowMs)).toBe(false);
  });

  it("dedupe: selecting twice with the same baseline sends only once", () => {
    const lastActivityAt = new Date(nowMs - INACTIVITY_FOLLOWUP_DAYS * DAY_MS).toISOString();
    const row = baseRow();

    // First run: eligible.
    expect(isInactivityFollowupDue(row, lastActivityAt, nowMs)).toBe(true);

    // Simulate stamping the baseline after sending.
    const stampedRow = baseRow({ inactivityFollowupBaselineActivityAt: lastActivityAt });

    // Second run (e.g. a cron retry the same day): no longer eligible.
    expect(isInactivityFollowupDue(stampedRow, lastActivityAt, nowMs)).toBe(false);
  });

  it("skips a user who has not completed onboarding", () => {
    const row = baseRow({ onboardingCompleted: false });
    const lastActivityAt = new Date(nowMs - 9 * DAY_MS).toISOString();
    expect(isInactivityFollowupDue(row, lastActivityAt, nowMs)).toBe(false);
  });
});
