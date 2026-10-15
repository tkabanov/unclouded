/**
 * NCLDD-57 S4 — decides which transcript items to send to `realtime-voice` `transcript`
 * (plan §6.1). Items go out strictly in conversation order: a not-yet-final item blocks
 * everything after it (so a Kota reply never lands before the user turn it answers).
 *
 * An item that stays unfinished for `timeoutMs` stops blocking:
 * - user item → persisted as `[inaudible]` (transcription failed or never arrived);
 * - Kota item → persisted with the text heard so far, marked interrupted; dropped if empty.
 * A late transcript for an item already sent is ignored (dedupe by `itemId`).
 * Callers keep one `transcript` request in flight at a time so batches arrive in order.
 */
import type { TranscriptItem, TranscriptRole } from "./transcriptAssembler";

export const INAUDIBLE_PLACEHOLDER = "[inaudible]";
export const DEFAULT_PERSIST_TIMEOUT_MS = 8000;

export type PersistItem = {
  itemId: string;
  role: TranscriptRole;
  text: string;
  interrupted: boolean;
};

export type PersistQueueState = {
  /** Sent and acknowledged, or skipped on purpose. */
  done: ReadonlySet<string>;
  inFlight: ReadonlySet<string>;
  /** First time an unfinished item was seen (ms). */
  firstSeenAt: Readonly<Record<string, number>>;
};

export const EMPTY_PERSIST_QUEUE: PersistQueueState = {
  done: new Set(),
  inFlight: new Set(),
  firstSeenAt: {},
};

export type PersistTakeResult = {
  batch: PersistItem[];
  state: PersistQueueState;
  /** When the blocking item times out (ms), so the caller can schedule the next take. */
  nextDeadlineMs: number | null;
};

export function takePersistable(
  items: readonly TranscriptItem[],
  state: PersistQueueState,
  nowMs: number,
  timeoutMs = DEFAULT_PERSIST_TIMEOUT_MS,
): PersistTakeResult {
  const done = new Set(state.done);
  const inFlight = new Set(state.inFlight);
  const firstSeenAt = { ...state.firstSeenAt };
  const batch: PersistItem[] = [];
  let nextDeadlineMs: number | null = null;

  for (const item of items) {
    if (done.has(item.itemId) || inFlight.has(item.itemId)) continue;

    let text: string;
    let interrupted = item.interrupted;

    if (item.final) {
      text = item.role === "user" && (item.failed || !item.text.trim()) ? INAUDIBLE_PLACEHOLDER : item.text;
    } else {
      const seenAt = firstSeenAt[item.itemId] ?? nowMs;
      firstSeenAt[item.itemId] = seenAt;
      if (nowMs - seenAt < timeoutMs) {
        nextDeadlineMs = seenAt + timeoutMs;
        break;
      }
      if (item.role === "user") {
        text = INAUDIBLE_PLACEHOLDER;
      } else {
        interrupted = true;
        text = item.text;
      }
    }

    if (item.role === "assistant" && !text.trim()) {
      done.add(item.itemId);
      continue;
    }

    inFlight.add(item.itemId);
    batch.push({ itemId: item.itemId, role: item.role, text, interrupted });
  }

  return { batch, state: { done, inFlight, firstSeenAt }, nextDeadlineMs };
}

/** The `transcript` call succeeded for these items. */
export function ackPersisted(state: PersistQueueState, itemIds: readonly string[]): PersistQueueState {
  const done = new Set(state.done);
  const inFlight = new Set(state.inFlight);
  for (const id of itemIds) {
    inFlight.delete(id);
    done.add(id);
  }
  return { ...state, done, inFlight };
}

/** The `transcript` call failed: put the items back so the next take resends them in order. */
export function releaseInFlight(state: PersistQueueState, itemIds: readonly string[]): PersistQueueState {
  const inFlight = new Set(state.inFlight);
  for (const id of itemIds) inFlight.delete(id);
  return { ...state, inFlight };
}
