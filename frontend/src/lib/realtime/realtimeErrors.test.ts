import { describe, expect, it } from "vitest";
import {
  AI_MONTHLY_LIMIT_CODE,
  FREE_TIER_LIMIT_CODE,
  FREE_TIER_UPSELL_MESSAGE,
  formatMonthlyAiLimitMessage,
} from "@/lib/chat/chatSessionLimit";
import {
  REALTIME_SESSION_ACTIVE_MESSAGE,
  apiErrorMessage,
  canRetryAfter,
  endReasonForServerError,
  endReasonMessage,
  isRealtimeLimitCode,
  micErrorKind,
  micErrorMessage,
  type RealtimeApiErrorCode,
  type RealtimeEndReason,
} from "./realtimeErrors";

describe("micErrorKind", () => {
  it.each([
    ["NotAllowedError", "mic_denied"],
    ["SecurityError", "mic_denied"],
    ["PermissionDeniedError", "mic_denied"],
    ["NotFoundError", "mic_not_found"],
    ["OverconstrainedError", "mic_not_found"],
    ["DevicesNotFoundError", "mic_not_found"],
    ["NotReadableError", "mic_busy"],
    ["TrackStartError", "mic_busy"],
    ["AbortError", "mic_error"],
    [null, "mic_error"],
    [undefined, "mic_error"],
  ])("%s → %s", (name, kind) => {
    expect(micErrorKind(name)).toBe(kind);
  });

  it("has copy for every kind", () => {
    expect(micErrorMessage("mic_denied")).toMatch(/browser settings/);
    expect(micErrorMessage("mic_not_found")).toMatch(/No microphone/);
    expect(micErrorMessage("mic_busy")).toMatch(/another app/);
    expect(micErrorMessage("mic_error")).toMatch(/couldn't start/);
  });
});

describe("apiErrorMessage", () => {
  it("reuses the voice limit and Free-tier copy", () => {
    expect(apiErrorMessage(AI_MONTHLY_LIMIT_CODE)).toBe(formatMonthlyAiLimitMessage("voice"));
    expect(apiErrorMessage(FREE_TIER_LIMIT_CODE)).toBe(FREE_TIER_UPSELL_MESSAGE);
  });

  it("prefers the server message for the tier gate", () => {
    expect(apiErrorMessage("realtime_conversation_tier_required", " Upgrade to Pro. ")).toBe("Upgrade to Pro.");
    expect(apiErrorMessage("realtime_conversation_tier_required", "  ")).toMatch(/isn't included/);
    expect(apiErrorMessage("realtime_conversation_tier_required")).toMatch(/isn't included/);
  });

  it("shows the server's crisis text", () => {
    expect(apiErrorMessage("crisis", "Call 988.")).toBe("Call 988.");
    expect(apiErrorMessage("crisis")).toMatch(/988/);
  });

  it("has copy for every other code", () => {
    expect(apiErrorMessage("realtime_session_active")).toBe(REALTIME_SESSION_ACTIVE_MESSAGE);
    const codes: RealtimeApiErrorCode[] = [
      "rate_limited",
      "unauthorized",
      "network_error",
      "realtime_unavailable",
      "invalid_response",
      "request_failed",
    ];
    for (const code of codes) expect(apiErrorMessage(code)).toBeTruthy();
  });

  it("flags limit codes", () => {
    expect(isRealtimeLimitCode(AI_MONTHLY_LIMIT_CODE)).toBe(true);
    expect(isRealtimeLimitCode(FREE_TIER_LIMIT_CODE)).toBe(true);
    expect(isRealtimeLimitCode("realtime_session_active")).toBe(false);
    expect(isRealtimeLimitCode(null)).toBe(false);
  });
});

describe("end reasons", () => {
  const all: RealtimeEndReason[] = [
    "user_ended",
    "max_duration",
    "idle_timeout",
    "network_lost",
    "connect_failed",
    "mic_lost",
    "budget_reached",
    "crisis",
    "error",
    "abandoned",
  ];

  it("shows no message when the user ended it or for crisis", () => {
    expect(endReasonMessage("user_ended")).toBeNull();
    expect(endReasonMessage("crisis")).toBeNull();
  });

  it("has copy for every other reason", () => {
    for (const reason of all.filter((r) => r !== "user_ended" && r !== "crisis")) {
      expect(endReasonMessage(reason)).toBeTruthy();
    }
    expect(endReasonMessage("max_duration")).toMatch(/60-minute/);
    expect(endReasonMessage("budget_reached")).toBe(formatMonthlyAiLimitMessage("voice"));
  });

  it("offers Try again only after recoverable failures", () => {
    expect(all.filter(canRetryAfter)).toEqual(["network_lost", "connect_failed", "mic_lost", "error"]);
  });

  it("treats session_expired as the max-duration end (C6)", () => {
    expect(endReasonForServerError("session_expired")).toBe("max_duration");
    expect(endReasonForServerError("invalid_value")).toBeNull();
    expect(endReasonForServerError(null)).toBeNull();
  });
});
