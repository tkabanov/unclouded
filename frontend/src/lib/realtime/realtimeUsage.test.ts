import { describe, expect, it } from "vitest";
import type { RealtimeServerEvent } from "./realtimeEvents";
import {
  EMPTY_USAGE_STATE,
  USAGE_MAX_ATTEMPTS,
  USAGE_RETRY_MAX_MS,
  enqueueUsage,
  markUsageFailed,
  markUsageSent,
  nextUsageAttemptAt,
  normalizeResponseUsage,
  normalizeTranscriptionUsage,
  takeDueUsage,
  usageKey,
  usagePayloadFromEvent,
  usageRetryDelayMs,
  type RealtimeUsagePayload,
} from "./realtimeUsage";

const RESPONSE_USAGE = {
  total_tokens: 1300,
  input_tokens: 1000,
  output_tokens: 300,
  input_token_details: {
    text_tokens: 800,
    audio_tokens: 200,
    cached_tokens: 600,
    cached_tokens_details: { text_tokens: 500, audio_tokens: 100 },
  },
  output_token_details: { text_tokens: 50, audio_tokens: 250 },
};

describe("normalizeResponseUsage", () => {
  it("splits text/audio and cached per modality (C4)", () => {
    expect(normalizeResponseUsage(RESPONSE_USAGE)).toEqual({
      inputTokens: 800,
      cachedInputTokens: 500,
      outputTokens: 50,
      audioInputTokens: 200,
      cachedAudioInputTokens: 100,
      audioOutputTokens: 250,
    });
  });

  it("falls back to totals and counts all cached tokens as text without details", () => {
    expect(
      normalizeResponseUsage({
        input_tokens: 400,
        output_tokens: 20,
        input_token_details: { text_tokens: 400, cached_tokens: 900 },
      }),
    ).toMatchObject({ inputTokens: 400, cachedInputTokens: 400, outputTokens: 20, audioInputTokens: 0 });
    expect(normalizeResponseUsage({ input_tokens: 10.7, output_tokens: -3 })).toMatchObject({
      inputTokens: 10,
      cachedInputTokens: 0,
      outputTokens: 0,
    });
  });

  it("returns null without usage", () => {
    expect(normalizeResponseUsage(null)).toBeNull();
    expect(normalizeResponseUsage([1])).toBeNull();
  });
});

describe("normalizeTranscriptionUsage (C3)", () => {
  it("maps token usage", () => {
    expect(
      normalizeTranscriptionUsage({
        type: "tokens",
        input_tokens: 120,
        output_tokens: 15,
        input_token_details: { text_tokens: 20, audio_tokens: 100 },
      }),
    ).toMatchObject({ inputTokens: 20, audioInputTokens: 100, outputTokens: 15 });
    expect(normalizeTranscriptionUsage({ type: "tokens", input_tokens: 90, output_tokens: 5 })).toMatchObject({
      inputTokens: 0,
      audioInputTokens: 90,
      outputTokens: 5,
    });
  });

  it("maps duration usage", () => {
    expect(normalizeTranscriptionUsage({ type: "duration", seconds: 3.4 })).toMatchObject({
      audioSeconds: 3.4,
      inputTokens: 0,
    });
    expect(normalizeTranscriptionUsage({ type: "duration", seconds: 0 })).toBeNull();
    expect(normalizeTranscriptionUsage({ type: "duration" })).toBeNull();
    expect(normalizeTranscriptionUsage(undefined)).toBeNull();
  });
});

describe("usagePayloadFromEvent", () => {
  it("uses response.id and item_id as external ids", () => {
    const done: RealtimeServerEvent = {
      type: "response.done",
      responseId: "resp_1",
      status: "cancelled",
      statusReason: "turn_detected",
      usage: RESPONSE_USAGE,
      functionCalls: [],
    };
    expect(usagePayloadFromEvent(done)).toMatchObject({ kind: "response", externalEventId: "resp_1" });
    expect(usagePayloadFromEvent({ ...done, responseId: null })).toBeNull();
    expect(usagePayloadFromEvent({ ...done, usage: null })).toBeNull();

    const transcribed: RealtimeServerEvent = {
      type: "conversation.item.input_audio_transcription.completed",
      itemId: "item_1",
      contentIndex: 0,
      transcript: "Hi",
      usage: { type: "duration", seconds: 1 },
    };
    expect(usagePayloadFromEvent(transcribed)).toMatchObject({ kind: "transcription", externalEventId: "item_1" });
    expect(usagePayloadFromEvent({ ...transcribed, usage: null })).toBeNull();
    expect(usagePayloadFromEvent({ type: "session.created" })).toBeNull();
  });
});

describe("usage retry queue", () => {
  const response: RealtimeUsagePayload = {
    kind: "response",
    externalEventId: "r1",
    usage: normalizeResponseUsage(RESPONSE_USAGE)!,
  };
  const transcription: RealtimeUsagePayload = {
    kind: "transcription",
    externalEventId: "i1",
    usage: normalizeTranscriptionUsage({ type: "duration", seconds: 1 })!,
  };

  it("counts each event once and dedupes by externalEventId", () => {
    let state = enqueueUsage(EMPTY_USAGE_STATE, response, 0);
    state = enqueueUsage(state, response, 5);
    state = enqueueUsage(state, transcription, 5);
    expect(state).toMatchObject({ responsesSeen: 1, transcriptionsSeen: 1 });
    expect(state.queue).toHaveLength(2);
  });

  it("takes due payloads once and removes them when sent", () => {
    let state = enqueueUsage(EMPTY_USAGE_STATE, response, 0);
    const taken = takeDueUsage(state, 0);
    expect(taken.due).toEqual([response]);
    expect(takeDueUsage(taken.state, 0).due).toEqual([]);
    expect(takeDueUsage(taken.state, 0).state).toBe(taken.state);
    expect(nextUsageAttemptAt(taken.state)).toBeNull();
    state = markUsageSent(taken.state, usageKey(response));
    expect(state.queue).toHaveLength(0);
    expect(state.responsesSeen).toBe(1);
  });

  it("backs off on failure and drops after the max attempts", () => {
    let state = enqueueUsage(EMPTY_USAGE_STATE, response, 0);
    state = enqueueUsage(state, transcription, 0);
    const key = usageKey(response);
    let now = 0;
    for (let attempt = 1; attempt < USAGE_MAX_ATTEMPTS; attempt += 1) {
      const taken = takeDueUsage(state, now);
      expect(taken.due.map(usageKey)).toContain(key);
      state = markUsageFailed(taken.state, key, now);
      // the transcription stays queued, in flight
      expect(state.queue).toHaveLength(2);
      expect(takeDueUsage(state, now).due.map(usageKey)).not.toContain(key);
      now += usageRetryDelayMs(attempt);
      expect(nextUsageAttemptAt(state)).toBe(now);
    }
    state = markUsageFailed(takeDueUsage(state, now).state, key, now);
    expect(state.dropped).toBe(1);
    expect(state.queue.map((e) => usageKey(e.payload))).toEqual([usageKey(transcription)]);
  });

  it("caps the backoff", () => {
    expect(usageRetryDelayMs(0)).toBe(1000);
    expect(usageRetryDelayMs(1)).toBe(1000);
    expect(usageRetryDelayMs(2)).toBe(2000);
    expect(usageRetryDelayMs(20)).toBe(USAGE_RETRY_MAX_MS);
  });

  it("finds the earliest waiting payload", () => {
    let state = enqueueUsage(EMPTY_USAGE_STATE, response, 50);
    state = enqueueUsage(state, transcription, 10);
    expect(nextUsageAttemptAt(state)).toBe(10);
    expect(nextUsageAttemptAt(EMPTY_USAGE_STATE)).toBeNull();
  });
});
