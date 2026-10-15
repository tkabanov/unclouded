import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn(async () => ({ data: { session: { access_token: "token" } }, error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

import { formatMonthlyAiLimitMessage } from "@/lib/chat/chatSessionLimit";
import {
  REALTIME_VOICE_ENDPOINT,
  RealtimeApiError,
  callRealtimeTool,
  endRealtimeSession,
  endRealtimeSessionKeepalive,
  markRealtimeConnected,
  persistRealtimeTranscript,
  realtimeErrorCode,
  reportRealtimeUsage,
  sendRealtimeHeartbeat,
  startRealtimeSession,
} from "./realtimeVoiceApi";

const START_OK = {
  realtimeSessionId: "s1",
  conversationId: "c1",
  sdpAnswer: "v=0",
  model: "gpt-realtime-2.1",
  voice: "marin",
  expiresAt: "2026-10-15T11:00:00Z",
  heartbeatSec: 30,
  idleTimeoutSec: 600,
};

function respond(status: number, body: unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function sentBody(call = 0) {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

describe("realtimeVoiceApi", () => {
  it("starts a session with Bearer auth and returns only the contract fields", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ...START_OK, extra: "ignored" }));
    const result = await startRealtimeSession({ sdpOffer: "offer", voice: "marin", conversationId: "c1" });
    expect(result).toEqual(START_OK);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(REALTIME_VOICE_ENDPOINT);
    expect(init.headers.Authorization).toBe("Bearer token");
    expect(sentBody()).toEqual({ action: "start", sdpOffer: "offer", voice: "marin", conversationId: "c1" });
  });

  it("omits conversationId when not given", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, START_OK));
    await startRealtimeSession({ sdpOffer: "offer", voice: "cedar", conversationId: null });
    expect(sentBody()).toEqual({ action: "start", sdpOffer: "offer", voice: "cedar" });
  });

  it("rejects an incomplete start response", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ...START_OK, sdpAnswer: "" }));
    await expect(startRealtimeSession({ sdpOffer: "o", voice: "marin" })).rejects.toMatchObject({
      code: "invalid_response",
    });
    fetchMock.mockResolvedValueOnce(respond(200, { ...START_OK, heartbeatSec: 0 }));
    await expect(startRealtimeSession({ sdpOffer: "o", voice: "marin" })).rejects.toMatchObject({
      code: "invalid_response",
    });
    fetchMock.mockResolvedValueOnce(respond(200, "not json"));
    await expect(startRealtimeSession({ sdpOffer: "o", voice: "marin" })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("parses 402 limit errors with the voice limit copy", async () => {
    fetchMock.mockResolvedValueOnce(respond(402, { error: "Monthly AI voice limit reached.", code: "ai_monthly_limit_reached" }));
    const error = await startRealtimeSession({ sdpOffer: "o", voice: "marin" }).catch((e) => e);
    expect(error).toBeInstanceOf(RealtimeApiError);
    expect(error).toMatchObject({ code: "ai_monthly_limit_reached", status: 402 });
    expect(error.message).toBe(formatMonthlyAiLimitMessage("voice"));
  });

  it("maps statuses without a known code", async () => {
    fetchMock.mockResolvedValueOnce(respond(502, "<html>"));
    await expect(markRealtimeConnected("s1")).rejects.toMatchObject({ code: "realtime_unavailable", status: 502 });
    fetchMock.mockResolvedValueOnce(respond(429, {}));
    await expect(markRealtimeConnected("s1")).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("maps network failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(markRealtimeConnected("s1")).rejects.toMatchObject({ code: "network_error", status: 0 });
  });

  it("fails as unauthorized without a session", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    await expect(markRealtimeConnected("s1")).rejects.toMatchObject({ code: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("realtimeErrorCode", () => {
    expect(realtimeErrorCode(402, "free_tier_session_limit")).toBe("free_tier_session_limit");
    expect(realtimeErrorCode(402, "realtime_conversation_tier_required")).toBe("realtime_conversation_tier_required");
    expect(realtimeErrorCode(409, "realtime_session_active")).toBe("realtime_session_active");
    expect(realtimeErrorCode(409, undefined)).toBe("realtime_session_active");
    expect(realtimeErrorCode(401, undefined)).toBe("unauthorized");
    expect(realtimeErrorCode(403, "other")).toBe("unauthorized");
    expect(realtimeErrorCode(400, "bad")).toBe("request_failed");
    expect(realtimeErrorCode(503, null)).toBe("realtime_unavailable");
  });

  it("heartbeat returns a known stop or null", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, stop: "budget_reached" }));
    expect(await sendRealtimeHeartbeat("s1", { responsesSeen: 2, transcriptionsSeen: 1 })).toEqual({
      stop: "budget_reached",
    });
    expect(sentBody()).toEqual({ action: "heartbeat", realtimeSessionId: "s1", responsesSeen: 2, transcriptionsSeen: 1 });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, stop: "weird" }));
    expect(await sendRealtimeHeartbeat("s1", { responsesSeen: 0, transcriptionsSeen: 0 })).toEqual({ stop: null });
  });

  it("reports usage and reads duplicate", async () => {
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, duplicate: true }));
    const usage = {
      kind: "response" as const,
      externalEventId: "r1",
      usage: {
        inputTokens: 1,
        cachedInputTokens: 0,
        outputTokens: 1,
        audioInputTokens: 0,
        cachedAudioInputTokens: 0,
        audioOutputTokens: 0,
      },
    };
    expect(await reportRealtimeUsage("s1", usage)).toEqual({ duplicate: true });
    expect(sentBody()).toEqual({ action: "usage", realtimeSessionId: "s1", ...usage });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }));
    expect(await reportRealtimeUsage("s1", usage)).toEqual({ duplicate: false });
  });

  it("persists transcript items and reads crisis", async () => {
    const items = [{ itemId: "u1", role: "user" as const, text: "Hi", interrupted: false }];
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, crisis: { level: 3, text: "Please call 988." } }));
    expect(await persistRealtimeTranscript("s1", items)).toEqual({ crisis: { level: 3, text: "Please call 988." } });
    expect(sentBody()).toEqual({ action: "transcript", realtimeSessionId: "s1", items });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, crisis: { text: "x" } }));
    expect(await persistRealtimeTranscript("s1", items)).toEqual({ crisis: { level: 0, text: "x" } });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, crisis: { level: 2 } }));
    expect(await persistRealtimeTranscript("s1", items)).toEqual({ crisis: null });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }));
    expect(await persistRealtimeTranscript("s1", items)).toEqual({ crisis: null });
  });

  it("calls tools and returns output or error", async () => {
    const input = { realtimeSessionId: "s1", callId: "c1", name: "lookup", arguments: "{}" };
    fetchMock.mockResolvedValueOnce(respond(200, { output: "result" }));
    expect(await callRealtimeTool(input)).toEqual({ output: "result" });
    fetchMock.mockResolvedValueOnce(respond(200, { error: "tool_not_available" }));
    expect(await callRealtimeTool(input)).toEqual({ error: "tool_not_available" });
    fetchMock.mockResolvedValueOnce(respond(200, {}));
    expect(await callRealtimeTool(input)).toEqual({ error: "tool_failed" });
  });

  it("ends a session", async () => {
    const input = { realtimeSessionId: "s1", reason: "user_ended" as const, responsesSeen: 3, transcriptionsSeen: 2 };
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true, usageStatus: "complete" }));
    expect(await endRealtimeSession(input)).toEqual({ usageStatus: "complete" });
    expect(sentBody()).toEqual({ action: "end", ...input });
    fetchMock.mockResolvedValueOnce(respond(200, { ok: true }));
    expect(await endRealtimeSession(input)).toEqual({ usageStatus: null });
  });

  it("ends with keepalive using the given token, never throwing", () => {
    const input = { realtimeSessionId: "s1", reason: "abandoned" as const, responsesSeen: 0, transcriptionsSeen: 0 };
    fetchMock.mockReturnValueOnce(Promise.reject(new Error("gone")));
    endRealtimeSessionKeepalive(input, "cached-token");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.keepalive).toBe(true);
    expect(init.headers.Authorization).toBe("Bearer cached-token");
    expect(sentBody()).toEqual({ action: "end", ...input });

    fetchMock.mockImplementationOnce(() => {
      throw new Error("sync failure");
    });
    expect(() => endRealtimeSessionKeepalive(input, "t")).not.toThrow();
  });
});
