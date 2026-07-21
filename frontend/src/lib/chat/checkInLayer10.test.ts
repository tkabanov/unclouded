import { describe, expect, it } from "vitest";
import {
  isCheckInSubmittedToday,
  mapDailyCheckInRow,
  resolveCheckInFeelingWord,
  resolveTodayCheckIn,
} from "../../../../supabase/functions/chat/liveContext/checkInHelpers.ts";
import { computeDaysSinceLastCompletedSession } from "../../../../supabase/functions/chat/liveContext/sessionGapHelpers.ts";

describe("checkInHelpers", () => {
  it("treats only today's check-in as session-open data", () => {
    const stale = {
      date: "2020-01-01T09:00:00.000Z",
      pulse: 4,
      feeling: "drained",
    };
    expect(isCheckInSubmittedToday(stale)).toBe(false);
    expect(resolveTodayCheckIn(stale)).toBeNull();
  });

  it("maps feelingWord separately from reflection prose", () => {
    const mapped = mapDailyCheckInRow({
      mood: 5,
      energyStressLevel: 5,
      feelingWord: "drained",
      reflection: "Focused morning, tough afternoon meeting.",
      date: new Date().toISOString(),
    });

    expect(mapped?.feeling).toBe("drained");
    expect(resolveCheckInFeelingWord(mapped)).toBe("drained");
  });

  it("rejects legacy reflection sentences masquerading as feeling words", () => {
    expect(
      resolveCheckInFeelingWord({
        feeling: "Focused morning, tough afternoon meeting.",
      }),
    ).toBeNull();
  });
});

describe("sessionGapHelpers", () => {
  it("computes days since last completed session from chat_session_memory only", () => {
    const referenceDate = new Date("2026-07-20T12:00:00.000Z");
    const days = computeDaysSinceLastCompletedSession(
      {
        chat_session_memory: [{ closedAt: "2026-07-06T18:00:00.000Z", topic: "sleep" }],
      },
      referenceDate,
    );

    expect(days).toBe(14);
  });

  it("returns null when no completed sessions are stored", () => {
    expect(computeDaysSinceLastCompletedSession({})).toBeNull();
  });
});
