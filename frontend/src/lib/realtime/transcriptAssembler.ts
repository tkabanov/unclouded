/**
 * NCLDD-57 S4 — builds the live transcript from realtime events (plan §6.1).
 *
 * - Order follows `previous_item_id` from `conversation.item.added|created|done` (C5), not
 *   arrival order; an item seen before its predecessor is re-threaded when the predecessor arrives.
 * - Text is accumulated per `item_id` / `content_index` from deltas.
 * - A user item is final on `…transcription.completed` (or failed on `…failed`); a Kota item on
 *   `response.output_audio_transcript.done`, or on `response.done` with whatever text arrived.
 * - A Kota reply cut off by the user (`output_audio_buffer.cleared`, or `response.done`
 *   cancelled with `turn_detected`) is marked `interrupted`. Over WebRTC the server truncates the
 *   unplayed audio itself; the stored text is what the transcript contained when it stopped.
 */
import type { RealtimeServerEvent } from "./realtimeEvents";

export type TranscriptRole = "user" | "assistant";

type ItemRecord = {
  itemId: string;
  /** `undefined` = predecessor not reported yet; `null` = first item. */
  previousItemId: string | null | undefined;
  /** Function calls etc. take part in ordering but are not shown. */
  isMessage: boolean;
  role: TranscriptRole | null;
  parts: Record<number, string>;
  final: boolean;
  failed: boolean;
  interrupted: boolean;
  responseId: string | null;
};

export type TranscriptState = {
  items: Readonly<Record<string, ItemRecord>>;
  /** Item ids in first-seen order (tie-break for ordering). */
  arrival: readonly string[];
};

export type TranscriptItem = {
  itemId: string;
  role: TranscriptRole;
  text: string;
  final: boolean;
  /** User transcription failed (nothing usable was heard). */
  failed: boolean;
  interrupted: boolean;
};

export const EMPTY_TRANSCRIPT: TranscriptState = { items: {}, arrival: [] };

function blank(itemId: string): ItemRecord {
  return {
    itemId,
    previousItemId: undefined,
    isMessage: true,
    role: null,
    parts: {},
    final: false,
    failed: false,
    interrupted: false,
    responseId: null,
  };
}

function upsert(
  state: TranscriptState,
  itemId: string,
  update: (item: ItemRecord) => ItemRecord,
): TranscriptState {
  const existing = state.items[itemId];
  const next = update(existing ?? blank(itemId));
  return {
    items: { ...state.items, [itemId]: next },
    arrival: existing ? state.arrival : [...state.arrival, itemId],
  };
}

function joinParts(parts: Record<number, string>): string {
  return Object.keys(parts)
    .map(Number)
    .sort((a, b) => a - b)
    .map((key) => parts[key])
    .join("");
}

function markResponse(
  state: TranscriptState,
  responseId: string | null,
  update: (item: ItemRecord) => ItemRecord,
): TranscriptState {
  let next = state;
  for (const id of state.arrival) {
    const item = state.items[id];
    if (item.role === "assistant" && !item.final && (responseId === null || item.responseId === responseId)) {
      next = upsert(next, id, update);
    }
  }
  return next;
}

export function applyTranscriptEvent(state: TranscriptState, event: RealtimeServerEvent): TranscriptState {
  switch (event.type) {
    case "conversation.item.added":
    case "conversation.item.created":
    case "conversation.item.done": {
      const isMessage = event.itemType === "message";
      if (isMessage && event.role === "system") return state;
      return upsert(state, event.itemId, (item) => ({
        ...item,
        previousItemId: item.previousItemId === undefined ? event.previousItemId : item.previousItemId,
        isMessage,
        role: event.role === "user" || event.role === "assistant" ? event.role : item.role,
      }));
    }

    case "input_audio_buffer.committed":
      if (!event.itemId) return state;
      return upsert(state, event.itemId, (item) => ({
        ...item,
        role: item.role ?? "user",
        previousItemId: item.previousItemId === undefined ? event.previousItemId : item.previousItemId,
      }));

    case "conversation.item.input_audio_transcription.delta":
      return upsert(state, event.itemId, (item) =>
        item.final
          ? item
          : {
              ...item,
              role: item.role ?? "user",
              parts: { ...item.parts, [event.contentIndex]: (item.parts[event.contentIndex] ?? "") + event.delta },
            },
      );

    case "conversation.item.input_audio_transcription.completed":
      return upsert(state, event.itemId, (item) => ({
        ...item,
        role: item.role ?? "user",
        parts: { ...item.parts, [event.contentIndex]: event.transcript },
        final: true,
        failed: false,
      }));

    case "conversation.item.input_audio_transcription.failed":
      return upsert(state, event.itemId, (item) =>
        item.final ? item : { ...item, role: item.role ?? "user", final: true, failed: true },
      );

    case "response.output_audio_transcript.delta":
      return upsert(state, event.itemId, (item) =>
        item.final
          ? item
          : {
              ...item,
              role: item.role ?? "assistant",
              responseId: item.responseId ?? event.responseId,
              parts: { ...item.parts, [event.contentIndex]: (item.parts[event.contentIndex] ?? "") + event.delta },
            },
      );

    case "response.output_audio_transcript.done":
      return upsert(state, event.itemId, (item) =>
        item.final
          ? item
          : {
              ...item,
              role: item.role ?? "assistant",
              responseId: item.responseId ?? event.responseId,
              parts: { ...item.parts, [event.contentIndex]: event.transcript },
              final: true,
            },
      );

    case "output_audio_buffer.cleared":
      return markResponse(state, event.responseId, (item) => ({ ...item, interrupted: true }));

    case "response.done": {
      if (!event.responseId) return state;
      const interrupted = event.status === "cancelled" && event.statusReason === "turn_detected";
      let next = state;
      for (const id of state.arrival) {
        const item = next.items[id];
        if (item.role !== "assistant" || item.responseId !== event.responseId) continue;
        next = upsert(next, id, (current) => ({
          ...current,
          final: true,
          interrupted: current.interrupted || interrupted,
        }));
      }
      return next;
    }

    default:
      return state;
  }
}

/**
 * Items in conversation order: roots (first item, or predecessor never seen) in arrival order,
 * each followed by its successors (depth-first, arrival order).
 */
function orderedIds(state: TranscriptState): string[] {
  const children = new Map<string, string[]>();
  const roots: string[] = [];
  for (const id of state.arrival) {
    const prev = state.items[id].previousItemId;
    if (prev && prev !== id && state.items[prev]) {
      const list = children.get(prev) ?? [];
      list.push(id);
      children.set(prev, list);
    } else {
      roots.push(id);
    }
  }

  const out: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    out.push(id);
    for (const child of children.get(id) ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  // Cycles (malformed ids) never become roots; keep them rather than drop text.
  for (const id of state.arrival) visit(id);
  return out;
}

/** Visible messages (user + Kota) in conversation order. */
export function getTranscriptItems(state: TranscriptState): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  for (const id of orderedIds(state)) {
    const item = state.items[id];
    if (!item.isMessage || !item.role) continue;
    items.push({
      itemId: id,
      role: item.role,
      text: joinParts(item.parts),
      final: item.final,
      failed: item.failed,
      interrupted: item.interrupted,
    });
  }
  return items;
}
