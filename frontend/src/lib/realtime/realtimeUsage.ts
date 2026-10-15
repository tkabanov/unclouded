/**
 * NCLDD-57 S4 — maps realtime usage to the `realtime-voice` `usage` action and keeps a retry
 * queue (plan §6.1, §7.1). Events are idempotent on the server by `externalEventId`
 * (`response.id` for responses, `item_id` for transcriptions).
 *
 * Token columns follow the ledger convention: `inputTokens` / `audioInputTokens` include their
 * cached part; `cachedInputTokens` / `cachedAudioInputTokens` are that cached part (C4).
 * The model is not sent: the server takes it from the session row.
 */
import type { RealtimeServerEvent } from "./realtimeEvents";

export type RealtimeUsageAmounts = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  audioInputTokens: number;
  cachedAudioInputTokens: number;
  audioOutputTokens: number;
  /** Transcription billed by duration (C3). */
  audioSeconds?: number;
};

export type RealtimeUsagePayload = {
  kind: "response" | "transcription";
  externalEventId: string;
  usage: RealtimeUsageAmounts;
};

type Raw = Record<string, unknown>;

function rec(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function zero(): RealtimeUsageAmounts {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    audioInputTokens: 0,
    cachedAudioInputTokens: 0,
    audioOutputTokens: 0,
  };
}

/** `response.done.response.usage` → amounts; null when the event carries no usage. */
export function normalizeResponseUsage(raw: unknown): RealtimeUsageAmounts | null {
  const usage = rec(raw);
  if (!usage) return null;
  const input = rec(usage.input_token_details);
  const cached = input ? rec(input.cached_tokens_details) : null;
  const output = rec(usage.output_token_details);
  const amounts = zero();

  if (input) {
    amounts.inputTokens = count(input.text_tokens);
    amounts.audioInputTokens = count(input.audio_tokens);
  } else {
    amounts.inputTokens = count(usage.input_tokens);
  }

  if (cached) {
    amounts.cachedInputTokens = count(cached.text_tokens);
    amounts.cachedAudioInputTokens = count(cached.audio_tokens);
  } else {
    // No per-modality split: count all cached tokens as text (C4 fallback).
    amounts.cachedInputTokens = Math.min(count(input?.cached_tokens), amounts.inputTokens);
  }

  if (output) {
    amounts.outputTokens = count(output.text_tokens);
    amounts.audioOutputTokens = count(output.audio_tokens);
  } else {
    amounts.outputTokens = count(usage.output_tokens);
  }

  return amounts;
}

/** `…input_audio_transcription.completed.usage` (tokens or duration, C3) → amounts. */
export function normalizeTranscriptionUsage(raw: unknown): RealtimeUsageAmounts | null {
  const usage = rec(raw);
  if (!usage) return null;
  const amounts = zero();
  if (usage.type === "duration") {
    const seconds = typeof usage.seconds === "number" && Number.isFinite(usage.seconds) ? usage.seconds : 0;
    if (seconds <= 0) return null;
    amounts.audioSeconds = seconds;
    return amounts;
  }
  const input = rec(usage.input_token_details);
  if (input) {
    amounts.inputTokens = count(input.text_tokens);
    amounts.audioInputTokens = count(input.audio_tokens);
  } else {
    amounts.audioInputTokens = count(usage.input_tokens);
  }
  amounts.outputTokens = count(usage.output_tokens);
  return amounts;
}

/** Usage payload for a server event, or null when the event carries none. */
export function usagePayloadFromEvent(event: RealtimeServerEvent): RealtimeUsagePayload | null {
  if (event.type === "response.done") {
    const usage = normalizeResponseUsage(event.usage);
    return usage && event.responseId ? { kind: "response", externalEventId: event.responseId, usage } : null;
  }
  if (event.type === "conversation.item.input_audio_transcription.completed") {
    const usage = normalizeTranscriptionUsage(event.usage);
    return usage ? { kind: "transcription", externalEventId: event.itemId, usage } : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Retry queue
// ---------------------------------------------------------------------------

export const USAGE_RETRY_BASE_MS = 1000;
export const USAGE_RETRY_MAX_MS = 30_000;
export const USAGE_MAX_ATTEMPTS = 6;

type QueueEntry = {
  payload: RealtimeUsagePayload;
  attempts: number;
  nextAttemptAt: number;
  inFlight: boolean;
};

export type RealtimeUsageState = {
  /** Every usage-bearing event seen, by key (`kind:externalEventId`). */
  seen: ReadonlySet<string>;
  responsesSeen: number;
  transcriptionsSeen: number;
  queue: readonly QueueEntry[];
  /** Gave up after `USAGE_MAX_ATTEMPTS` (the session shows as partial on the server). */
  dropped: number;
};

export const EMPTY_USAGE_STATE: RealtimeUsageState = {
  seen: new Set(),
  responsesSeen: 0,
  transcriptionsSeen: 0,
  queue: [],
  dropped: 0,
};

export function usageKey(payload: Pick<RealtimeUsagePayload, "kind" | "externalEventId">): string {
  return `${payload.kind}:${payload.externalEventId}`;
}

/** Count and queue a payload; repeats of the same event are ignored. */
export function enqueueUsage(
  state: RealtimeUsageState,
  payload: RealtimeUsagePayload,
  nowMs: number,
): RealtimeUsageState {
  const key = usageKey(payload);
  if (state.seen.has(key)) return state;
  const seen = new Set(state.seen);
  seen.add(key);
  return {
    ...state,
    seen,
    responsesSeen: state.responsesSeen + (payload.kind === "response" ? 1 : 0),
    transcriptionsSeen: state.transcriptionsSeen + (payload.kind === "transcription" ? 1 : 0),
    queue: [...state.queue, { payload, attempts: 0, nextAttemptAt: nowMs, inFlight: false }],
  };
}

/** Payloads due now; they are marked in flight. */
export function takeDueUsage(
  state: RealtimeUsageState,
  nowMs: number,
): { due: RealtimeUsagePayload[]; state: RealtimeUsageState } {
  const due: RealtimeUsagePayload[] = [];
  const queue = state.queue.map((entry) => {
    if (entry.inFlight || entry.nextAttemptAt > nowMs) return entry;
    due.push(entry.payload);
    return { ...entry, inFlight: true };
  });
  return { due, state: due.length ? { ...state, queue } : state };
}

export function markUsageSent(state: RealtimeUsageState, key: string): RealtimeUsageState {
  return { ...state, queue: state.queue.filter((entry) => usageKey(entry.payload) !== key) };
}

export function usageRetryDelayMs(attempts: number): number {
  return Math.min(USAGE_RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), USAGE_RETRY_MAX_MS);
}

/** A send failed: back off, or drop after `USAGE_MAX_ATTEMPTS`. */
export function markUsageFailed(state: RealtimeUsageState, key: string, nowMs: number): RealtimeUsageState {
  let dropped = state.dropped;
  const queue: QueueEntry[] = [];
  for (const entry of state.queue) {
    if (usageKey(entry.payload) !== key) {
      queue.push(entry);
      continue;
    }
    const attempts = entry.attempts + 1;
    if (attempts >= USAGE_MAX_ATTEMPTS) {
      dropped += 1;
      continue;
    }
    queue.push({ ...entry, attempts, inFlight: false, nextAttemptAt: nowMs + usageRetryDelayMs(attempts) });
  }
  return { ...state, queue, dropped };
}

/** Earliest retry time of a waiting payload (ms), for scheduling. */
export function nextUsageAttemptAt(state: RealtimeUsageState): number | null {
  let next: number | null = null;
  for (const entry of state.queue) {
    if (entry.inFlight) continue;
    if (next === null || entry.nextAttemptAt < next) next = entry.nextAttemptAt;
  }
  return next;
}
