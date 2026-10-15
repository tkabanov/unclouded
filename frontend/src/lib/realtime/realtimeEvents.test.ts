import { describe, expect, it } from "vitest";
import { parseRealtimeServerEvent } from "./realtimeEvents";

describe("parseRealtimeServerEvent", () => {
  it("ignores malformed input and unknown events", () => {
    expect(parseRealtimeServerEvent("not json")).toBeNull();
    expect(parseRealtimeServerEvent("[1,2]")).toBeNull();
    expect(parseRealtimeServerEvent(null)).toBeNull();
    expect(parseRealtimeServerEvent({})).toBeNull();
    expect(parseRealtimeServerEvent({ type: "" })).toBeNull();
    expect(parseRealtimeServerEvent({ type: "rate_limits.updated" })).toBeNull();
  });

  it("parses JSON strings and session events", () => {
    expect(parseRealtimeServerEvent('{"type":"session.created","session":{}}')).toEqual({ type: "session.created" });
    expect(parseRealtimeServerEvent({ type: "session.updated" })).toEqual({ type: "session.updated" });
  });

  it("parses input audio buffer events", () => {
    expect(parseRealtimeServerEvent({ type: "input_audio_buffer.speech_started", item_id: "u1" })).toEqual({
      type: "input_audio_buffer.speech_started",
      itemId: "u1",
    });
    expect(parseRealtimeServerEvent({ type: "input_audio_buffer.speech_stopped" })).toEqual({
      type: "input_audio_buffer.speech_stopped",
      itemId: null,
    });
    expect(
      parseRealtimeServerEvent({ type: "input_audio_buffer.committed", item_id: "u1", previous_item_id: null }),
    ).toEqual({ type: "input_audio_buffer.committed", itemId: "u1", previousItemId: null });
  });

  it("parses all three conversation item events (C5)", () => {
    for (const type of ["conversation.item.added", "conversation.item.created", "conversation.item.done"]) {
      expect(
        parseRealtimeServerEvent({
          type,
          previous_item_id: "a0",
          item: { id: "a1", type: "message", role: "assistant" },
        }),
      ).toEqual({ type, itemId: "a1", previousItemId: "a0", itemType: "message", role: "assistant" });
    }
    expect(
      parseRealtimeServerEvent({ type: "conversation.item.added", item: { id: "f1", type: "function_call" } }),
    ).toEqual({
      type: "conversation.item.added",
      itemId: "f1",
      previousItemId: null,
      itemType: "function_call",
      role: null,
    });
    expect(parseRealtimeServerEvent({ type: "conversation.item.added", item: { id: "x", role: "tool" } })).toMatchObject(
      { itemType: "message", role: null },
    );
    expect(parseRealtimeServerEvent({ type: "conversation.item.added", item: {} })).toBeNull();
    expect(parseRealtimeServerEvent({ type: "conversation.item.added" })).toBeNull();
  });

  it("parses input transcription events", () => {
    expect(
      parseRealtimeServerEvent({
        type: "conversation.item.input_audio_transcription.delta",
        item_id: "u1",
        content_index: 0,
        delta: "Hel",
      }),
    ).toEqual({
      type: "conversation.item.input_audio_transcription.delta",
      itemId: "u1",
      contentIndex: 0,
      delta: "Hel",
    });
    expect(
      parseRealtimeServerEvent({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "u1",
        content_index: 2,
        transcript: "Hello",
        usage: { type: "duration", seconds: 2 },
      }),
    ).toEqual({
      type: "conversation.item.input_audio_transcription.completed",
      itemId: "u1",
      contentIndex: 2,
      transcript: "Hello",
      usage: { type: "duration", seconds: 2 },
    });
    expect(
      parseRealtimeServerEvent({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1" }),
    ).toMatchObject({ contentIndex: 0, transcript: "", usage: null });
    expect(
      parseRealtimeServerEvent({
        type: "conversation.item.input_audio_transcription.failed",
        item_id: "u1",
        content_index: -1,
        error: { code: "audio_unintelligible" },
      }),
    ).toEqual({
      type: "conversation.item.input_audio_transcription.failed",
      itemId: "u1",
      contentIndex: 0,
      errorCode: "audio_unintelligible",
    });
    expect(
      parseRealtimeServerEvent({ type: "conversation.item.input_audio_transcription.failed", item_id: "u1" }),
    ).toMatchObject({ errorCode: null });
    for (const type of [
      "conversation.item.input_audio_transcription.delta",
      "conversation.item.input_audio_transcription.completed",
      "conversation.item.input_audio_transcription.failed",
    ]) {
      expect(parseRealtimeServerEvent({ type })).toBeNull();
    }
  });

  it("parses response events with function calls", () => {
    expect(parseRealtimeServerEvent({ type: "response.created", response: { id: "r1" } })).toEqual({
      type: "response.created",
      responseId: "r1",
    });
    expect(parseRealtimeServerEvent({ type: "response.created" })).toEqual({
      type: "response.created",
      responseId: null,
    });
    expect(
      parseRealtimeServerEvent({
        type: "response.done",
        response: {
          id: "r1",
          status: "cancelled",
          status_details: { reason: "turn_detected" },
          usage: { total_tokens: 5 },
          output: [
            { type: "message", id: "a1" },
            { type: "function_call", id: "f1", call_id: "c1", name: "lookup", arguments: '{"q":1}' },
            { type: "function_call", call_id: "c2" },
            "junk",
          ],
        },
      }),
    ).toEqual({
      type: "response.done",
      responseId: "r1",
      status: "cancelled",
      statusReason: "turn_detected",
      usage: { total_tokens: 5 },
      functionCalls: [{ callId: "c1", name: "lookup", arguments: '{"q":1}', itemId: "f1" }],
    });
    expect(parseRealtimeServerEvent({ type: "response.done" })).toEqual({
      type: "response.done",
      responseId: null,
      status: null,
      statusReason: null,
      usage: null,
      functionCalls: [],
    });
  });

  it("parses output transcript and audio events", () => {
    expect(
      parseRealtimeServerEvent({
        type: "response.output_audio_transcript.delta",
        response_id: "r1",
        item_id: "a1",
        content_index: 0,
        delta: "Hi",
      }),
    ).toEqual({
      type: "response.output_audio_transcript.delta",
      responseId: "r1",
      itemId: "a1",
      contentIndex: 0,
      delta: "Hi",
    });
    expect(
      parseRealtimeServerEvent({
        type: "response.output_audio_transcript.done",
        response_id: "r1",
        item_id: "a1",
        transcript: "Hi there",
      }),
    ).toEqual({
      type: "response.output_audio_transcript.done",
      responseId: "r1",
      itemId: "a1",
      contentIndex: 0,
      transcript: "Hi there",
    });
    expect(parseRealtimeServerEvent({ type: "response.output_audio_transcript.delta" })).toBeNull();
    expect(parseRealtimeServerEvent({ type: "response.output_audio_transcript.done" })).toBeNull();
    expect(parseRealtimeServerEvent({ type: "response.output_audio.delta", response_id: "r1" })).toEqual({
      type: "response.output_audio.delta",
      responseId: "r1",
      itemId: null,
    });
    for (const type of ["output_audio_buffer.started", "output_audio_buffer.stopped", "output_audio_buffer.cleared"]) {
      expect(parseRealtimeServerEvent({ type, response_id: "r1" })).toEqual({ type, responseId: "r1" });
    }
  });

  it("parses error events", () => {
    expect(
      parseRealtimeServerEvent({
        type: "error",
        error: { type: "invalid_request_error", code: "session_expired", message: "Expired" },
      }),
    ).toEqual({ type: "error", code: "session_expired", message: "Expired", errorType: "invalid_request_error" });
    expect(parseRealtimeServerEvent({ type: "error" })).toEqual({
      type: "error",
      code: null,
      message: null,
      errorType: null,
    });
  });
});
