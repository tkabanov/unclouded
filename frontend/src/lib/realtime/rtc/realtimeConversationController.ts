/**
 * NCLDD-57 S5a — runs one Conversation-mode session: mic + WebRTC + data channel wired to the
 * S4 pure lib (plan §6.2). Browser objects and the `realtime-voice` API are injected so the
 * whole flow is testable; `useRealtimeConversation` is a thin React wrapper.
 *
 * Teardown order (`end`): crisis → cancel Kota; budget → let Kota finish (≤ 5 s); stop tracks,
 * close the peer connection, persist the rest of the transcript, `end` on the server, then keep
 * sending queued usage (the server accepts it for 10 min after the end).
 */
import {
  INITIAL_REALTIME_SESSION_STATE,
  isLivePhase,
  isSessionBusy,
  realtimeSessionReducer,
  type RealtimeMachineEvent,
  type RealtimeSessionState,
} from "../realtimeSessionMachine";
import { parseRealtimeServerEvent, type RealtimeFunctionCall, type RealtimeServerEvent } from "../realtimeEvents";
import {
  EMPTY_TRANSCRIPT,
  applyTranscriptEvent,
  getTranscriptItems,
  type TranscriptItem,
  type TranscriptState,
} from "../transcriptAssembler";
import {
  EMPTY_PERSIST_QUEUE,
  ackPersisted,
  releaseInFlight,
  takePersistable,
  type PersistItem,
  type PersistQueueState,
} from "../persistQueue";
import {
  EMPTY_USAGE_STATE,
  enqueueUsage,
  markUsageFailed,
  markUsageSent,
  nextUsageAttemptAt,
  takeDueUsage,
  usageKey,
  usagePayloadFromEvent,
  type RealtimeUsagePayload,
  type RealtimeUsageState,
} from "../realtimeUsage";
import {
  apiErrorMessage,
  canRetryAfter,
  endReasonMessage,
  micErrorMessage,
  type RealtimeApiErrorCode,
  type RealtimeEndReason,
} from "../realtimeErrors";
import type {
  RealtimeCounters,
  RealtimeCrisis,
  RealtimeEndInput,
  RealtimeHeartbeatStop,
  RealtimeStartResult,
} from "../realtimeVoiceApi";
import type { RealtimeVoice } from "../realtimeVoices";

export const CONNECT_TIMEOUT_MS = 15_000;
export const DISCONNECT_GRACE_MS = 10_000;
export const TIME_WARNING_MS = 5 * 60_000;
export const BUDGET_DRAIN_MS = 5_000;
export const TRANSCRIPT_RETRY_MS = 2_000;
const TICK_MS = 1_000;
const FLUSH_ATTEMPTS = 3;
/** A data channel that closes this close to `expiresAt` is the 60-min end, not a network loss (C6). */
const EXPIRY_SLACK_MS = 2 * 60_000;

// ---------------------------------------------------------------------------
// Injected browser surface (structural subsets of the DOM types)
// ---------------------------------------------------------------------------

export type RtcTrackLike = { stop(): void; onended: (() => void) | null };
export type RtcStreamLike = { getTracks(): RtcTrackLike[]; getAudioTracks(): RtcTrackLike[] };

export type RtcDataChannelLike = {
  readyState: string;
  send(data: string): void;
  close(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
};

export type RtcPeerLike = {
  connectionState: string;
  addTrack(track: RtcTrackLike, stream: RtcStreamLike): unknown;
  createDataChannel(label: string): RtcDataChannelLike;
  createOffer(): Promise<{ sdp?: string | null }>;
  setLocalDescription(description: { sdp?: string | null }): Promise<void>;
  setRemoteDescription(description: { type: "answer"; sdp: string }): Promise<void>;
  close(): void;
  ontrack: ((event: { streams: readonly RtcStreamLike[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
};

export type RtcAudioLike = {
  srcObject: unknown;
  autoplay: boolean;
  play(): Promise<void> | void;
  pause(): void;
};

export type LevelMeter = { read(): number; close(): void };

export type RealtimeConversationApi = {
  start(input: { sdpOffer: string; voice: RealtimeVoice; conversationId?: string | null }): Promise<RealtimeStartResult>;
  connected(realtimeSessionId: string): Promise<void>;
  heartbeat(realtimeSessionId: string, counters: RealtimeCounters): Promise<{ stop: RealtimeHeartbeatStop | null }>;
  usage(realtimeSessionId: string, usage: RealtimeUsagePayload): Promise<unknown>;
  transcript(realtimeSessionId: string, items: readonly PersistItem[]): Promise<{ crisis: RealtimeCrisis | null }>;
  tool(input: {
    realtimeSessionId: string;
    callId: string;
    name: string;
    arguments: string;
  }): Promise<{ output: string } | { error: string }>;
  end(input: RealtimeEndInput): Promise<unknown>;
  endKeepalive(input: RealtimeEndInput, accessToken: string): void;
};

export type RealtimeConversationDeps = {
  api: RealtimeConversationApi;
  getUserMedia(): Promise<RtcStreamLike>;
  createPeerConnection(): RtcPeerLike;
  /** Created in the Start tap handler (autoplay unlock, spike §4). */
  createAudioElement(): RtcAudioLike;
  getAccessToken(): Promise<string | null>;
  createLevelMeter?(stream: RtcStreamLike): LevelMeter | null;
  /** Calls `onDenied` when the mic permission is revoked; returns an unsubscribe. */
  watchMicPermission?(onDenied: () => void): () => void;
  now?(): number;
  log?(message: string, detail?: unknown): void;
};

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export type RealtimeConversationError = {
  kind: string;
  code: string | null;
  message: string;
};

export type RealtimeConversationSnapshot = {
  state: RealtimeSessionState;
  transcript: TranscriptItem[];
  conversationId: string | null;
  /** Until `expiresAt`; null before the session is connected. */
  remainingMs: number | null;
  /** Less than 5 minutes left. */
  timeWarning: boolean;
  /** `play()` was blocked (iOS/Android autoplay): show "Tap to enable sound". */
  playbackBlocked: boolean;
  crisis: RealtimeCrisis | null;
  error: RealtimeConversationError | null;
  /** Message after the session ended (null when nothing needs saying). */
  endMessage: string | null;
  canRetry: boolean;
};

type Session = {
  generation: number;
  stream: RtcStreamLike | null;
  pc: RtcPeerLike | null;
  dc: RtcDataChannelLike | null;
  audio: RtcAudioLike;
  micMeter: LevelMeter | null;
  remoteMeter: LevelMeter | null;
  stopPermissionWatch: (() => void) | null;
  realtimeSessionId: string | null;
  expiresAtMs: number | null;
  heartbeatMs: number;
  idleTimeoutMs: number;
  timers: Set<ReturnType<typeof setTimeout>>;
  intervals: Set<ReturnType<typeof setInterval>>;
  connectTimer: ReturnType<typeof setTimeout> | null;
  graceTimer: ReturnType<typeof setTimeout> | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
  transcriptTimer: ReturnType<typeof setTimeout> | null;
  /** The `transcript` request in flight (one at a time, so batches arrive in order). */
  transcriptInFlight: Promise<void> | null;
  tearingDown: boolean;
};

export class RealtimeConversationController {
  private readonly deps: RealtimeConversationDeps;
  private readonly now: () => number;
  private listeners = new Set<() => void>();
  private snapshot: RealtimeConversationSnapshot;

  private machine: RealtimeSessionState = INITIAL_REALTIME_SESSION_STATE;
  private transcript: TranscriptState = EMPTY_TRANSCRIPT;
  private persist: PersistQueueState = EMPTY_PERSIST_QUEUE;
  private usage: RealtimeUsageState = EMPTY_USAGE_STATE;
  private usageSessionId: string | null = null;
  private usageTimer: ReturnType<typeof setTimeout> | null = null;
  private session: Session | null = null;
  private generation = 0;
  private conversationId: string | null = null;
  private lastVoice: RealtimeVoice | null = null;
  private accessToken: string | null = null;
  private startError: { code: RealtimeApiErrorCode | null; message: string } | null = null;
  private crisis: RealtimeCrisis | null = null;
  private playbackBlocked = false;
  private level = 0;
  private disposed = false;
  private audioDrainResolve: (() => void) | null = null;

  constructor(deps: RealtimeConversationDeps) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
    this.snapshot = this.buildSnapshot();
  }

  // ---- subscription -------------------------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): RealtimeConversationSnapshot => this.snapshot;

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  private buildSnapshot(): RealtimeConversationSnapshot {
    const state = this.machine;
    const expiresAtMs = this.session?.expiresAtMs ?? null;
    const remainingMs =
      expiresAtMs !== null && isLivePhase(state.phase) ? Math.max(0, expiresAtMs - this.now()) : null;

    let error: RealtimeConversationError | null = null;
    if (state.phase === "error" && state.error) {
      const { kind, code } = state.error;
      const message =
        kind === "mic_denied" || kind === "mic_not_found" || kind === "mic_busy" || kind === "mic_error"
          ? micErrorMessage(kind)
          : (this.startError?.message ?? apiErrorMessage("request_failed"));
      error = { kind, code, message };
    }

    const ended = state.phase === "ended" && state.endReason;
    return {
      state,
      transcript: getTranscriptItems(this.transcript),
      conversationId: this.conversationId,
      remainingMs,
      timeWarning: remainingMs !== null && remainingMs <= TIME_WARNING_MS,
      playbackBlocked: this.playbackBlocked,
      crisis: this.crisis,
      error,
      endMessage: ended ? endReasonMessage(state.endReason!) : null,
      canRetry:
        (ended && canRetryAfter(state.endReason!) && this.conversationId !== null) ||
        (state.phase === "error" && state.error?.kind === "start_failed"),
    };
  }

  /** Smoothed 0..1 level: Kota's voice while speaking, the mic otherwise. */
  readLevel(): number {
    const session = this.session;
    let raw = 0;
    if (session && isLivePhase(this.machine.phase)) {
      const meter = this.machine.phase === "speaking" ? session.remoteMeter : session.micMeter;
      raw = meter ? Math.min(1, Math.max(0, meter.read())) : 0;
    }
    this.level = this.level * 0.8 + raw * 0.2;
    if (this.level < 0.001) this.level = 0;
    return this.level;
  }

  // ---- public actions -----------------------------------------------------

  /**
   * Must be called from the Start tap handler: the audio element is created and unlocked
   * synchronously before any await (spike §4).
   */
  start(voice: RealtimeVoice, conversationId?: string | null): Promise<void> {
    if (this.disposed || isSessionBusy(this.machine.phase)) return Promise.resolve();

    const audio = this.deps.createAudioElement();
    audio.autoplay = true;
    this.tryPlay(audio, false);

    const keepTranscript = Boolean(conversationId) && conversationId === this.conversationId;
    if (!keepTranscript) {
      this.transcript = EMPTY_TRANSCRIPT;
      this.persist = EMPTY_PERSIST_QUEUE;
    }
    this.conversationId = conversationId ?? null;
    this.lastVoice = voice;
    this.startError = null;
    this.crisis = null;
    this.playbackBlocked = false;
    this.generation += 1;
    this.session = {
      generation: this.generation,
      stream: null,
      pc: null,
      dc: null,
      audio,
      micMeter: null,
      remoteMeter: null,
      stopPermissionWatch: null,
      realtimeSessionId: null,
      expiresAtMs: null,
      heartbeatMs: 0,
      idleTimeoutMs: 0,
      timers: new Set(),
      intervals: new Set(),
      connectTimer: null,
      graceTimer: null,
      idleTimer: null,
      transcriptTimer: null,
      transcriptInFlight: null,
      tearingDown: false,
    };
    this.dispatch({ type: "start" });
    return this.runStart(this.session, voice);
  }

  /** New realtime session in the same conversation after a recoverable failure. */
  retry(): Promise<void> {
    if (!this.snapshot.canRetry || !this.lastVoice) return Promise.resolve();
    return this.start(this.lastVoice, this.conversationId);
  }

  end(): void {
    this.dispatch({ type: "user_end" });
  }

  /** Retry `play()` from a user tap after autoplay was blocked. */
  resumePlayback(): void {
    if (this.session) this.tryPlay(this.session.audio, true);
  }

  handleOffline(): void {
    if (this.session && isLivePhase(this.machine.phase)) this.startGrace(this.session);
  }

  handleOnline(): void {
    const session = this.session;
    if (session?.graceTimer && session.pc?.connectionState === "connected") this.clearGrace(session);
  }

  /** `pagehide`: the page may be gone before any await resolves. */
  handlePageHide(): void {
    const session = this.session;
    if (!session || session.tearingDown || !isSessionBusy(this.machine.phase)) return;
    if (session.realtimeSessionId && this.accessToken) {
      this.deps.api.endKeepalive(this.endInput(session.realtimeSessionId, "abandoned"), this.accessToken);
    }
    session.tearingDown = true;
    this.releaseMedia(session);
    this.clearSessionTimers(session);
  }

  /** Unmount: close everything; a running session is ended on the server. */
  dispose(): void {
    if (this.disposed) return;
    const session = this.session;
    if (session && !session.tearingDown && isSessionBusy(this.machine.phase)) {
      if (session.realtimeSessionId && this.accessToken) {
        this.deps.api.endKeepalive(this.endInput(session.realtimeSessionId, "user_ended"), this.accessToken);
      }
      session.tearingDown = true;
    }
    if (session) {
      this.releaseMedia(session);
      this.clearSessionTimers(session);
    }
    if (this.usageTimer) clearTimeout(this.usageTimer);
    this.disposed = true;
    this.listeners.clear();
  }

  // ---- start flow ---------------------------------------------------------

  private alive(session: Session): boolean {
    return !this.disposed && this.session === session && !session.tearingDown;
  }

  private async runStart(session: Session, voice: RealtimeVoice): Promise<void> {
    let stream: RtcStreamLike;
    try {
      stream = await this.deps.getUserMedia();
    } catch (err) {
      if (!this.alive(session)) return;
      const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : null;
      this.dispatch({ type: "mic_error", name });
      this.releaseMedia(session);
      return;
    }
    if (!this.alive(session) || this.machine.phase !== "requesting_mic") {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    session.stream = stream;
    this.dispatch({ type: "mic_granted" });

    void this.deps
      .getAccessToken()
      .then((token) => {
        if (token) this.accessToken = token;
      })
      .catch(() => undefined);

    for (const track of stream.getAudioTracks()) {
      track.onended = () => {
        if (this.alive(session)) this.dispatch({ type: "mic_lost" });
      };
    }
    session.stopPermissionWatch =
      this.deps.watchMicPermission?.(() => {
        if (this.alive(session)) this.dispatch({ type: "mic_lost" });
      }) ?? null;
    session.micMeter = this.deps.createLevelMeter?.(stream) ?? null;

    const pc = this.deps.createPeerConnection();
    session.pc = pc;
    for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (!remote || !this.alive(session)) return;
      session.audio.srcObject = remote;
      this.tryPlay(session.audio, true);
      session.remoteMeter?.close();
      session.remoteMeter = this.deps.createLevelMeter?.(remote) ?? null;
    };
    pc.onconnectionstatechange = () => this.onConnectionState(session);

    const dc = pc.createDataChannel("oai-events");
    session.dc = dc;
    dc.onmessage = (event) => this.onDataChannelMessage(session, event.data);
    dc.onclose = () => this.onDataChannelClosed(session);
    dc.onerror = () => this.deps.log?.("realtime data channel error");

    session.connectTimer = this.addTimer(session, CONNECT_TIMEOUT_MS, () => {
      session.connectTimer = null;
      this.dispatch({ type: "connect_timeout" });
    });

    let sdpOffer: string;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sdpOffer = offer.sdp ?? "";
      if (!sdpOffer) throw new Error("empty SDP offer");
    } catch (err) {
      if (!this.alive(session)) return;
      this.deps.log?.("realtime offer failed", err);
      this.startError = { code: null, message: apiErrorMessage("request_failed") };
      this.dispatch({ type: "start_failed", code: null });
      this.teardownLocal(session);
      return;
    }

    let result: RealtimeStartResult;
    try {
      result = await this.deps.api.start({ sdpOffer, voice, conversationId: this.conversationId });
    } catch (err) {
      if (!this.alive(session)) return;
      const code = (err as { code?: RealtimeApiErrorCode }).code ?? null;
      this.startError = {
        code,
        message: err instanceof Error && err.message ? err.message : apiErrorMessage("request_failed"),
      };
      this.dispatch({ type: "start_failed", code });
      this.teardownLocal(session);
      return;
    }

    if (this.disposed || this.session !== session) return;
    session.realtimeSessionId = result.realtimeSessionId;
    session.expiresAtMs = Date.parse(result.expiresAt) || null;
    session.heartbeatMs = result.heartbeatSec * 1000;
    session.idleTimeoutMs = result.idleTimeoutSec * 1000;
    if (this.conversationId !== result.conversationId) {
      this.transcript = EMPTY_TRANSCRIPT;
      this.persist = EMPTY_PERSIST_QUEUE;
    }
    this.conversationId = result.conversationId;
    this.usage = EMPTY_USAGE_STATE;
    this.usageSessionId = result.realtimeSessionId;
    if (session.tearingDown) {
      // Ended while `start` was in flight: the server session must still be closed.
      void this.finishOnServer(session, this.machine.endReason ?? "user_ended");
      return;
    }
    this.dispatch({ type: "session_started" });

    try {
      await pc.setRemoteDescription({ type: "answer", sdp: result.sdpAnswer });
    } catch (err) {
      if (!this.alive(session)) return;
      this.deps.log?.("realtime setRemoteDescription failed", err);
      this.dispatch({ type: "connect_timeout" });
      return;
    }
    if (pc.connectionState === "connected") this.onConnectionState(session);
  }

  private onConnectionState(session: Session): void {
    if (!this.alive(session) || !session.pc) return;
    const state = session.pc.connectionState;
    if (state === "connected") {
      this.clearGrace(session);
      if (this.machine.phase !== "connecting") return;
      this.dispatch({ type: "rtc_state", state: "connected" });
      if (isLivePhase(this.machine.phase)) this.onLive(session);
    } else if (state === "disconnected") {
      this.startGrace(session);
    } else if (state === "failed" || state === "closed") {
      this.dispatch({ type: "rtc_state", state });
    }
  }

  private onLive(session: Session): void {
    if (session.connectTimer) {
      clearTimeout(session.connectTimer);
      session.timers.delete(session.connectTimer);
      session.connectTimer = null;
    }
    const id = session.realtimeSessionId!;
    void this.deps.api.connected(id).catch((err) => this.deps.log?.("realtime connected failed", err));

    if (session.heartbeatMs > 0) {
      const heartbeat = setInterval(() => void this.heartbeat(session), session.heartbeatMs);
      session.intervals.add(heartbeat);
    }
    const tick = setInterval(() => {
      if (this.alive(session)) this.emit();
    }, TICK_MS);
    session.intervals.add(tick);

    if (session.expiresAtMs !== null) {
      this.addTimer(session, Math.max(0, session.expiresAtMs - this.now()), () =>
        this.dispatch({ type: "max_duration" }),
      );
      this.addTimer(session, Math.max(0, session.expiresAtMs - TIME_WARNING_MS - this.now()), () => this.emit());
    }
    this.resetIdle(session);
  }

  private async heartbeat(session: Session): Promise<void> {
    if (!this.alive(session) || !session.realtimeSessionId) return;
    // Keep the token for the pagehide keepalive `end` fresh (JWTs expire within a long call).
    void this.deps
      .getAccessToken()
      .then((token) => {
        if (token) this.accessToken = token;
      })
      .catch(() => undefined);
    try {
      const { stop } = await this.deps.api.heartbeat(session.realtimeSessionId, this.counters());
      if (!this.alive(session) || !stop) return;
      this.dispatch(stop === "budget_reached" ? { type: "budget_stop" } : { type: "max_duration" });
    } catch (err) {
      this.deps.log?.("realtime heartbeat failed", err);
    }
  }

  private resetIdle(session: Session): void {
    if (session.idleTimeoutMs <= 0) return;
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.timers.delete(session.idleTimer);
    }
    session.idleTimer = this.addTimer(session, session.idleTimeoutMs, () => {
      session.idleTimer = null;
      this.dispatch({ type: "idle_timeout" });
    });
  }

  private startGrace(session: Session): void {
    if (session.graceTimer) return;
    session.graceTimer = this.addTimer(session, DISCONNECT_GRACE_MS, () => {
      session.graceTimer = null;
      if (session.pc?.connectionState !== "connected") this.dispatch({ type: "rtc_state", state: "failed" });
    });
  }

  private clearGrace(session: Session): void {
    if (!session.graceTimer) return;
    clearTimeout(session.graceTimer);
    session.timers.delete(session.graceTimer);
    session.graceTimer = null;
  }

  private onDataChannelClosed(session: Session): void {
    if (!this.alive(session) || !isLivePhase(this.machine.phase)) return;
    const nearExpiry = session.expiresAtMs !== null && session.expiresAtMs - this.now() <= EXPIRY_SLACK_MS;
    this.dispatch(nearExpiry ? { type: "max_duration" } : { type: "rtc_state", state: "failed" });
  }

  // ---- server events ------------------------------------------------------

  private onDataChannelMessage(session: Session, data: unknown): void {
    if (this.disposed || this.session !== session) return;
    // While Kota finishes after budget_reached, keep collecting her words and watch for the stop.
    if (session.tearingDown && !this.audioDrainResolve) return;
    const event = parseRealtimeServerEvent(data);
    if (!event) return;

    if (event.type === "error") this.deps.log?.("realtime server error", event);
    if (event.type === "input_audio_buffer.speech_started" || event.type === "output_audio_buffer.started") {
      this.resetIdle(session);
    }

    this.transcript = applyTranscriptEvent(this.transcript, event);

    const payload = usagePayloadFromEvent(event);
    if (payload) {
      this.usage = enqueueUsage(this.usage, payload, this.now());
      this.pumpUsage();
    }

    this.dispatch(event);

    if (
      this.audioDrainResolve &&
      (event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared")
    ) {
      this.audioDrainResolve();
    }

    if (event.type === "response.done" && event.functionCalls.length > 0) {
      void this.runTools(session, event.functionCalls);
    }

    this.pumpTranscript(session);
  }

  private send(session: Session, message: Record<string, unknown>): void {
    const dc = session.dc;
    if (dc && dc.readyState === "open") {
      try {
        dc.send(JSON.stringify(message));
      } catch (err) {
        this.deps.log?.("realtime send failed", err);
      }
    }
  }

  private async runTools(session: Session, calls: RealtimeFunctionCall[]): Promise<void> {
    const id = session.realtimeSessionId;
    if (!id) return;
    for (const call of calls) {
      let output: string;
      try {
        const result = await this.deps.api.tool({
          realtimeSessionId: id,
          callId: call.callId,
          name: call.name,
          arguments: call.arguments,
        });
        output = "output" in result ? result.output : JSON.stringify({ error: result.error });
      } catch {
        output = JSON.stringify({ error: "tool_failed" });
      }
      if (!this.alive(session) || !isLivePhase(this.machine.phase)) return;
      this.send(session, {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: call.callId, output },
      });
    }
    if (this.alive(session) && isLivePhase(this.machine.phase)) this.send(session, { type: "response.create" });
  }

  // ---- transcript persistence ---------------------------------------------

  private pumpTranscript(session: Session, flushAll = false): void {
    if (session.transcriptInFlight || !session.realtimeSessionId) return;
    if (session.transcriptTimer) {
      clearTimeout(session.transcriptTimer);
      session.timers.delete(session.transcriptTimer);
      session.transcriptTimer = null;
    }
    const items = getTranscriptItems(this.transcript);
    const take = takePersistable(items, this.persist, flushAll ? Number.MAX_SAFE_INTEGER : this.now());
    this.persist = take.state;
    if (take.batch.length === 0) {
      if (take.nextDeadlineMs !== null && !session.tearingDown) {
        session.transcriptTimer = this.addTimer(session, Math.max(0, take.nextDeadlineMs - this.now()), () => {
          session.transcriptTimer = null;
          this.pumpTranscript(session);
        });
      }
      return;
    }
    session.transcriptInFlight = this.sendTranscript(session, take.batch, flushAll);
  }

  private async sendTranscript(session: Session, batch: PersistItem[], flushAll: boolean): Promise<void> {
    const ids = batch.map((item) => item.itemId);
    try {
      const { crisis } = await this.deps.api.transcript(session.realtimeSessionId!, batch);
      this.persist = ackPersisted(this.persist, ids);
      session.transcriptInFlight = null;
      if (crisis && !this.crisis) {
        this.crisis = crisis;
        if (this.session === session && isSessionBusy(this.machine.phase) && !session.tearingDown) {
          this.dispatch({ type: "crisis" });
        } else {
          this.emit();
        }
      }
    } catch (err) {
      this.deps.log?.("realtime transcript failed", err);
      this.persist = releaseInFlight(this.persist, ids);
      session.transcriptInFlight = null;
      if (flushAll) return;
      if (this.alive(session)) {
        session.transcriptTimer = this.addTimer(session, TRANSCRIPT_RETRY_MS, () => {
          session.transcriptTimer = null;
          this.pumpTranscript(session);
        });
      }
      return;
    }
    if (this.session === session && !this.disposed) this.pumpTranscript(session, flushAll);
  }

  /** Persist everything left, unfinished items included (`[inaudible]` / partial Kota). */
  private async flushTranscript(session: Session): Promise<void> {
    const idle = async () => {
      while (session.transcriptInFlight) await session.transcriptInFlight;
    };
    // Each pass sends what is left (a failed batch is released and resent); bounded so `end` is never stuck.
    for (let attempt = 0; attempt < FLUSH_ATTEMPTS; attempt += 1) {
      await idle();
      this.pumpTranscript(session, true);
      if (!session.transcriptInFlight) return;
    }
    await idle();
  }

  // ---- usage --------------------------------------------------------------

  private pumpUsage(): void {
    if (this.disposed || !this.usageSessionId) return;
    if (this.usageTimer) {
      clearTimeout(this.usageTimer);
      this.usageTimer = null;
    }
    const sessionId = this.usageSessionId;
    const { due, state } = takeDueUsage(this.usage, this.now());
    this.usage = state;
    for (const payload of due) {
      const key = usageKey(payload);
      void this.deps.api
        .usage(sessionId, payload)
        .then(() => {
          if (this.usageSessionId === sessionId) this.usage = markUsageSent(this.usage, key);
        })
        .catch((err) => {
          this.deps.log?.("realtime usage failed", err);
          if (this.usageSessionId !== sessionId) return;
          this.usage = markUsageFailed(this.usage, key, this.now());
          this.scheduleUsage();
        });
    }
    this.scheduleUsage();
  }

  private scheduleUsage(): void {
    if (this.disposed || this.usageTimer) return;
    const next = nextUsageAttemptAt(this.usage);
    if (next === null) return;
    this.usageTimer = setTimeout(() => {
      this.usageTimer = null;
      this.pumpUsage();
    }, Math.max(0, next - this.now()));
  }

  private counters(): RealtimeCounters {
    return { responsesSeen: this.usage.responsesSeen, transcriptionsSeen: this.usage.transcriptionsSeen };
  }

  // ---- teardown -----------------------------------------------------------

  private dispatch(event: RealtimeMachineEvent): void {
    const before = this.machine;
    this.machine = realtimeSessionReducer(before, event);
    const session = this.session;
    if (session && before.phase !== "ending" && this.machine.phase === "ending" && !session.tearingDown) {
      void this.teardown(session, this.machine.endReason ?? "error", before.audioPlaying);
    } else if (session && this.machine.phase === "ended" && before.phase !== "ended" && !session.tearingDown) {
      // Ended without a server session (e.g. user_end while requesting the mic).
      session.tearingDown = true;
      this.releaseMedia(session);
      this.clearSessionTimers(session);
    }
    this.emit();
  }

  private async teardown(session: Session, reason: RealtimeEndReason, wasPlaying: boolean): Promise<void> {
    session.tearingDown = true;
    this.clearSessionTimers(session);

    if (reason === "crisis") {
      this.send(session, { type: "response.cancel" });
      this.send(session, { type: "output_audio_buffer.clear" });
    } else if (reason === "budget_reached" && wasPlaying) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, BUDGET_DRAIN_MS);
        this.audioDrainResolve = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      this.audioDrainResolve = null;
    }

    this.releaseMedia(session);
    if (session.realtimeSessionId) await this.finishOnServer(session, reason);
    if (this.session === session && this.machine.phase === "ending") this.dispatch({ type: "ended" });
  }

  private async finishOnServer(session: Session, reason: RealtimeEndReason): Promise<void> {
    const id = session.realtimeSessionId!;
    await this.flushTranscript(session);
    try {
      await this.deps.api.end(this.endInput(id, reason));
    } catch (err) {
      this.deps.log?.("realtime end failed", err);
    }
    this.pumpUsage();
  }

  private endInput(realtimeSessionId: string, reason: RealtimeEndReason): RealtimeEndInput {
    return { realtimeSessionId, reason, ...this.counters() };
  }

  /** Failure before a server session existed: release media only. */
  private teardownLocal(session: Session): void {
    session.tearingDown = true;
    this.releaseMedia(session);
    this.clearSessionTimers(session);
  }

  private releaseMedia(session: Session): void {
    session.stopPermissionWatch?.();
    session.stopPermissionWatch = null;
    if (session.stream) {
      for (const track of session.stream.getTracks()) {
        track.onended = null;
        track.stop();
      }
    }
    if (session.dc) {
      session.dc.onmessage = null;
      session.dc.onclose = null;
      session.dc.onerror = null;
      try {
        session.dc.close();
      } catch {
        // already closed
      }
    }
    if (session.pc) {
      session.pc.ontrack = null;
      session.pc.onconnectionstatechange = null;
      try {
        session.pc.close();
      } catch {
        // already closed
      }
    }
    session.micMeter?.close();
    session.remoteMeter?.close();
    session.micMeter = null;
    session.remoteMeter = null;
    try {
      session.audio.pause();
    } catch {
      // ignore
    }
    session.audio.srcObject = null;
  }

  private clearSessionTimers(session: Session): void {
    for (const timer of session.timers) clearTimeout(timer);
    for (const interval of session.intervals) clearInterval(interval);
    session.timers.clear();
    session.intervals.clear();
    session.connectTimer = null;
    session.graceTimer = null;
    session.idleTimer = null;
    session.transcriptTimer = null;
  }

  private addTimer(session: Session, ms: number, fn: () => void): ReturnType<typeof setTimeout> {
    const timer = setTimeout(() => {
      session.timers.delete(timer);
      if (this.alive(session)) fn();
    }, ms);
    session.timers.add(timer);
    return timer;
  }

  private tryPlay(audio: RtcAudioLike, report: boolean): void {
    try {
      const result = audio.play();
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            if (report && this.playbackBlocked) {
              this.playbackBlocked = false;
              this.emit();
            }
          },
          (err: unknown) => {
            const name = err && typeof err === "object" && "name" in err ? (err as { name: unknown }).name : null;
            if (report && name === "NotAllowedError" && !this.playbackBlocked) {
              this.playbackBlocked = true;
              this.emit();
            }
          },
        );
      }
    } catch {
      // play() before a source is set may throw synchronously in old engines.
    }
  }
}
