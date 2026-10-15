import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatMonthlyAiLimitMessage } from "@/lib/chat/chatSessionLimit";
import { RealtimeApiError } from "../realtimeVoiceApi";
import { INAUDIBLE_PLACEHOLDER } from "../persistQueue";
import {
  BUDGET_DRAIN_MS,
  CONNECT_TIMEOUT_MS,
  DISCONNECT_GRACE_MS,
  RealtimeConversationController,
  TIME_WARNING_MS,
  TRANSCRIPT_RETRY_MS,
} from "./realtimeConversationController";
import { START_RESULT, createFakeEnv, type FakeEnv } from "./realtimeTestFakes";

let env: FakeEnv;
let ctrl: RealtimeConversationController;

const flush = () => vi.advanceTimersByTimeAsync(0);

async function connect(conversationId?: string | null) {
  void ctrl.start("marin", conversationId);
  await flush();
  env.peer.setState("connected");
  await flush();
}

function phase() {
  return ctrl.getSnapshot().state.phase;
}

function userTurn(id: string, text: string, previous: string | null = null) {
  env.peer.dc.emit({ type: "conversation.item.added", previous_item_id: previous, item: { id, type: "message", role: "user" } });
  env.peer.dc.emit({
    type: "conversation.item.input_audio_transcription.completed",
    item_id: id,
    content_index: 0,
    transcript: text,
    usage: { type: "duration", seconds: 2 },
  });
}

function kotaTurn(id: string, text: string, previous: string, responseId = "resp-1") {
  env.peer.dc.emit({ type: "response.created", response: { id: responseId } });
  env.peer.dc.emit({ type: "conversation.item.added", previous_item_id: previous, item: { id, type: "message", role: "assistant" } });
  env.peer.dc.emit({ type: "response.output_audio_transcript.done", response_id: responseId, item_id: id, content_index: 0, transcript: text });
  env.peer.dc.emit({
    type: "response.done",
    response: { id: responseId, status: "completed", usage: { input_tokens: 10, output_tokens: 5 } },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  env = createFakeEnv();
  ctrl = new RealtimeConversationController(env.deps);
});

afterEach(() => {
  ctrl.dispose();
  vi.useRealTimers();
});

describe("start", () => {
  it("connects: mic → peer + data channel → offer → start → answer → connected", async () => {
    const seen: string[] = [];
    ctrl.subscribe(() => seen.push(phase()));
    await connect();

    expect(env.audio.autoplay).toBe(true);
    expect(env.audio.playCalls).toBeGreaterThanOrEqual(1);
    expect(env.peer.tracks).toEqual(env.stream.tracks);
    expect(env.api.start).toHaveBeenCalledWith({ sdpOffer: "offer-sdp", voice: "marin", conversationId: null });
    expect(env.peer.remoteSdp).toBe("answer-sdp");
    expect(env.api.connected).toHaveBeenCalledWith("rs-1");
    expect(seen).toEqual(expect.arrayContaining(["requesting_mic", "connecting", "listening"]));
    expect(ctrl.getSnapshot()).toMatchObject({
      conversationId: "conv-1",
      remainingMs: 60 * 60_000,
      timeWarning: false,
      error: null,
    });
  });

  it("goes live when the peer is already connected after the answer", async () => {
    env.peer.connectionState = "connected";
    void ctrl.start("marin");
    await flush();
    expect(phase()).toBe("listening");
  });

  it("ignores start while a session is busy", async () => {
    await connect();
    await ctrl.start("cedar");
    expect(env.api.start).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotAllowedError", "mic_denied"],
    ["SecurityError", "mic_denied"],
    ["NotFoundError", "mic_not_found"],
    ["OverconstrainedError", "mic_not_found"],
    ["NotReadableError", "mic_busy"],
    ["AbortError", "mic_error"],
  ])("maps getUserMedia %s to %s without calling the server", async (name, kind) => {
    const error = new Error("mic");
    error.name = name;
    env.getUserMedia.mockRejectedValueOnce(error);
    await ctrl.start("marin");
    expect(ctrl.getSnapshot()).toMatchObject({ state: { phase: "error" }, error: { kind, code: name } });
    expect(ctrl.getSnapshot().error?.message).toBeTruthy();
    expect(env.api.start).not.toHaveBeenCalled();
    expect(env.audio.paused).toBe(true);
  });

  it("maps a non-DOMException mic failure to mic_error", async () => {
    env.getUserMedia.mockRejectedValueOnce("weird");
    await ctrl.start("marin");
    expect(ctrl.getSnapshot().error).toMatchObject({ kind: "mic_error", code: null });
  });

  it("shows the API message on start failure and releases the mic", async () => {
    env.api.start.mockRejectedValueOnce(new RealtimeApiError("ai_monthly_limit_reached", 402));
    await ctrl.start("marin");
    expect(ctrl.getSnapshot()).toMatchObject({
      state: { phase: "error" },
      error: { kind: "limit_reached", code: "ai_monthly_limit_reached", message: formatMonthlyAiLimitMessage("voice") },
      canRetry: false,
    });
    expect(env.stream.tracks[0].stopped).toBe(true);
    expect(env.peer.closed).toBe(true);
  });

  it("shows the crisis text when start is refused for a live crisis signal (no retry)", async () => {
    env.api.start.mockRejectedValueOnce(new RealtimeApiError("crisis", 403, "Please call or text 988."));
    await ctrl.start("marin");
    expect(ctrl.getSnapshot()).toMatchObject({ error: { message: "Please call or text 988." }, canRetry: false });
  });

  it("maps 409 and generic start failures", async () => {
    env.api.start.mockRejectedValueOnce(new RealtimeApiError("realtime_session_active", 409));
    await ctrl.start("marin");
    expect(ctrl.getSnapshot().error?.kind).toBe("session_active");

    env.api.start.mockRejectedValueOnce(new Error(""));
    await ctrl.start("marin");
    expect(ctrl.getSnapshot()).toMatchObject({ error: { kind: "start_failed" }, canRetry: true });
  });

  it("fails cleanly when the offer cannot be created", async () => {
    env.peer.failOffer = true;
    await ctrl.start("marin");
    expect(ctrl.getSnapshot().error?.kind).toBe("start_failed");
    expect(env.api.start).not.toHaveBeenCalled();
  });

  it("ends as connect_failed after the 15 s timeout and closes the server session", async () => {
    void ctrl.start("marin");
    await flush();
    expect(phase()).toBe("connecting");
    await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS);
    expect(ctrl.getSnapshot()).toMatchObject({ state: { phase: "ended", endReason: "connect_failed" }, canRetry: true });
    expect(env.api.end).toHaveBeenCalledWith(expect.objectContaining({ realtimeSessionId: "rs-1", reason: "connect_failed" }));
    expect(env.peer.closed).toBe(true);
  });

  it("ends as connect_failed when the answer is rejected", async () => {
    env.peer.failRemote = true;
    void ctrl.start("marin");
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("connect_failed");
  });

  it("closes the server session when the user ends while start is in flight", async () => {
    let resolveStart!: (value: typeof START_RESULT) => void;
    env.api.start.mockReturnValueOnce(new Promise((resolve) => (resolveStart = resolve)));
    void ctrl.start("marin");
    await flush();
    ctrl.end();
    expect(phase()).toBe("ended");
    resolveStart(START_RESULT);
    await flush();
    expect(env.api.end).toHaveBeenCalledWith(expect.objectContaining({ reason: "user_ended" }));
  });

  it("drops a mic stream that arrives after the user ended", async () => {
    let resolveMic!: (value: unknown) => void;
    env.getUserMedia.mockReturnValueOnce(new Promise((resolve) => (resolveMic = resolve)));
    void ctrl.start("marin");
    ctrl.end();
    resolveMic(env.stream);
    await flush();
    expect(env.stream.tracks[0].stopped).toBe(true);
    expect(env.api.start).not.toHaveBeenCalled();
  });
});

describe("live session", () => {
  it("follows turns and attaches Kota's audio", async () => {
    await connect();
    const remote = { getTracks: () => [], getAudioTracks: () => [] };
    env.peer.ontrack?.({ streams: [remote] });
    expect(env.audio.srcObject).toBe(remote);
    env.peer.ontrack?.({ streams: [] });

    env.peer.dc.emit({ type: "input_audio_buffer.speech_started", item_id: "u1" });
    expect(phase()).toBe("user_speaking");
    env.peer.dc.emit({ type: "input_audio_buffer.speech_stopped", item_id: "u1" });
    expect(phase()).toBe("thinking");
    env.peer.dc.emit({ type: "output_audio_buffer.started", response_id: "r" });
    expect(phase()).toBe("speaking");
    env.peer.dc.emit("garbage" as never);
    env.peer.dc.onmessage?.({ data: "not json" });
    expect(phase()).toBe("speaking");
  });

  it("reports playback blocked by autoplay and recovers on tap", async () => {
    await connect();
    env.audio.blockPlay = true;
    env.peer.ontrack?.({ streams: [{ getTracks: () => [], getAudioTracks: () => [] }] });
    await flush();
    expect(ctrl.getSnapshot().playbackBlocked).toBe(true);
    env.audio.blockPlay = false;
    ctrl.resumePlayback();
    await flush();
    expect(ctrl.getSnapshot().playbackBlocked).toBe(false);
  });

  it("smooths the level: mic while listening, Kota while speaking", async () => {
    expect(ctrl.readLevel()).toBe(0);
    await connect();
    env.peer.ontrack?.({ streams: [{ getTracks: () => [], getAudioTracks: () => [] }] });
    const [mic, remote] = env.meters;
    mic.value = 1;
    let level = 0;
    for (let i = 0; i < 30; i += 1) level = ctrl.readLevel();
    expect(level).toBeGreaterThan(0.9);
    env.peer.dc.emit({ type: "output_audio_buffer.started", response_id: "r" });
    remote.value = 0;
    for (let i = 0; i < 60; i += 1) level = ctrl.readLevel();
    expect(level).toBe(0);
  });

  it("persists the transcript in order and reports usage once per event", async () => {
    await connect();
    userTurn("u1", "I feel stuck.");
    kotaTurn("a1", "Tell me more.", "u1");
    await flush();
    expect(env.api.transcript).toHaveBeenCalledWith("rs-1", [
      { itemId: "u1", role: "user", text: "I feel stuck.", interrupted: false },
    ]);
    expect(env.api.transcript).toHaveBeenLastCalledWith("rs-1", [
      { itemId: "a1", role: "assistant", text: "Tell me more.", interrupted: false },
    ]);
    expect(env.api.usage).toHaveBeenCalledWith("rs-1", expect.objectContaining({ kind: "transcription", externalEventId: "u1" }));
    expect(env.api.usage).toHaveBeenCalledWith("rs-1", expect.objectContaining({ kind: "response", externalEventId: "resp-1" }));
    expect(ctrl.getSnapshot().transcript.map((item) => item.text)).toEqual(["I feel stuck.", "Tell me more."]);
  });

  it("persists [inaudible] when the user transcript never arrives", async () => {
    await connect();
    env.peer.dc.emit({ type: "conversation.item.added", previous_item_id: null, item: { id: "u1", type: "message", role: "user" } });
    await flush();
    expect(env.api.transcript).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(8000);
    expect(env.api.transcript).toHaveBeenCalledWith("rs-1", [
      { itemId: "u1", role: "user", text: INAUDIBLE_PLACEHOLDER, interrupted: false },
    ]);
  });

  it("retries a failed transcript write", async () => {
    await connect();
    env.api.transcript.mockRejectedValueOnce(new Error("500"));
    userTurn("u1", "Hello");
    await flush();
    expect(env.api.transcript).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TRANSCRIPT_RETRY_MS);
    expect(env.api.transcript).toHaveBeenCalledTimes(2);
  });

  it("retries failed usage with backoff", async () => {
    await connect();
    env.api.usage.mockRejectedValueOnce(new Error("500"));
    userTurn("u1", "Hello");
    await flush();
    expect(env.api.usage).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.api.usage).toHaveBeenCalledTimes(2);
  });

  it("runs tool calls and asks for a new response", async () => {
    await connect();
    env.api.tool.mockResolvedValueOnce({ output: "found" }).mockResolvedValueOnce({ error: "tool_not_available" });
    env.peer.dc.emit({
      type: "response.done",
      response: {
        id: "r1",
        status: "completed",
        output: [
          { type: "function_call", call_id: "c1", name: "lookup", arguments: "{}" },
          { type: "function_call", call_id: "c2", name: "other", arguments: "{}" },
        ],
      },
    });
    await flush();
    expect(env.api.tool).toHaveBeenCalledWith({ realtimeSessionId: "rs-1", callId: "c1", name: "lookup", arguments: "{}" });
    expect(env.peer.dc.sent).toEqual([
      { type: "conversation.item.create", item: { type: "function_call_output", call_id: "c1", output: "found" } },
      {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: "c2", output: '{"error":"tool_not_available"}' },
      },
      { type: "response.create" },
    ]);
  });

  it("answers a throwing tool with tool_failed", async () => {
    await connect();
    env.api.tool.mockRejectedValueOnce(new Error("boom"));
    env.peer.dc.emit({
      type: "response.done",
      response: { id: "r1", output: [{ type: "function_call", call_id: "c1", name: "x", arguments: "" }] },
    });
    await flush();
    expect(env.peer.dc.sent[0]).toMatchObject({ item: { output: '{"error":"tool_failed"}' } });
  });

  it("sends heartbeats with the usage counters", async () => {
    await connect();
    userTurn("u1", "Hi");
    await vi.advanceTimersByTimeAsync(30_000);
    expect(env.api.heartbeat).toHaveBeenCalledWith("rs-1", { responsesSeen: 0, transcriptionsSeen: 1 });
  });
});

describe("ending", () => {
  it("user end: stops tracks, closes the peer, persists, ends on the server", async () => {
    await connect();
    userTurn("u1", "Bye");
    ctrl.end();
    expect(phase()).toBe("ending");
    await flush();
    expect(phase()).toBe("ended");
    expect(env.stream.tracks[0].stopped).toBe(true);
    expect(env.peer.closed).toBe(true);
    expect(env.peer.dc.closed).toBe(true);
    expect(env.stopPermissionWatch).toHaveBeenCalled();
    expect(env.meters.every((meter) => meter.closed)).toBe(true);
    expect(env.api.end).toHaveBeenCalledWith({
      realtimeSessionId: "rs-1",
      reason: "user_ended",
      responsesSeen: 0,
      transcriptionsSeen: 1,
    });
    expect(ctrl.getSnapshot()).toMatchObject({ endMessage: null, canRetry: false });
  });

  it("flushes unfinished items on end", async () => {
    await connect();
    env.peer.dc.emit({ type: "conversation.item.added", previous_item_id: null, item: { id: "u1", type: "message", role: "user" } });
    ctrl.end();
    await flush();
    expect(env.api.transcript).toHaveBeenCalledWith("rs-1", [
      { itemId: "u1", role: "user", text: INAUDIBLE_PLACEHOLDER, interrupted: false },
    ]);
    const endOrder = env.api.end.mock.invocationCallOrder[0];
    expect(env.api.transcript.mock.invocationCallOrder[0]).toBeLessThan(endOrder);
  });

  it("still ends on the server when the final transcript write keeps failing", async () => {
    await connect();
    env.api.transcript.mockRejectedValue(new Error("500"));
    userTurn("u1", "Hi");
    await flush();
    ctrl.end();
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.api.end).toHaveBeenCalled();
    expect(phase()).toBe("ended");
  });

  it("network loss: disconnected for 10 s ends as network_lost (retry keeps the conversation)", async () => {
    await connect();
    env.peer.setState("disconnected");
    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS - 1);
    expect(phase()).toBe("listening");
    await vi.advanceTimersByTimeAsync(1);
    expect(ctrl.getSnapshot()).toMatchObject({
      state: { phase: "ended", endReason: "network_lost" },
      canRetry: true,
      endMessage: expect.stringMatching(/connection was lost/),
    });

    env.api.start.mockClear();
    ctrl.retry();
    await flush();
    expect(env.api.start).toHaveBeenCalledWith(expect.objectContaining({ conversationId: "conv-1", voice: "marin" }));
  });

  it("recovers when the connection comes back within the grace period", async () => {
    await connect();
    env.peer.setState("disconnected");
    await vi.advanceTimersByTimeAsync(5000);
    env.peer.setState("connected");
    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS);
    expect(phase()).toBe("listening");
  });

  it("offline starts the grace; online while connected cancels it", async () => {
    await connect();
    ctrl.handleOffline();
    ctrl.handleOnline();
    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS);
    expect(phase()).toBe("listening");
    ctrl.handleOffline();
    env.peer.connectionState = "disconnected";
    await vi.advanceTimersByTimeAsync(DISCONNECT_GRACE_MS);
    expect(ctrl.getSnapshot().state.endReason).toBe("network_lost");
  });

  it("failed peer ends immediately", async () => {
    await connect();
    env.peer.setState("failed");
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("network_lost");
  });

  it("data channel close ends as network_lost, or max_duration near expiry", async () => {
    await connect();
    env.peer.dc.onclose?.();
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("network_lost");

    env = createFakeEnv();
    ctrl.dispose();
    ctrl = new RealtimeConversationController(env.deps);
    await connect();
    vi.setSystemTime(59 * 60_000);
    env.peer.dc.onclose?.();
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("max_duration");
  });

  it("max duration: warns 5 min before and ends at expiresAt", async () => {
    env.api.start.mockResolvedValueOnce({ ...START_RESULT, idleTimeoutSec: 2 * 60 * 60 });
    await connect();
    await vi.advanceTimersByTimeAsync(60 * 60_000 - TIME_WARNING_MS);
    expect(ctrl.getSnapshot()).toMatchObject({ timeWarning: true, remainingMs: TIME_WARNING_MS });
    await vi.advanceTimersByTimeAsync(TIME_WARNING_MS);
    expect(ctrl.getSnapshot()).toMatchObject({
      state: { phase: "ended", endReason: "max_duration" },
      endMessage: expect.stringMatching(/60-minute/),
    });
  });

  it("max duration from the server: heartbeat stop and session_expired", async () => {
    await connect();
    env.api.heartbeat.mockResolvedValueOnce({ stop: "max_duration" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(ctrl.getSnapshot().state.endReason).toBe("max_duration");

    env = createFakeEnv();
    ctrl.dispose();
    ctrl = new RealtimeConversationController(env.deps);
    await connect();
    env.peer.dc.emit({ type: "error", error: { code: "session_expired" } });
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("max_duration");
  });

  it("idle: ends after idleTimeoutSec without speech; speech resets it", async () => {
    await connect();
    await vi.advanceTimersByTimeAsync(500_000);
    env.peer.dc.emit({ type: "input_audio_buffer.speech_started", item_id: "u1" });
    await vi.advanceTimersByTimeAsync(500_000);
    expect(phase()).not.toBe("ended");
    await vi.advanceTimersByTimeAsync(100_000);
    expect(ctrl.getSnapshot().state.endReason).toBe("idle_timeout");
  });

  it("budget: lets Kota finish (≤ 5 s) before ending", async () => {
    await connect();
    env.peer.dc.emit({ type: "output_audio_buffer.started", response_id: "r1" });
    env.api.heartbeat.mockResolvedValueOnce({ stop: "budget_reached" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(phase()).toBe("ending");
    expect(env.peer.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(BUDGET_DRAIN_MS);
    expect(ctrl.getSnapshot()).toMatchObject({
      state: { phase: "ended", endReason: "budget_reached" },
      endMessage: formatMonthlyAiLimitMessage("voice"),
    });
  });

  it("budget: ends as soon as Kota's audio stops", async () => {
    await connect();
    env.peer.dc.emit({ type: "output_audio_buffer.started", response_id: "r1" });
    env.api.heartbeat.mockResolvedValueOnce({ stop: "budget_reached" });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(phase()).toBe("ending");
    // The data channel stays open while Kota finishes; the buffer stop releases the drain.
    env.peer.dc.emit({ type: "output_audio_buffer.stopped", response_id: "r1" });
    await flush();
    expect(ctrl.getSnapshot().state).toMatchObject({ phase: "ended", endReason: "budget_reached" });
  });

  it("crisis: cancels Kota, clears audio, ends and exposes the crisis text", async () => {
    await connect();
    env.api.transcript.mockResolvedValueOnce({ crisis: { level: 3, text: "Please reach out to 988." } });
    userTurn("u1", "crisis words");
    await flush();
    expect(env.peer.dc.sentTypes()).toEqual(["response.cancel", "output_audio_buffer.clear"]);
    expect(ctrl.getSnapshot()).toMatchObject({
      state: { phase: "ended", endReason: "crisis" },
      crisis: { level: 3, text: "Please reach out to 988." },
      endMessage: null,
      canRetry: false,
    });
    expect(env.api.end).toHaveBeenCalledWith(expect.objectContaining({ reason: "crisis" }));
  });

  it("mic lost mid-session: track ended or permission revoked", async () => {
    await connect();
    env.stream.tracks[0].onended?.();
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("mic_lost");

    env = createFakeEnv();
    ctrl.dispose();
    ctrl = new RealtimeConversationController(env.deps);
    await connect();
    env.permissionDenied();
    await flush();
    expect(ctrl.getSnapshot().state.endReason).toBe("mic_lost");
  });

  it("keeps sending usage after the end", async () => {
    await connect();
    env.api.usage.mockRejectedValueOnce(new Error("500"));
    userTurn("u1", "Hi");
    await flush();
    ctrl.end();
    await flush();
    await vi.advanceTimersByTimeAsync(1000);
    expect(env.api.usage).toHaveBeenCalledTimes(2);
  });
});

describe("page lifecycle", () => {
  it("pagehide sends a keepalive end(abandoned) and releases media", async () => {
    await connect();
    await flush();
    ctrl.handlePageHide();
    expect(env.api.endKeepalive).toHaveBeenCalledWith(
      expect.objectContaining({ realtimeSessionId: "rs-1", reason: "abandoned" }),
      "access-token",
    );
    expect(env.stream.tracks[0].stopped).toBe(true);
    ctrl.handlePageHide();
    expect(env.api.endKeepalive).toHaveBeenCalledTimes(1);
  });

  it("unmount (dispose) ends a running session and clears timers", async () => {
    await connect();
    ctrl.dispose();
    expect(env.api.endKeepalive).toHaveBeenCalledWith(expect.objectContaining({ reason: "user_ended" }), "access-token");
    expect(env.peer.closed).toBe(true);
    expect(env.stream.tracks[0].stopped).toBe(true);
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(env.api.heartbeat).not.toHaveBeenCalled();
    ctrl.dispose();
    await ctrl.start("marin");
    expect(env.api.start).toHaveBeenCalledTimes(1);
  });

  it("dispose before start does nothing on the server", () => {
    ctrl.dispose();
    expect(env.api.endKeepalive).not.toHaveBeenCalled();
  });

  it("a new start in another conversation resets the transcript", async () => {
    await connect();
    userTurn("u1", "Hi");
    ctrl.end();
    await flush();
    expect(ctrl.getSnapshot().transcript).toHaveLength(1);
    env.api.start.mockResolvedValueOnce({ ...START_RESULT, conversationId: "conv-2", realtimeSessionId: "rs-2" });
    env.peer.closed = false;
    void ctrl.start("cedar");
    expect(ctrl.getSnapshot().transcript).toHaveLength(0);
  });
});
