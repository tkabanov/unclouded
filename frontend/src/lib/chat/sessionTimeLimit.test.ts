import { describe, expect, it } from "vitest";
import {
  AI_SESSION_MAX_MS,
  isSessionPastTimeLimit,
  isTimeLimitedLifecycle,
} from "../../../../supabase/functions/chat/sessionTimeLimit.ts";
import {
  isSessionLimitCode,
  isSessionTimeLimitCode,
  SESSION_TIME_LIMIT_CODE,
  sessionLimitNoticeFor,
} from "./chatSessionLimit";

describe("NCLDD-64 60-minute AI session cap", () => {
  const start = Date.parse("2026-10-23T10:00:00.000Z");

  it("allows a session under 60 minutes and blocks it from minute 60", () => {
    const createdAt = new Date(start).toISOString();
    expect(AI_SESSION_MAX_MS).toBe(60 * 60_000);
    expect(isSessionPastTimeLimit(createdAt, start + 59 * 60_000)).toBe(false);
    expect(isSessionPastTimeLimit(createdAt, start + 60 * 60_000)).toBe(true);
  });

  it("does not limit when the start time is unknown", () => {
    expect(isSessionPastTimeLimit(null, start)).toBe(false);
    expect(isSessionPastTimeLimit("not-a-date", start)).toBe(false);
  });

  it("limits coaching turns and the opener but never wrap-up calls", () => {
    expect(isTimeLimitedLifecycle(undefined)).toBe(true);
    expect(isTimeLimitedLifecycle("session_open")).toBe(true);
    expect(isTimeLimitedLifecycle("session_close")).toBe(false);
    expect(isTimeLimitedLifecycle("session_close_ack")).toBe(false);
    expect(isTimeLimitedLifecycle("session_finalize")).toBe(false);
    expect(isTimeLimitedLifecycle("conversation_title")).toBe(false);
  });

  it("surfaces the server message for the time-limit code", () => {
    expect(isSessionTimeLimitCode(SESSION_TIME_LIMIT_CODE)).toBe(true);
    expect(isSessionLimitCode(SESSION_TIME_LIMIT_CODE)).toBe(true);
    expect(sessionLimitNoticeFor(SESSION_TIME_LIMIT_CODE, "Time is up")).toBe("Time is up");
  });
});
