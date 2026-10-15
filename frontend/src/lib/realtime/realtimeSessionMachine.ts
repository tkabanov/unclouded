/**
 * NCLDD-57 S4 — Conversation mode state machine (plan §6.1). Pure reducer; the hook feeds it
 * server events (`realtimeEvents`) and local events (mic, RTC, timers, API results).
 *
 * idle → requesting_mic → connecting → listening ⇄ user_speaking → thinking → speaking → … → ending → ended
 * Failures before a server session exists → error{kind}. After `start` succeeded every failure
 * goes through `ending{reason}` so the hook calls `end` on the server.
 */
import type { RealtimeServerEvent } from "./realtimeEvents";
import {
  endReasonForServerError,
  isRealtimeLimitCode,
  micErrorKind,
  type RealtimeEndReason,
  type RealtimeMicErrorKind,
} from "./realtimeErrors";

export type RealtimePhase =
  | "idle"
  | "requesting_mic"
  | "connecting"
  | "listening"
  | "user_speaking"
  | "thinking"
  | "speaking"
  | "ending"
  | "ended"
  | "error";

export type RealtimeErrorKind =
  | RealtimeMicErrorKind
  | "limit_reached"
  | "session_active"
  | "start_failed";

export type RealtimeSessionState = {
  phase: RealtimePhase;
  /** `start` succeeded: a server-side realtime session exists and must be ended. */
  hasSession: boolean;
  responseActive: boolean;
  audioPlaying: boolean;
  endReason: RealtimeEndReason | null;
  error: { kind: RealtimeErrorKind; code: string | null } | null;
};

export type RealtimeLocalEvent =
  | { type: "start" }
  | { type: "mic_granted" }
  | { type: "mic_error"; name: string | null }
  | { type: "start_failed"; code: string | null }
  | { type: "session_started" }
  | { type: "rtc_state"; state: RTCPeerConnectionState }
  | { type: "connect_timeout" }
  | { type: "user_end" }
  | { type: "max_duration" }
  | { type: "idle_timeout" }
  | { type: "crisis" }
  | { type: "budget_stop" }
  | { type: "mic_lost" }
  | { type: "ended" };

export type RealtimeMachineEvent = RealtimeServerEvent | RealtimeLocalEvent;

export const INITIAL_REALTIME_SESSION_STATE: RealtimeSessionState = {
  phase: "idle",
  hasSession: false,
  responseActive: false,
  audioPlaying: false,
  endReason: null,
  error: null,
};

const LIVE_PHASES: ReadonlySet<RealtimePhase> = new Set([
  "listening",
  "user_speaking",
  "thinking",
  "speaking",
]);

const TERMINAL_PHASES: ReadonlySet<RealtimePhase> = new Set(["idle", "ended", "error"]);

export function isLivePhase(phase: RealtimePhase): boolean {
  return LIVE_PHASES.has(phase);
}

/** A session is running (or being set up / torn down): mode switch and voice picker are locked. */
export function isSessionBusy(phase: RealtimePhase): boolean {
  return !TERMINAL_PHASES.has(phase);
}

function startFailedKind(code: string | null): RealtimeErrorKind {
  if (isRealtimeLimitCode(code)) return "limit_reached";
  if (code === "realtime_session_active") return "session_active";
  return "start_failed";
}

/** Begin tearing down; without a server session there is nothing to end, so finish at once. */
function endWith(state: RealtimeSessionState, reason: RealtimeEndReason): RealtimeSessionState {
  return {
    ...state,
    phase: state.hasSession ? "ending" : "ended",
    endReason: reason,
    responseActive: false,
    audioPlaying: false,
  };
}

/** Phase after Kota's turn activity changed (never interrupts the user speaking). */
function settle(state: RealtimeSessionState): RealtimeSessionState {
  if (state.phase === "user_speaking") return state;
  if (state.audioPlaying) return { ...state, phase: "speaking" };
  return { ...state, phase: state.responseActive ? "thinking" : "listening" };
}

function reduceLive(state: RealtimeSessionState, event: RealtimeServerEvent): RealtimeSessionState {
  switch (event.type) {
    case "input_audio_buffer.speech_started":
      return { ...state, phase: "user_speaking" };
    case "input_audio_buffer.speech_stopped":
      return { ...state, phase: "thinking" };
    case "response.created":
      return state.phase === "user_speaking"
        ? { ...state, responseActive: true }
        : { ...state, responseActive: true, phase: "thinking" };
    case "output_audio_buffer.started":
      return settle({ ...state, audioPlaying: true });
    case "response.output_audio.delta":
    case "response.output_audio_transcript.delta":
      // Audio is playing even when the transport sends no output_audio_buffer events.
      return state.phase === "thinking" ? { ...state, phase: "speaking" } : state;
    case "response.done":
      return settle({ ...state, responseActive: false });
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return settle({ ...state, audioPlaying: false });
    default:
      return state;
  }
}

export function realtimeSessionReducer(
  state: RealtimeSessionState,
  event: RealtimeMachineEvent,
): RealtimeSessionState {
  if (event.type === "start") {
    return TERMINAL_PHASES.has(state.phase)
      ? { ...INITIAL_REALTIME_SESSION_STATE, phase: "requesting_mic" }
      : state;
  }

  if (event.type === "ended") {
    return state.phase === "ending" ? { ...state, phase: "ended" } : state;
  }

  if (TERMINAL_PHASES.has(state.phase) || state.phase === "ending") return state;

  switch (event.type) {
    case "mic_granted":
      return state.phase === "requesting_mic" ? { ...state, phase: "connecting" } : state;
    case "mic_error":
      return state.phase === "requesting_mic"
        ? { ...state, phase: "error", error: { kind: micErrorKind(event.name), code: event.name } }
        : state;
    case "start_failed":
      return state.hasSession
        ? state
        : { ...state, phase: "error", error: { kind: startFailedKind(event.code), code: event.code } };
    case "session_started":
      return state.phase === "connecting" ? { ...state, hasSession: true } : state;
    case "rtc_state":
      if (event.state === "connected") {
        return state.phase === "connecting" && state.hasSession ? { ...state, phase: "listening" } : state;
      }
      if (event.state === "failed" || event.state === "closed") {
        return endWith(state, state.phase === "connecting" ? "connect_failed" : "network_lost");
      }
      return state;
    case "connect_timeout":
      return state.phase === "connecting" ? endWith(state, "connect_failed") : state;
    case "user_end":
      return endWith(state, "user_ended");
    case "max_duration":
      return endWith(state, "max_duration");
    case "idle_timeout":
      return endWith(state, "idle_timeout");
    case "crisis":
      return endWith(state, "crisis");
    case "budget_stop":
      return endWith(state, "budget_reached");
    case "mic_lost":
      return endWith(state, "mic_lost");
    case "error": {
      const reason = endReasonForServerError(event.code);
      return reason ? endWith(state, reason) : state;
    }
    default:
      return isLivePhase(state.phase) ? reduceLive(state, event) : state;
  }
}
