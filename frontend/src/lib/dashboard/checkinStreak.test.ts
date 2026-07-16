import { describe, expect, it } from "vitest";
import {
  computeStreakFromDateKeys,
  resolveEffectiveCheckInStreak,
} from "../../../../supabase/functions/chat/liveContext/streakHelpers.ts";

describe("check-in streak helpers", () => {
  const ref = new Date("2026-07-16T15:00:00.000Z");

  it("counts consecutive days ending on anchor", () => {
    expect(
      computeStreakFromDateKeys(
        ["2026-07-14", "2026-07-15", "2026-07-16"],
        "2026-07-16",
      ),
    ).toBe(3);
  });

  it("returns 0 when anchor day has no check-in", () => {
    expect(
      computeStreakFromDateKeys(["2026-07-14", "2026-07-15"], "2026-07-16"),
    ).toBe(0);
  });

  it("keeps streak when last check-in was yesterday", () => {
    expect(
      resolveEffectiveCheckInStreak(
        ["2026-07-14", "2026-07-15"],
        ref,
      ),
    ).toBe(2);
  });

  it("resets streak to 0 when a day was missed", () => {
    expect(
      resolveEffectiveCheckInStreak(["2026-07-13", "2026-07-14"], ref),
    ).toBe(0);
  });

  it("includes today in an active streak", () => {
    expect(
      resolveEffectiveCheckInStreak(
        ["2026-07-15", "2026-07-16"],
        ref,
      ),
    ).toBe(2);
  });

  it("returns 1 for only yesterday checked in", () => {
    expect(resolveEffectiveCheckInStreak(["2026-07-15"], ref)).toBe(1);
  });

  it("returns 0 when there are no check-ins", () => {
    expect(resolveEffectiveCheckInStreak([], ref)).toBe(0);
  });
});
