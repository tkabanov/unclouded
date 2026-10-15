import { describe, expect, it } from "vitest";
import type { RealtimeServerEvent } from "./realtimeEvents";
import { EMPTY_TRANSCRIPT, applyTranscriptEvent, getTranscriptItems } from "./transcriptAssembler";

function run(events: RealtimeServerEvent[]) {
  return events.reduce(applyTranscriptEvent, EMPTY_TRANSCRIPT);
}

const added = (itemId: string, previousItemId: string | null, role: "user" | "assistant" | "system" | null = "user", itemType = "message"): RealtimeServerEvent => ({
  type: "conversation.item.added",
  itemId,
  previousItemId,
  itemType,
  role,
});

const userDone = (itemId: string, transcript: string): RealtimeServerEvent => ({
  type: "conversation.item.input_audio_transcription.completed",
  itemId,
  contentIndex: 0,
  transcript,
  usage: null,
});

const kotaDelta = (itemId: string, delta: string, responseId = "r1"): RealtimeServerEvent => ({
  type: "response.output_audio_transcript.delta",
  responseId,
  itemId,
  contentIndex: 0,
  delta,
});

const kotaDone = (itemId: string, transcript: string, responseId = "r1"): RealtimeServerEvent => ({
  type: "response.output_audio_transcript.done",
  responseId,
  itemId,
  contentIndex: 0,
  transcript,
});

const responseDone = (responseId: string, status = "completed", statusReason: string | null = null): RealtimeServerEvent => ({
  type: "response.done",
  responseId,
  status,
  statusReason,
  usage: null,
  functionCalls: [],
});

describe("transcriptAssembler", () => {
  it("assembles a user turn and a Kota reply in order", () => {
    const state = run([
      added("u1", null),
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 0, delta: "I feel " },
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 0, delta: "tired" },
      added("a1", "u1", "assistant"),
      kotaDelta("a1", "That "),
      kotaDelta("a1", "sounds hard."),
    ]);
    expect(getTranscriptItems(state)).toEqual([
      { itemId: "u1", role: "user", text: "I feel tired", final: false, failed: false, interrupted: false },
      { itemId: "a1", role: "assistant", text: "That sounds hard.", final: false, failed: false, interrupted: false },
    ]);

    const finished = [userDone("u1", "I feel tired."), kotaDone("a1", "That sounds hard.")].reduce(
      applyTranscriptEvent,
      state,
    );
    expect(getTranscriptItems(finished).map((i) => [i.text, i.final])).toEqual([
      ["I feel tired.", true],
      ["That sounds hard.", true],
    ]);
  });

  it("orders by previous_item_id, not arrival (out-of-order completion)", () => {
    // Kota's item is reported before the user item it follows.
    const state = run([
      added("a1", "u1", "assistant"),
      kotaDone("a1", "Reply"),
      added("u1", null),
      userDone("u1", "Question"),
      added("u2", "a1"),
      userDone("u2", "Follow-up"),
    ]);
    expect(getTranscriptItems(state).map((i) => i.itemId)).toEqual(["u1", "a1", "u2"]);
  });

  it("dedupes added/created/done and keeps the first predecessor", () => {
    const state = run([
      added("u1", null),
      { type: "conversation.item.created", itemId: "u1", previousItemId: "zzz", itemType: "message", role: "user" },
      { type: "conversation.item.done", itemId: "u1", previousItemId: null, itemType: "message", role: "user" },
    ]);
    expect(state.arrival).toEqual(["u1"]);
    expect(state.items.u1.previousItemId).toBeNull();
  });

  it("creates items from deltas that arrive before the item event", () => {
    const state = run([
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 0, delta: "Hi" },
      kotaDelta("a1", "Hello"),
      added("u1", null),
      added("a1", "u1", "assistant"),
    ]);
    expect(getTranscriptItems(state).map((i) => [i.itemId, i.role, i.text])).toEqual([
      ["u1", "user", "Hi"],
      ["a1", "assistant", "Hello"],
    ]);
  });

  it("uses input_audio_buffer.committed for user order", () => {
    const state = run([
      { type: "input_audio_buffer.committed", itemId: "u1", previousItemId: null },
      { type: "input_audio_buffer.committed", itemId: null, previousItemId: null },
      added("u1", "ignored"),
    ]);
    expect(state.items.u1).toMatchObject({ role: "user", previousItemId: null });
  });

  it("joins content parts in index order", () => {
    const state = run([
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 1, delta: " world" },
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 0, delta: "Hello" },
    ]);
    expect(getTranscriptItems(state)[0].text).toBe("Hello world");
  });

  it("marks failed user transcription and ignores late deltas after final", () => {
    const state = run([
      added("u1", null),
      { type: "conversation.item.input_audio_transcription.failed", itemId: "u1", contentIndex: 0, errorCode: null },
      { type: "conversation.item.input_audio_transcription.delta", itemId: "u1", contentIndex: 0, delta: "late" },
      { type: "conversation.item.input_audio_transcription.failed", itemId: "u1", contentIndex: 0, errorCode: null },
    ]);
    expect(getTranscriptItems(state)[0]).toMatchObject({ final: true, failed: true, text: "" });

    // A completed transcript after a failure still wins.
    const recovered = applyTranscriptEvent(state, userDone("u1", "Okay"));
    expect(getTranscriptItems(recovered)[0]).toMatchObject({ final: true, failed: false, text: "Okay" });
  });

  it("ignores Kota deltas and done after the item is final", () => {
    const state = run([added("a1", null, "assistant"), kotaDone("a1", "Full"), kotaDelta("a1", "x"), kotaDone("a1", "Other")]);
    expect(getTranscriptItems(state)[0].text).toBe("Full");
  });

  it("marks Kota interrupted on output_audio_buffer.cleared and finalizes on response.done", () => {
    let state = run([added("u1", null), userDone("u1", "Q"), added("a1", "u1", "assistant"), kotaDelta("a1", "Let me")]);
    state = applyTranscriptEvent(state, { type: "output_audio_buffer.cleared", responseId: "r1" });
    expect(getTranscriptItems(state)[1]).toMatchObject({ interrupted: true, final: false });
    state = applyTranscriptEvent(state, responseDone("r1", "cancelled", "turn_detected"));
    expect(getTranscriptItems(state)[1]).toMatchObject({ text: "Let me", interrupted: true, final: true });
  });

  it("marks interrupted from response.done cancelled with turn_detected", () => {
    const state = run([added("a1", null, "assistant"), kotaDelta("a1", "Partial"), responseDone("r1", "cancelled", "turn_detected")]);
    expect(getTranscriptItems(state)[0]).toMatchObject({ interrupted: true, final: true });
  });

  it("finalizes a Kota item on response.done without interrupt flag when completed", () => {
    const state = run([added("a1", null, "assistant"), kotaDelta("a1", "Hi"), responseDone("r1")]);
    expect(getTranscriptItems(state)[0]).toMatchObject({ interrupted: false, final: true, text: "Hi" });
  });

  it("only touches the matching response", () => {
    let state = run([added("a1", null, "assistant"), kotaDelta("a1", "One", "r1"), added("a2", "a1", "assistant"), kotaDelta("a2", "Two", "r2")]);
    state = applyTranscriptEvent(state, { type: "output_audio_buffer.cleared", responseId: "r2" });
    state = applyTranscriptEvent(state, responseDone("r2", "cancelled", "turn_detected"));
    const items = getTranscriptItems(state);
    expect(items[0]).toMatchObject({ interrupted: false, final: false });
    expect(items[1]).toMatchObject({ interrupted: true, final: true });

    // cleared without response id marks every unfinished Kota item.
    state = applyTranscriptEvent(state, { type: "output_audio_buffer.cleared", responseId: null });
    expect(getTranscriptItems(state)[0].interrupted).toBe(true);
  });

  it("ignores response.done without id", () => {
    const state = run([added("a1", null, "assistant"), kotaDelta("a1", "Hi")]);
    const noId: RealtimeServerEvent = {
      type: "response.done",
      responseId: null,
      status: "completed",
      statusReason: null,
      usage: null,
      functionCalls: [],
    };
    expect(applyTranscriptEvent(state, noId)).toBe(state);
  });

  it("hides function calls and system items but keeps them for ordering", () => {
    const state = run([
      added("u1", null),
      userDone("u1", "Q"),
      added("f1", "u1", null, "function_call"),
      added("s1", "f1", "system"),
      added("a1", "f1", "assistant"),
      kotaDone("a1", "A"),
    ]);
    expect(getTranscriptItems(state).map((i) => i.itemId)).toEqual(["u1", "a1"]);
    expect(state.items.s1).toBeUndefined();
  });

  it("does not lose items in a malformed predecessor cycle", () => {
    const state = run([added("x", "y"), added("y", "x"), added("z", "z")]);
    expect(getTranscriptItems(state).map((i) => i.itemId).sort()).toEqual(["x", "y", "z"]);
  });

  it("ignores unrelated events", () => {
    expect(applyTranscriptEvent(EMPTY_TRANSCRIPT, { type: "session.created" })).toBe(EMPTY_TRANSCRIPT);
  });
});
