import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleRealtimeAction,
  isRealtimeAction,
  type RealtimeContext,
} from "../../../../../supabase/functions/realtime-voice/handlers.ts";
import { parseCallId } from "../../../../../supabase/functions/realtime-voice/openaiCalls.ts";
import { deriveUsageStatus } from "../../../../../supabase/functions/realtime-voice/usage.ts";
import { buildRealtimeSessionConfig } from "../../../../../supabase/functions/realtime-voice/sessionConfig.ts";
import type { RealtimeTool } from "../../../../../supabase/functions/realtime-voice/tools/registry.ts";
import { clearAiPricingCache, computeCostUsd } from "../../../../../supabase/functions/_shared/aiUsage.ts";
import { CRISIS_RESPONSE_TEXT } from "../../../../../supabase/functions/chat/crisisDetect.ts";
import { FakeDb, type Row } from "./fakeSupabase";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-10-15T10:00:00.000Z");
const SDP = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n";
const INSTRUCTIONS = "SECRET COACHING INSTRUCTIONS for Kota";

let db: FakeDb;
let now: Date;
let fetchMock: ReturnType<typeof vi.fn>;
let buildPrompt: ReturnType<typeof vi.fn>;
let budgetAllowed: boolean;
let sessionGateAllowed: boolean;
let tools: RealtimeTool[];

function ctx(userId = USER, overrides: Partial<RealtimeContext> = {}): RealtimeContext {
  return {
    userClient: db.client(),
    admin: db.client(),
    userId,
    env: { apiKey: "sk-test-secret-key", model: "gpt-realtime-2.1", transcribeModel: "gpt-4o-mini-transcribe" },
    fetch: fetchMock as unknown as typeof fetch,
    now: () => now,
    tools,
    buildPrompt: buildPrompt as unknown as RealtimeContext["buildPrompt"],
    ...overrides,
  };
}

function callsResponse(status = 201, location = "/v1/realtime/calls/rtc_u2_abc123") {
  return new Response(status < 300 ? "v=0\r\nanswer" : '{"error":{"message":"echo SECRET COACHING INSTRUCTIONS"}}', {
    status,
    headers: { "Content-Type": "text/plain", Location: location },
  });
}

function seedSession(row: Partial<Row> = {}): Row {
  const conversation = db.seed("chatConversation", { userId: USER, sessionType: "voice_conversation", title: "c" });
  return db.seed("realtimeVoiceSession", {
    userId: USER,
    conversationId: conversation.id,
    openaiCallId: "rtc_u2_live",
    model: "gpt-realtime-2.1",
    voice: "marin",
    transcriptionModel: "gpt-4o-mini-transcribe",
    status: "active",
    startedAt: new Date(NOW.getTime() - 60_000).toISOString(),
    connectedAt: new Date(NOW.getTime() - 50_000).toISOString(),
    expiresAt: new Date(NOW.getTime() + 30 * 60_000).toISOString(),
    ...row,
  });
}

function session(id: unknown): Row {
  return db.rows("realtimeVoiceSession").find((row) => row.id === id)!;
}

beforeEach(() => {
  db = new FakeDb();
  now = NOW;
  budgetAllowed = true;
  sessionGateAllowed = true;
  tools = [];
  clearAiPricingCache();
  db.rpcHandlers.check_ai_budget = () => ({ data: { allowed: budgetAllowed, tier: "free" }, error: null });
  db.rpcHandlers.realtime_voice_sweep = () => ({ data: 0, error: null });
  db.rpcHandlers.consume_chat_session = () => ({
    data: sessionGateAllowed ? { allowed: true, recorded: true } : { allowed: false, code: "free_tier_session_limit" },
    error: null,
  });
  for (const [model, unit, usdPerUnit] of [
    ["gpt-realtime-2.1", "token_in_1m", 4],
    ["gpt-realtime-2.1", "token_cached_in_1m", 0.4],
    ["gpt-realtime-2.1", "token_out_1m", 24],
    ["gpt-realtime-2.1", "audio_token_in_1m", 32],
    ["gpt-realtime-2.1", "audio_token_cached_in_1m", 0.4],
    ["gpt-realtime-2.1", "audio_token_out_1m", 64],
    ["gpt-4o-mini-transcribe", "audio_token_in_1m", 1.25],
    ["gpt-4o-mini-transcribe", "token_out_1m", 5],
    ["gpt-4o-mini-transcribe", "audio_minute", 0.003],
  ] as const) {
    db.seed("aiModelPricing", { provider: "openai", model, unit, usdPerUnit, effectiveFrom: "2026-01-01T00:00:00Z" });
  }
  fetchMock = vi.fn(async (url: string) =>
    String(url).endsWith("/hangup") ? new Response(null, { status: 200 }) : callsResponse(),
  );
  buildPrompt = vi.fn(async () => ({ system: INSTRUCTIONS, profile: { liveContext: {} } }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("start", () => {
  it("creates the conversation + session and returns only the contract fields", async () => {
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "cedar" });
    expect(result.status).toBe(200);
    const { realtimeSessionId, conversationId } = result.body as Record<string, string>;
    expect(Object.keys(result.body).sort()).toEqual(
      ["conversationId", "expiresAt", "heartbeatSec", "idleTimeoutSec", "model", "ok", "realtimeSessionId", "sdpAnswer", "voice"].sort(),
    );
    expect(result.body).toMatchObject({
      sdpAnswer: "v=0\r\nanswer",
      model: "gpt-realtime-2.1",
      voice: "cedar",
      heartbeatSec: 30,
      idleTimeoutSec: 600,
      expiresAt: new Date(NOW.getTime() + 58 * 60_000).toISOString(),
    });
    const body = JSON.stringify(result.body);
    expect(body).not.toContain("sk-");
    expect(body).not.toContain("client_secret");
    expect(body).not.toContain(INSTRUCTIONS);

    expect(db.rows("chatConversation").find((row) => row.id === conversationId)).toMatchObject({
      userId: USER,
      sessionType: "voice_conversation",
    });
    expect(session(realtimeSessionId)).toMatchObject({
      userId: USER,
      conversationId,
      status: "connecting",
      openaiCallId: "rtc_u2_abc123",
      voice: "cedar",
      transcriptionModel: "gpt-4o-mini-transcribe",
      planTierAtStart: "free",
    });
    expect(buildPrompt).toHaveBeenCalledWith(expect.objectContaining({ userId: USER, sessionType: "voice_conversation" }));
    expect(db.rpcCalls.map((call) => call.fn)).toEqual(
      expect.arrayContaining(["check_ai_budget", "realtime_voice_sweep", "consume_chat_session"]),
    );
  });

  it("posts the SDP + session config to /v1/realtime/calls with the server key", async () => {
    await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/realtime/calls");
    expect(init.headers.Authorization).toBe("Bearer sk-test-secret-key");
    const form = init.body as FormData;
    expect(form.get("sdp")).toBe(SDP);
    const config = JSON.parse(String(form.get("session")));
    expect(config).toMatchObject({
      type: "realtime",
      model: "gpt-realtime-2.1",
      instructions: INSTRUCTIONS,
      audio: {
        input: {
          turn_detection: { type: "semantic_vad", create_response: true, interrupt_response: true },
          transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
        },
        output: { voice: "marin" },
      },
      truncation: { type: "retention_ratio", retention_ratio: 0.8 },
    });
    expect(config.tools).toBeUndefined();
  });

  it("reuses an unfinished voice_conversation of the caller (Retry)", async () => {
    const conversation = db.seed("chatConversation", { userId: USER, sessionType: "voice_conversation" });
    const result = await handleRealtimeAction(ctx(), "start", {
      sdpOffer: SDP,
      voice: "marin",
      conversationId: conversation.id,
    });
    expect(result.body.conversationId).toBe(conversation.id);
    expect(db.rows("chatConversation")).toHaveLength(1);
  });

  it.each([
    ["another user's conversation", { userId: OTHER, sessionType: "voice_conversation" }],
    ["a finalized conversation", { userId: USER, sessionType: "voice_conversation", finalizedAt: NOW.toISOString() }],
    ["a different session type", { userId: USER, sessionType: "voice" }],
  ])("refuses to reuse %s", async (_label, row) => {
    const conversation = db.seed("chatConversation", row);
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin", conversationId: conversation.id });
    expect(result).toMatchObject({ status: 400, body: { code: "invalid_conversation" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Retry reuse is allowed only after a recoverable failure, and bounded", async () => {
    const conversation = db.seed("chatConversation", { userId: USER, sessionType: "voice_conversation" });
    const retry = () =>
      handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin", conversationId: conversation.id });
    const prior = (endReason: string) =>
      db.seed("realtimeVoiceSession", {
        userId: USER,
        conversationId: conversation.id,
        model: "m",
        voice: "marin",
        status: "ended",
        endReason,
        startedAt: db.nextTime(),
        expiresAt: NOW.toISOString(),
      });

    prior("user_ended");
    expect((await retry()).body.code).toBe("invalid_conversation");

    prior("network_lost");
    const ok = await retry();
    expect(ok.status).toBe(200);
    await handleRealtimeAction(ctx(), "end", { realtimeSessionId: ok.body.realtimeSessionId, reason: "network_lost" });

    prior("network_lost");
    prior("network_lost");
    expect((await retry()).body.code).toBe("invalid_conversation");
  });

  it("hangs up the caller's swept (abandoned) calls at start", async () => {
    db.seed("realtimeVoiceSession", {
      userId: USER,
      model: "m",
      voice: "marin",
      status: "ended",
      endReason: "abandoned",
      openaiCallId: "rtc_u2_stale",
      startedAt: new Date(NOW.getTime() - 10 * 60_000).toISOString(),
      expiresAt: NOW.toISOString(),
    });
    db.seed("realtimeVoiceSession", {
      userId: USER,
      model: "m",
      voice: "marin",
      status: "ended",
      endReason: "abandoned",
      openaiCallId: "rtc_u2_ancient",
      startedAt: new Date(NOW.getTime() - 3 * 60 * 60_000).toISOString(),
      expiresAt: NOW.toISOString(),
    });
    db.seed("realtimeVoiceSession", {
      userId: OTHER,
      model: "m",
      voice: "marin",
      status: "ended",
      endReason: "abandoned",
      openaiCallId: "rtc_u2_other",
      startedAt: NOW.toISOString(),
      expiresAt: NOW.toISOString(),
    });
    await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toContain("https://api.openai.com/v1/realtime/calls/rtc_u2_stale/hangup");
    expect(urls.some((url) => url.includes("rtc_u2_ancient") || url.includes("rtc_u2_other"))).toBe(false);
  });

  it("validates input", async () => {
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "nova" })).body.code).toBe("invalid_voice");
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: "nope", voice: "marin" })).status).toBe(400);
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP + "x".repeat(20_000), voice: "marin" })).status).toBe(400);
    expect(
      (await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin", conversationId: "not-a-uuid" })).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("402 when the monthly voice budget is used up, without calling OpenAI", async () => {
    budgetAllowed = false;
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result).toMatchObject({ status: 402, body: { code: "ai_monthly_limit_reached", mode: "voice" } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.rows("chatConversation")).toHaveLength(0);
  });

  it("402 at the Free-tier session cap and removes the conversation it just created", async () => {
    sessionGateAllowed = false;
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result).toMatchObject({ status: 402, body: { code: "free_tier_session_limit" } });
    expect(db.rows("chatConversation")).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("409 when the caller already has an open session (after the sweep)", async () => {
    seedSession({ status: "connecting" });
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result).toMatchObject({ status: 409, body: { code: "realtime_session_active" } });
    expect(db.rpcCalls.some((call) => call.fn === "realtime_voice_sweep")).toBe(true);
  });

  it("409 when a concurrent start wins the unique open-session index (23505)", async () => {
    db.failures.set("realtimeVoiceSession:insert", { code: "23505", message: "duplicate key" });
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result).toMatchObject({ status: 409, body: { code: "realtime_session_active" } });
    expect(db.rows("chatConversation")).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("another user's open session does not block", async () => {
    seedSession({ userId: OTHER });
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" })).status).toBe(200);
  });

  it("502 realtime_unavailable when OpenAI fails; the row is closed honestly and the body is not logged", async () => {
    fetchMock.mockResolvedValueOnce(callsResponse(500));
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result).toMatchObject({ status: 502, body: { code: "realtime_unavailable" } });
    expect(db.rows("realtimeVoiceSession")[0]).toMatchObject({
      status: "failed",
      endReason: "connect_failed",
      usageStatus: "complete",
      durationSeconds: 0,
    });
    const logged = JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain("500");
    expect(logged).not.toContain("SECRET");
  });

  it("502 when fetch throws or the key is missing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" })).status).toBe(502);
    const noKey = ctx(USER, { env: { apiKey: null, model: "m", transcribeModel: "t" } });
    expect((await handleRealtimeAction(noKey, "start", { sdpOffer: SDP, voice: "marin" })).body.code).toBe(
      "realtime_unavailable",
    );
  });

  it("keeps working without a call id in Location", async () => {
    fetchMock.mockResolvedValueOnce(callsResponse(201, "/elsewhere"));
    const result = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(result.status).toBe(200);
    expect(session(result.body.realtimeSessionId).openaiCallId).toBeNull();
  });

  it("404 without a profile and refuses on a live crisis signal", async () => {
    buildPrompt.mockResolvedValueOnce(null);
    expect((await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" })).status).toBe(404);
    expect(db.rows("chatConversation")).toHaveLength(0);

    buildPrompt.mockResolvedValueOnce({
      system: INSTRUCTIONS,
      profile: { liveContext: { latestCheckIn: { feeling: "I want to die" } } },
    });
    const crisis = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin" });
    expect(crisis).toMatchObject({ status: 403, body: { code: "crisis", crisis: { level: 3, text: CRISIS_RESPONSE_TEXT } } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(db.rows("chatConversation")).toHaveLength(0);
  });

  it("sends tools only when the registry is non-empty", () => {
    const base = { model: "m", instructions: "i", voice: "marin" as const, transcribeModel: "t" };
    expect(buildRealtimeSessionConfig({ ...base, tools: [] })).not.toHaveProperty("tools");
    const config = buildRealtimeSessionConfig({ ...base, tools: [fakeTool()] });
    expect(config).toMatchObject({
      tools: [{ type: "function", name: "lookup", description: "Look up", parameters: { type: "object" } }],
      tool_choice: "auto",
    });
  });
});

describe("connected / heartbeat / end", () => {
  it("connected activates a connecting session once", async () => {
    const row = seedSession({ status: "connecting", connectedAt: null });
    expect((await handleRealtimeAction(ctx(), "connected", { realtimeSessionId: row.id })).status).toBe(200);
    expect(session(row.id)).toMatchObject({ status: "active", connectedAt: NOW.toISOString() });
    expect((await handleRealtimeAction(ctx(), "connected", { realtimeSessionId: row.id })).status).toBe(200);
  });

  it("every action refuses another user's session or a bad id", async () => {
    const row = seedSession();
    for (const action of ["connected", "heartbeat", "end", "usage", "transcript", "tool"] as const) {
      const body = {
        realtimeSessionId: row.id,
        responsesSeen: 0,
        transcriptionsSeen: 0,
        reason: "user_ended",
        kind: "response",
        externalEventId: "resp_1",
        usage: {},
        items: [{ itemId: "i1", role: "user", text: "hi" }],
        callId: "c1",
        name: "lookup",
      };
      expect((await handleRealtimeAction(ctx(OTHER), action, body)).status).toBe(404);
      expect((await handleRealtimeAction(ctx(), action, { ...body, realtimeSessionId: "x" })).status).toBe(404);
    }
    expect(session(row.id).status).toBe("active");
    expect(db.rows("aiUsageEvent")).toHaveLength(0);
    expect(db.rows("chatMessage")).toHaveLength(0);
  });

  it("connected on an ended session is 409", async () => {
    const row = seedSession({ status: "ended", endedAt: NOW.toISOString() });
    expect((await handleRealtimeAction(ctx(), "connected", { realtimeSessionId: row.id })).status).toBe(409);
  });

  it("heartbeat stores max counters (capped by connected time)", async () => {
    const row = seedSession({ responsesSeen: 5 });
    const result = await handleRealtimeAction(ctx(), "heartbeat", {
      realtimeSessionId: row.id,
      responsesSeen: 3,
      transcriptionsSeen: 2,
    });
    expect(result.body).toEqual({ ok: true });
    expect(session(row.id)).toMatchObject({ responsesSeen: 5, transcriptionsSeen: 2, lastHeartbeatAt: NOW.toISOString() });

    // 50 s connected + 10 slack: an inflated self-report is capped at 60.
    await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: 90_000, transcriptionsSeen: 0 });
    expect(session(row.id).responsesSeen).toBe(60);
  });

  it("budget stop is enforced on the server: session closed and call hung up", async () => {
    const row = seedSession();
    budgetAllowed = false;
    const result = await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: 1, transcriptionsSeen: 0 });
    expect(result.body).toEqual({ ok: true, stop: "budget_reached" });
    expect(session(row.id)).toMatchObject({ status: "ended", endReason: "budget_reached" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("rtc_u2_live/hangup"), expect.anything());
    // A client that ignores the stop gets nothing more.
    expect((await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: 1, transcriptionsSeen: 0 })).status).toBe(409);
  });

  it("max duration is enforced on the server after expiresAt", async () => {
    const row = seedSession();
    now = new Date(NOW.getTime() + 31 * 60_000);
    const result = await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: 0, transcriptionsSeen: 0 });
    expect(result.body).toEqual({ ok: true, stop: "max_duration" });
    expect(session(row.id)).toMatchObject({ status: "ended", endReason: "max_duration" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/hangup"), expect.anything());
  });

  it("heartbeat validates counters and refuses closed sessions", async () => {
    const row = seedSession();
    expect((await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: -1, transcriptionsSeen: 0 })).status).toBe(400);
    expect((await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: row.id, responsesSeen: 1.5, transcriptionsSeen: 0 })).status).toBe(400);
    const ended = seedSession({ status: "ended" });
    expect((await handleRealtimeAction(ctx(), "heartbeat", { realtimeSessionId: ended.id, responsesSeen: 0, transcriptionsSeen: 0 })).status).toBe(409);
  });

  it("end closes, derives usageStatus, hangs up, and is idempotent", async () => {
    const row = seedSession({ responsesReported: 2, transcriptionsReported: 1 });
    const result = await handleRealtimeAction(ctx(), "end", {
      realtimeSessionId: row.id,
      reason: "user_ended",
      responsesSeen: 2,
      transcriptionsSeen: 1,
    });
    expect(result.body).toEqual({ ok: true, usageStatus: "complete" });
    expect(session(row.id)).toMatchObject({
      status: "ended",
      endReason: "user_ended",
      endedAt: NOW.toISOString(),
      durationSeconds: 50,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/realtime/calls/rtc_u2_live/hangup",
      expect.objectContaining({ method: "POST" }),
    );

    const again = await handleRealtimeAction(ctx(), "end", { realtimeSessionId: row.id, reason: "error" });
    expect(again.body).toEqual({ ok: true, usageStatus: "complete" });
    expect(session(row.id).endReason).toBe("user_ended");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("end reports partial / unknown from the counters", async () => {
    const partial = seedSession({ responsesReported: 1 });
    expect(
      (await handleRealtimeAction(ctx(), "end", { realtimeSessionId: partial.id, reason: "network_lost", responsesSeen: 3, transcriptionsSeen: 0 })).body
        .usageStatus,
    ).toBe("partial");
    const unknown = seedSession();
    expect(
      (await handleRealtimeAction(ctx(), "end", { realtimeSessionId: unknown.id, reason: "abandoned", responsesSeen: 2, transcriptionsSeen: 1 })).body
        .usageStatus,
    ).toBe("unknown");
    const never = seedSession({ status: "connecting", connectedAt: null });
    const neverResult = await handleRealtimeAction(ctx(), "end", { realtimeSessionId: never.id, reason: "connect_failed" });
    expect(neverResult.body.usageStatus).toBe("complete");
    expect(session(never.id).durationSeconds).toBe(0);
  });

  it("end never revives a session the sweeper closed", async () => {
    const row = seedSession();
    // The sweeper closes it between our read and our update.
    db.failures.clear();
    const admin = db.client();
    const racing = ctx(USER, {
      admin: {
        ...admin,
        from: (table: string) => {
          const query = admin.from(table);
          if (table === "realtimeVoiceSession") {
            const original = query.update.bind(query);
            (query as unknown as { update: typeof original }).update = (patch) => {
              Object.assign(session(row.id), { status: "ended", endReason: "abandoned", usageStatus: "unknown" });
              return original(patch);
            };
          }
          return query;
        },
      } as typeof admin,
    });
    const result = await handleRealtimeAction(racing, "end", { realtimeSessionId: row.id, reason: "user_ended" });
    expect(result.body).toEqual({ ok: true, usageStatus: "unknown" });
    expect(session(row.id).endReason).toBe("abandoned");
  });

  it("end validates the reason", async () => {
    const row = seedSession();
    expect((await handleRealtimeAction(ctx(), "end", { realtimeSessionId: row.id, reason: "because" })).status).toBe(400);
    expect((await handleRealtimeAction(ctx(), "end", { realtimeSessionId: row.id, reason: "user_ended", responsesSeen: -2 })).status).toBe(400);
  });
});

describe("usage", () => {
  const responseUsage = {
    inputTokens: 1000,
    cachedInputTokens: 800,
    outputTokens: 100,
    audioInputTokens: 500,
    cachedAudioInputTokens: 100,
    audioOutputTokens: 2000,
  };

  it("records a response with the session's model and audio pricing, then counts it", async () => {
    const row = seedSession();
    const result = await handleRealtimeAction(ctx(), "usage", {
      realtimeSessionId: row.id,
      kind: "response",
      externalEventId: "resp_1",
      model: "gpt-4o-mini",
      usage: responseUsage,
    });
    expect(result.body).toEqual({ ok: true, duplicate: false });
    const event = db.rows("aiUsageEvent")[0];
    // (200×4 + 800×0.4 + 100×24 + 400×32 + 100×0.4 + 2000×64) / 1M
    const expected = (200 * 4 + 800 * 0.4 + 100 * 24 + 400 * 32 + 100 * 0.4 + 2000 * 64) / 1_000_000;
    expect(event).toMatchObject({
      userId: USER,
      conversationId: row.conversationId,
      realtimeSessionId: row.id,
      externalEventId: "resp_1",
      mode: "voice",
      source: "realtime_response",
      model: "gpt-realtime-2.1",
      audioInputTokens: 500,
      cachedAudioInputTokens: 100,
      audioOutputTokens: 2000,
      pricingMissing: false,
    });
    expect(event.costUsd).toBeCloseTo(expected, 6);
    expect(session(row.id).responsesReported).toBe(1);
  });

  it("is idempotent by externalEventId", async () => {
    const row = seedSession();
    const body = { realtimeSessionId: row.id, kind: "response", externalEventId: "resp_1", usage: responseUsage };
    await handleRealtimeAction(ctx(), "usage", body);
    expect((await handleRealtimeAction(ctx(), "usage", body)).body).toEqual({ ok: true, duplicate: true });
    expect(db.rows("aiUsageEvent")).toHaveLength(1);
    expect(session(row.id).responsesReported).toBe(1);
  });

  it("records transcription with the transcription model (tokens or duration)", async () => {
    const row = seedSession();
    await handleRealtimeAction(ctx(), "usage", {
      realtimeSessionId: row.id,
      kind: "transcription",
      externalEventId: "item_1",
      usage: { audioInputTokens: 40, outputTokens: 10 },
    });
    await handleRealtimeAction(ctx(), "usage", {
      realtimeSessionId: row.id,
      kind: "transcription",
      externalEventId: "item_2",
      usage: { audioSeconds: 6 },
    });
    const [tokens, duration] = db.rows("aiUsageEvent");
    expect(tokens).toMatchObject({ source: "realtime_transcription", model: "gpt-4o-mini-transcribe" });
    expect(tokens.costUsd).toBeCloseTo((40 * 1.25 + 10 * 5) / 1_000_000, 9);
    expect(duration.costUsd).toBeCloseTo(0.0003, 9);
    expect(session(row.id).transcriptionsReported).toBe(2);
  });

  it("marks pricingMissing for a model without prices instead of $0", async () => {
    const row = seedSession({ model: "gpt-realtime-unpriced" });
    await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: row.id, kind: "response", externalEventId: "r", usage: { outputTokens: 5 } });
    expect(db.rows("aiUsageEvent")[0]).toMatchObject({ pricingMissing: true, costUsd: 0 });
  });

  it.each([
    ["unknown kind", { kind: "other", externalEventId: "x", usage: {} }],
    ["bad event id", { kind: "response", externalEventId: "has space", usage: {} }],
    ["over the cap", { kind: "response", externalEventId: "x", usage: { inputTokens: 200_001 } }],
    ["negative", { kind: "response", externalEventId: "x", usage: { outputTokens: -1 } }],
    ["fractional", { kind: "response", externalEventId: "x", usage: { outputTokens: 1.5 } }],
    ["cached above input", { kind: "response", externalEventId: "x", usage: { inputTokens: 1, cachedInputTokens: 2 } }],
    ["cached audio above audio", { kind: "response", externalEventId: "x", usage: { cachedAudioInputTokens: 1 } }],
    ["audio seconds too long", { kind: "transcription", externalEventId: "x", usage: { audioSeconds: 4000 } }],
    ["usage not an object", { kind: "response", externalEventId: "x", usage: [1] }],
  ])("rejects %s", async (_label, payload) => {
    const row = seedSession();
    expect((await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: row.id, ...payload })).status).toBe(400);
    expect(db.rows("aiUsageEvent")).toHaveLength(0);
  });

  it("accepts late usage within 10 min of the end and refreshes usageStatus; refuses after", async () => {
    const row = seedSession({
      status: "ended",
      endedAt: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
      responsesSeen: 1,
      usageStatus: "unknown",
    });
    await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: row.id, kind: "response", externalEventId: "r", usage: { outputTokens: 1 } });
    expect(session(row.id)).toMatchObject({ responsesReported: 1, usageStatus: "complete" });

    now = new Date(NOW.getTime() + 6 * 60_000);
    expect(
      (await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: row.id, kind: "response", externalEventId: "r2", usage: {} })).status,
    ).toBe(409);
    const failed = seedSession({ status: "failed" });
    expect(
      (await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: failed.id, kind: "response", externalEventId: "r3", usage: {} })).status,
    ).toBe(409);
  });

  it("400 for transcription usage when the session has no transcription model", async () => {
    const row = seedSession({ transcriptionModel: null });
    expect(
      (await handleRealtimeAction(ctx(), "usage", { realtimeSessionId: row.id, kind: "transcription", externalEventId: "i", usage: {} })).status,
    ).toBe(400);
  });
});

describe("transcript", () => {
  const items = [
    { itemId: "item_u1", role: "user", text: "  I feel stuck at work. " },
    { itemId: "item_a1", role: "assistant", text: "Tell me more.", interrupted: true },
    { itemId: "item_a0", role: "assistant", text: "   " },
  ];

  it("writes items in order into the session's conversation (idempotent)", async () => {
    const row = seedSession();
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items })).body).toEqual({ ok: true });
    await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items });
    expect(db.rows("chatMessage").map((m) => [m.realtimeItemId, m.sender, m.isFromUser, m.content, m.conversationId])).toEqual([
      ["item_u1", "user", true, "I feel stuck at work.", row.conversationId],
      ["item_a1", "assistant", false, "Tell me more.", row.conversationId],
    ]);
    expect(db.rows("chatConversation")[0].updatedAt).toBe(NOW.toISOString());
  });

  it("ignores a conversationId in the request body", async () => {
    const row = seedSession();
    const foreign = db.seed("chatConversation", { userId: OTHER });
    await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, conversationId: foreign.id, items });
    expect(db.rows("chatMessage").every((m) => m.conversationId === row.conversationId)).toBe(true);
  });

  it("410 when the conversation is gone", async () => {
    const detached = seedSession({ conversationId: null });
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: detached.id, items })).status).toBe(410);
    const row = seedSession();
    db.tables.chatConversation = db.rows("chatConversation").filter((c) => c.id !== row.conversationId);
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items })).status).toBe(410);
    expect(db.rows("chatMessage")).toHaveLength(0);
  });

  it.each([
    ["empty list", []],
    ["too many", Array.from({ length: 51 }, (_, i) => ({ itemId: `i${i}`, role: "user", text: "x" }))],
    ["bad role", [{ itemId: "i", role: "system", text: "x" }]],
    ["bad id", [{ itemId: "a b", role: "user", text: "x" }]],
    ["duplicate ids", [{ itemId: "i", role: "user", text: "x" }, { itemId: "i", role: "user", text: "y" }]],
    ["too long", [{ itemId: "i", role: "user", text: "x".repeat(8001) }]],
    ["reserved crisis id", [{ itemId: "crisis_abc", role: "user", text: "x" }]],
    ["not an array", "nope"],
  ])("rejects %s", async (_label, bad) => {
    const row = seedSession();
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items: bad })).status).toBe(400);
  });

  it("crisis: saves the turn, flags the conversation and profile, ends the session and hangs up", async () => {
    const row = seedSession();
    db.seed("profiles", { id: USER, hasPriorCrisisSession: false });
    const result = await handleRealtimeAction(ctx(), "transcript", {
      realtimeSessionId: row.id,
      items: [{ itemId: "item_u9", role: "user", text: "Honestly I want to die." }],
    });
    expect(result.body).toMatchObject({ ok: true, crisis: { level: 3, text: CRISIS_RESPONSE_TEXT } });
    expect(db.rows("chatMessage").map((m) => [m.sender, m.content, m.realtimeItemId])).toEqual([
      ["user", "Honestly I want to die.", "item_u9"],
      ["assistant", CRISIS_RESPONSE_TEXT, `crisis_${row.id}`],
    ]);
    expect(db.rows("chatConversation")[0].hadCrisisEscalation).toBe(true);
    expect(db.rows("profiles")[0].hasPriorCrisisSession).toBe(true);
    expect(session(row.id)).toMatchObject({ status: "ended", endReason: "crisis" });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("rtc_u2_live/hangup"), expect.anything());
  });

  it("scans saved turns as context and ignores Kota's words", async () => {
    const row = seedSession();
    const kota = await handleRealtimeAction(ctx(), "transcript", {
      realtimeSessionId: row.id,
      items: [{ itemId: "a1", role: "assistant", text: "Some people say they want to die; that's serious." }],
    });
    expect(kota.body).toEqual({ ok: true });
    db.seed("chatMessage", { conversationId: row.conversationId, userId: USER, isFromUser: true, content: "I feel worthless" });
    const result = await handleRealtimeAction(ctx(), "transcript", {
      realtimeSessionId: row.id,
      items: [{ itemId: "u2", role: "user", text: "ok" }],
    });
    expect(result.body.crisis).toMatchObject({ level: 2 });
  });

  it("crisis found in the final flush records crisis as the end reason, so Retry is refused", async () => {
    const row = seedSession({ status: "ended", endReason: "network_lost", endedAt: NOW.toISOString() });
    const result = await handleRealtimeAction(ctx(), "transcript", {
      realtimeSessionId: row.id,
      items: [{ itemId: "u1", role: "user", text: "I want to die" }],
    });
    expect(result.body.crisis).toBeTruthy();
    expect(session(row.id).endReason).toBe("crisis");
    const retry = await handleRealtimeAction(ctx(), "start", {
      sdpOffer: SDP,
      voice: "marin",
      conversationId: row.conversationId,
    });
    expect(retry.body.code).toBe("invalid_conversation");
  });

  it("a conversation flagged with a crisis can never be reused", async () => {
    const conversation = db.seed("chatConversation", {
      userId: USER,
      sessionType: "voice_conversation",
      hadCrisisEscalation: true,
    });
    const retry = await handleRealtimeAction(ctx(), "start", { sdpOffer: SDP, voice: "marin", conversationId: conversation.id });
    expect(retry.body.code).toBe("invalid_conversation");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the final flush after end, not later", async () => {
    const row = seedSession({ status: "ended", endedAt: NOW.toISOString() });
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items })).status).toBe(200);
    now = new Date(NOW.getTime() + 11 * 60_000);
    expect((await handleRealtimeAction(ctx(), "transcript", { realtimeSessionId: row.id, items })).status).toBe(409);
  });
});

function fakeTool(handler = vi.fn(async (_ctx: unknown, args: { q: string }) => `result for ${args.q}`)): RealtimeTool {
  return {
    name: "lookup",
    description: "Look up",
    parameters: { type: "object", properties: { q: { type: "string" } } },
    parseArgs: (raw) =>
      raw && typeof raw === "object" && typeof (raw as { q?: unknown }).q === "string" ? (raw as { q: string }) : null,
    handler: handler as RealtimeTool["handler"],
  };
}

describe("tool", () => {
  it("unknown name → tool_not_available (never 500)", async () => {
    const row = seedSession();
    const result = await handleRealtimeAction(ctx(), "tool", { realtimeSessionId: row.id, callId: "c1", name: "search", arguments: "{}" });
    expect(result).toEqual({ status: 200, body: { error: "tool_not_available" } });
  });

  it("runs an allowlisted tool with the user's client and trims the output", async () => {
    const handler = vi.fn(async () => "x".repeat(5000));
    tools = [fakeTool(handler)];
    const row = seedSession();
    const result = await handleRealtimeAction(ctx(), "tool", { realtimeSessionId: row.id, callId: "c1", name: "lookup", arguments: '{"q":"sleep"}' });
    expect((result.body.output as string).length).toBe(4000);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, conversationId: row.conversationId }),
      { q: "sleep" },
    );
  });

  it("rejects invalid arguments and reports handler failures", async () => {
    tools = [fakeTool(vi.fn(async () => {
      throw new Error("boom");
    }))];
    const row = seedSession();
    const call = (args: string) =>
      handleRealtimeAction(ctx(), "tool", { realtimeSessionId: row.id, callId: "c1", name: "lookup", arguments: args });
    expect((await call("{bad json")).body).toEqual({ error: "invalid_arguments" });
    expect((await call('{"q":1}')).body).toEqual({ error: "invalid_arguments" });
    expect((await call('{"q":"x"}')).body).toEqual({ error: "tool_failed" });
  });

  it("requires an active session and valid ids", async () => {
    tools = [fakeTool()];
    const ended = seedSession({ status: "ended" });
    expect((await handleRealtimeAction(ctx(), "tool", { realtimeSessionId: ended.id, callId: "c1", name: "lookup", arguments: "{}" })).status).toBe(409);
    expect((await handleRealtimeAction(ctx(), "tool", { realtimeSessionId: ended.id, callId: "c 1", name: "lookup" })).status).toBe(400);
  });
});

describe("helpers", () => {
  it("isRealtimeAction", () => {
    expect(isRealtimeAction("start")).toBe(true);
    expect(isRealtimeAction("drop_tables")).toBe(false);
  });

  it("parseCallId takes the last Location segment and validates the rtc_ prefix", () => {
    expect(parseCallId("/v1/realtime/calls/rtc_u2_abc")).toBe("rtc_u2_abc");
    expect(parseCallId("https://api.openai.com/v1/realtime/calls/rtc_x?y=1")).toBe("rtc_x");
    expect(parseCallId("/v1/realtime/calls/call_x")).toBeNull();
    expect(parseCallId(null)).toBeNull();
  });

  it("deriveUsageStatus (plan §7.3)", () => {
    const base = { connectedAt: "t", responsesSeen: 2, responsesReported: 2, transcriptionsSeen: 1, transcriptionsReported: 1 };
    expect(deriveUsageStatus(base)).toBe("complete");
    expect(deriveUsageStatus({ ...base, connectedAt: null, responsesReported: 0 })).toBe("complete");
    expect(deriveUsageStatus({ ...base, responsesReported: 1 })).toBe("partial");
    expect(deriveUsageStatus({ ...base, responsesReported: 0, transcriptionsReported: 0 })).toBe("unknown");
  });

  it("computeCostUsd prices audio tokens and falls back for cached audio", () => {
    const pricing = [
      { provider: "openai", model: "m", unit: "audio_token_in_1m", usdPerUnit: 10, effectiveFrom: "2026-01-01" },
      { provider: "openai", model: "m", unit: "audio_token_out_1m", usdPerUnit: 20, effectiveFrom: "2026-01-01" },
    ];
    const result = computeCostUsd(pricing, "openai", "m", {
      audioInputTokens: 1_000_000,
      cachedAudioInputTokens: 500_000,
      audioOutputTokens: 1_000_000,
    });
    expect(result).toEqual({ costUsd: 5 + 5 + 20, pricingMissing: false });
    expect(computeCostUsd([], "openai", "m", { audioOutputTokens: 1 }).pricingMissing).toBe(true);
  });
});
