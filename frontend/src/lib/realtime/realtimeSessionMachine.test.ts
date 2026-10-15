import { describe, expect, it } from "vitest";
import {
  INITIAL_REALTIME_SESSION_STATE,
  isLivePhase,
  isSessionBusy,
  realtimeSessionReducer,
  type RealtimeMachineEvent,
  type RealtimeSessionState,
} from "./realtimeSessionMachine";

function run(events: RealtimeMachineEvent[], from: RealtimeSessionState = INITIAL_REALTIME_SESSION_STATE) {
  return events.reduce(realtimeSessionReducer, from);
}

const CONNECTED: RealtimeMachineEvent[] = [
  { type: "start" },
  { type: "mic_granted" },
  { type: "session_started" },
  { type: "rtc_state", state: "connected" },
];

describe("realtimeSessionReducer — setup", () => {
  it("goes idle → requesting_mic → connecting → listening", () => {
    expect(run([{ type: "start" }]).phase).toBe("requesting_mic");
    expect(run([{ type: "start" }, { type: "mic_granted" }]).phase).toBe("connecting");
    const live = run(CONNECTED);
    expect(live).toMatchObject({ phase: "listening", hasSession: true, endReason: null, error: null });
  });

  it("does not go live before the server session exists", () => {
    expect(run([{ type: "start" }, { type: "mic_granted" }, { type: "rtc_state", state: "connected" }]).phase).toBe(
      "connecting",
    );
  });

  it("ignores out-of-phase setup events", () => {
    expect(run([{ type: "mic_granted" }])).toBe(INITIAL_REALTIME_SESSION_STATE);
    const live = run(CONNECTED);
    expect(realtimeSessionReducer(live, { type: "mic_granted" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "mic_error", name: "NotAllowedError" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "session_started" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "rtc_state", state: "connected" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "rtc_state", state: "connecting" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "connect_timeout" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "start_failed", code: "x" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "start" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "ended" })).toBe(live);
  });

  it("maps mic errors to error kinds", () => {
    expect(run([{ type: "start" }, { type: "mic_error", name: "NotAllowedError" }])).toMatchObject({
      phase: "error",
      error: { kind: "mic_denied", code: "NotAllowedError" },
    });
    expect(run([{ type: "start" }, { type: "mic_error", name: "NotFoundError" }]).error?.kind).toBe("mic_not_found");
  });

  it("maps start failures before a session exists", () => {
    const connecting: RealtimeMachineEvent[] = [{ type: "start" }, { type: "mic_granted" }];
    expect(run([...connecting, { type: "start_failed", code: "ai_monthly_limit_reached" }]).error).toEqual({
      kind: "limit_reached",
      code: "ai_monthly_limit_reached",
    });
    expect(run([...connecting, { type: "start_failed", code: "free_tier_session_limit" }]).error?.kind).toBe(
      "limit_reached",
    );
    expect(run([...connecting, { type: "start_failed", code: "realtime_session_active" }]).error?.kind).toBe(
      "session_active",
    );
    expect(run([...connecting, { type: "start_failed", code: null }])).toMatchObject({
      phase: "error",
      error: { kind: "start_failed", code: null },
    });
  });

  it("ends a set-up session as connect_failed on RTC failure or timeout", () => {
    const withSession: RealtimeMachineEvent[] = [{ type: "start" }, { type: "mic_granted" }, { type: "session_started" }];
    expect(run([...withSession, { type: "rtc_state", state: "failed" }])).toMatchObject({
      phase: "ending",
      endReason: "connect_failed",
    });
    expect(run([...withSession, { type: "connect_timeout" }])).toMatchObject({
      phase: "ending",
      endReason: "connect_failed",
    });
  });

  it("finishes at once when there is no server session to end", () => {
    expect(run([{ type: "start" }, { type: "user_end" }])).toMatchObject({ phase: "ended", endReason: "user_ended" });
    expect(run([{ type: "start" }, { type: "mic_granted" }, { type: "connect_timeout" }])).toMatchObject({
      phase: "ended",
      endReason: "connect_failed",
    });
  });

  it("restarts from a terminal phase", () => {
    const failed = run([{ type: "start" }, { type: "mic_error", name: null }]);
    expect(realtimeSessionReducer(failed, { type: "start" })).toEqual({
      ...INITIAL_REALTIME_SESSION_STATE,
      phase: "requesting_mic",
    });
    const ended = run([...CONNECTED, { type: "user_end" }, { type: "ended" }]);
    expect(realtimeSessionReducer(ended, { type: "start" }).phase).toBe("requesting_mic");
  });
});

describe("realtimeSessionReducer — live turns", () => {
  it("cycles listening → user_speaking → thinking → speaking → listening (WebRTC buffer events)", () => {
    let state = run(CONNECTED);
    state = realtimeSessionReducer(state, { type: "input_audio_buffer.speech_started", itemId: "u1" });
    expect(state.phase).toBe("user_speaking");
    state = realtimeSessionReducer(state, { type: "input_audio_buffer.speech_stopped", itemId: "u1" });
    expect(state.phase).toBe("thinking");
    state = realtimeSessionReducer(state, { type: "response.created", responseId: "r1" });
    expect(state).toMatchObject({ phase: "thinking", responseActive: true });
    state = realtimeSessionReducer(state, { type: "output_audio_buffer.started", responseId: "r1" });
    expect(state).toMatchObject({ phase: "speaking", audioPlaying: true });
    state = realtimeSessionReducer(state, {
      type: "response.done",
      responseId: "r1",
      status: "completed",
      statusReason: null,
      usage: null,
      functionCalls: [],
    });
    expect(state).toMatchObject({ phase: "speaking", responseActive: false });
    state = realtimeSessionReducer(state, { type: "output_audio_buffer.stopped", responseId: "r1" });
    expect(state).toMatchObject({ phase: "listening", audioPlaying: false });
  });

  it("speaks on transcript/audio deltas when there are no buffer events", () => {
    let state = run([...CONNECTED, { type: "response.created", responseId: "r1" }]);
    state = realtimeSessionReducer(state, {
      type: "response.output_audio_transcript.delta",
      responseId: "r1",
      itemId: "a1",
      contentIndex: 0,
      delta: "Hi",
    });
    expect(state.phase).toBe("speaking");
    expect(
      realtimeSessionReducer(run([...CONNECTED, { type: "response.created", responseId: "r1" }]), {
        type: "response.output_audio.delta",
        responseId: "r1",
        itemId: null,
      }).phase,
    ).toBe("speaking");
    // Already speaking / listening: a delta changes nothing.
    expect(realtimeSessionReducer(state, { type: "response.output_audio.delta", responseId: "r1", itemId: null })).toBe(
      state,
    );
    state = realtimeSessionReducer(state, {
      type: "response.done",
      responseId: "r1",
      status: "completed",
      statusReason: null,
      usage: null,
      functionCalls: [],
    });
    expect(state.phase).toBe("listening");
  });

  it("lets the user interrupt Kota", () => {
    let state = run([
      ...CONNECTED,
      { type: "response.created", responseId: "r1" },
      { type: "output_audio_buffer.started", responseId: "r1" },
    ]);
    state = realtimeSessionReducer(state, { type: "input_audio_buffer.speech_started", itemId: "u2" });
    expect(state.phase).toBe("user_speaking");
    state = realtimeSessionReducer(state, { type: "output_audio_buffer.cleared", responseId: "r1" });
    expect(state).toMatchObject({ phase: "user_speaking", audioPlaying: false });
    state = realtimeSessionReducer(state, { type: "response.created", responseId: "r2" });
    expect(state).toMatchObject({ phase: "user_speaking", responseActive: true });
    state = realtimeSessionReducer(state, { type: "output_audio_buffer.started", responseId: "r2" });
    expect(state).toMatchObject({ phase: "user_speaking", audioPlaying: true });
    state = realtimeSessionReducer(state, { type: "input_audio_buffer.speech_stopped", itemId: "u2" });
    expect(state.phase).toBe("thinking");
  });

  it("stays thinking when audio stops while a response is still running", () => {
    const state = run([
      ...CONNECTED,
      { type: "response.created", responseId: "r1" },
      { type: "output_audio_buffer.started", responseId: "r1" },
      { type: "output_audio_buffer.stopped", responseId: "r1" },
    ]);
    expect(state.phase).toBe("thinking");
  });

  it("ignores events that do not affect the phase", () => {
    const live = run(CONNECTED);
    expect(realtimeSessionReducer(live, { type: "session.updated" })).toBe(live);
    expect(realtimeSessionReducer(live, { type: "error", code: "invalid_value", message: null, errorType: null })).toBe(
      live,
    );
    const connecting = run([{ type: "start" }, { type: "mic_granted" }]);
    expect(realtimeSessionReducer(connecting, { type: "input_audio_buffer.speech_started", itemId: null })).toBe(
      connecting,
    );
  });
});

describe("realtimeSessionReducer — ending", () => {
  it.each([
    ["user_end", "user_ended"],
    ["max_duration", "max_duration"],
    ["idle_timeout", "idle_timeout"],
    ["crisis", "crisis"],
    ["budget_stop", "budget_reached"],
    ["mic_lost", "mic_lost"],
  ] as const)("%s → ending(%s) → ended", (type, reason) => {
    let state = run([...CONNECTED, { type: "output_audio_buffer.started", responseId: "r1" }]);
    state = realtimeSessionReducer(state, { type });
    expect(state).toMatchObject({ phase: "ending", endReason: reason, audioPlaying: false, responseActive: false });
    state = realtimeSessionReducer(state, { type: "ended" });
    expect(state).toMatchObject({ phase: "ended", endReason: reason });
  });

  it("ends as network_lost when RTC fails or closes mid-session", () => {
    expect(run([...CONNECTED, { type: "rtc_state", state: "failed" }]).endReason).toBe("network_lost");
    expect(run([...CONNECTED, { type: "rtc_state", state: "closed" }]).endReason).toBe("network_lost");
  });

  it("ends on session_expired (C6)", () => {
    expect(
      run([...CONNECTED, { type: "error", code: "session_expired", message: null, errorType: null }]),
    ).toMatchObject({ phase: "ending", endReason: "max_duration" });
  });

  it("keeps the first end reason while ending", () => {
    const ending = run([...CONNECTED, { type: "crisis" }]);
    expect(realtimeSessionReducer(ending, { type: "user_end" })).toBe(ending);
    expect(realtimeSessionReducer(ending, { type: "rtc_state", state: "failed" })).toBe(ending);
  });
});

describe("phase helpers", () => {
  it("classifies live and busy phases", () => {
    expect(isLivePhase("speaking")).toBe(true);
    expect(isLivePhase("connecting")).toBe(false);
    expect(isSessionBusy("connecting")).toBe(true);
    expect(isSessionBusy("ending")).toBe(true);
    expect(isSessionBusy("idle")).toBe(false);
    expect(isSessionBusy("ended")).toBe(false);
    expect(isSessionBusy("error")).toBe(false);
  });
});
