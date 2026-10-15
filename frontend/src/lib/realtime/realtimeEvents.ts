/**
 * NCLDD-57 S4 — typed parsing of the OpenAI Realtime server events the Conversation mode uses
 * (data channel `oai-events`). Names/fields: docs/NCLDD-57-realtime-limitations.md §1.4.
 * Unknown or malformed events parse to `null` and are ignored by callers.
 */

export type RealtimeItemRole = "user" | "assistant" | "system";

export type RealtimeFunctionCall = {
  callId: string;
  name: string;
  /** JSON string as sent by the model. */
  arguments: string;
  itemId: string | null;
};

export type RealtimeServerEvent =
  | { type: "session.created" | "session.updated" }
  | { type: "input_audio_buffer.speech_started" | "input_audio_buffer.speech_stopped"; itemId: string | null }
  | { type: "input_audio_buffer.committed"; itemId: string | null; previousItemId: string | null }
  | {
      /** Docs disagree on which item event fires (C5): handle all three, dedupe by item id. */
      type: "conversation.item.added" | "conversation.item.created" | "conversation.item.done";
      itemId: string;
      previousItemId: string | null;
      itemType: string;
      role: RealtimeItemRole | null;
    }
  | {
      type: "conversation.item.input_audio_transcription.delta";
      itemId: string;
      contentIndex: number;
      delta: string;
    }
  | {
      type: "conversation.item.input_audio_transcription.completed";
      itemId: string;
      contentIndex: number;
      transcript: string;
      usage: unknown;
    }
  | {
      type: "conversation.item.input_audio_transcription.failed";
      itemId: string;
      contentIndex: number;
      errorCode: string | null;
    }
  | { type: "response.created"; responseId: string | null }
  | {
      type: "response.done";
      responseId: string | null;
      status: string | null;
      statusReason: string | null;
      usage: unknown;
      functionCalls: RealtimeFunctionCall[];
    }
  | {
      type: "response.output_audio_transcript.delta";
      responseId: string | null;
      itemId: string;
      contentIndex: number;
      delta: string;
    }
  | {
      type: "response.output_audio_transcript.done";
      responseId: string | null;
      itemId: string;
      contentIndex: number;
      transcript: string;
    }
  | { type: "response.output_audio.delta"; responseId: string | null; itemId: string | null }
  | {
      type: "output_audio_buffer.started" | "output_audio_buffer.stopped" | "output_audio_buffer.cleared";
      responseId: string | null;
    }
  | { type: "error"; code: string | null; message: string | null; errorType: string | null };

export type RealtimeServerEventType = RealtimeServerEvent["type"];

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function index(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function role(value: unknown): RealtimeItemRole | null {
  return value === "user" || value === "assistant" || value === "system" ? value : null;
}

function parseFunctionCalls(output: unknown): RealtimeFunctionCall[] {
  if (!Array.isArray(output)) return [];
  const calls: RealtimeFunctionCall[] = [];
  for (const entry of output) {
    const item = asRecord(entry);
    if (!item || item.type !== "function_call") continue;
    const callId = str(item.call_id);
    const name = str(item.name);
    if (!callId || !name) continue;
    calls.push({ callId, name, arguments: text(item.arguments), itemId: str(item.id) });
  }
  return calls;
}

/** Parse one data-channel message (JSON string or already-parsed object). */
export function parseRealtimeServerEvent(raw: unknown): RealtimeServerEvent | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const event = asRecord(value);
  const type = event ? str(event.type) : null;
  if (!event || !type) return null;

  switch (type) {
    case "session.created":
    case "session.updated":
      return { type };

    case "input_audio_buffer.speech_started":
    case "input_audio_buffer.speech_stopped":
      return { type, itemId: str(event.item_id) };

    case "input_audio_buffer.committed":
      return { type, itemId: str(event.item_id), previousItemId: str(event.previous_item_id) };

    case "conversation.item.added":
    case "conversation.item.created":
    case "conversation.item.done": {
      const item = asRecord(event.item);
      const itemId = item ? str(item.id) : null;
      if (!item || !itemId) return null;
      return {
        type,
        itemId,
        previousItemId: str(event.previous_item_id),
        itemType: str(item.type) ?? "message",
        role: role(item.role),
      };
    }

    case "conversation.item.input_audio_transcription.delta": {
      const itemId = str(event.item_id);
      if (!itemId) return null;
      return { type, itemId, contentIndex: index(event.content_index), delta: text(event.delta) };
    }

    case "conversation.item.input_audio_transcription.completed": {
      const itemId = str(event.item_id);
      if (!itemId) return null;
      return {
        type,
        itemId,
        contentIndex: index(event.content_index),
        transcript: text(event.transcript),
        usage: event.usage ?? null,
      };
    }

    case "conversation.item.input_audio_transcription.failed": {
      const itemId = str(event.item_id);
      if (!itemId) return null;
      const error = asRecord(event.error);
      return { type, itemId, contentIndex: index(event.content_index), errorCode: error ? str(error.code) : null };
    }

    case "response.created": {
      const response = asRecord(event.response);
      return { type, responseId: response ? str(response.id) : null };
    }

    case "response.done": {
      const response = asRecord(event.response);
      const details = response ? asRecord(response.status_details) : null;
      return {
        type,
        responseId: response ? str(response.id) : null,
        status: response ? str(response.status) : null,
        statusReason: details ? str(details.reason) : null,
        usage: response?.usage ?? null,
        functionCalls: parseFunctionCalls(response?.output),
      };
    }

    case "response.output_audio_transcript.delta": {
      const itemId = str(event.item_id);
      if (!itemId) return null;
      return {
        type,
        responseId: str(event.response_id),
        itemId,
        contentIndex: index(event.content_index),
        delta: text(event.delta),
      };
    }

    case "response.output_audio_transcript.done": {
      const itemId = str(event.item_id);
      if (!itemId) return null;
      return {
        type,
        responseId: str(event.response_id),
        itemId,
        contentIndex: index(event.content_index),
        transcript: text(event.transcript),
      };
    }

    case "response.output_audio.delta":
      return { type, responseId: str(event.response_id), itemId: str(event.item_id) };

    case "output_audio_buffer.started":
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return { type, responseId: str(event.response_id) };

    case "error": {
      const error = asRecord(event.error);
      return {
        type,
        code: error ? str(error.code) : null,
        message: error ? str(error.message) : null,
        errorType: error ? str(error.type) : null,
      };
    }

    default:
      return null;
  }
}
