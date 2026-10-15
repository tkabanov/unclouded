import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSIST_TIMEOUT_MS,
  EMPTY_PERSIST_QUEUE,
  INAUDIBLE_PLACEHOLDER,
  ackPersisted,
  releaseInFlight,
  takePersistable,
} from "./persistQueue";
import type { TranscriptItem } from "./transcriptAssembler";

function item(itemId: string, role: "user" | "assistant", text: string, extra: Partial<TranscriptItem> = {}): TranscriptItem {
  return { itemId, role, text, final: true, failed: false, interrupted: false, ...extra };
}

describe("persistQueue", () => {
  it("sends final items in order", () => {
    const items = [item("u1", "user", "Hi"), item("a1", "assistant", "Hello", { interrupted: true })];
    const result = takePersistable(items, EMPTY_PERSIST_QUEUE, 0);
    expect(result.batch).toEqual([
      { itemId: "u1", role: "user", text: "Hi", interrupted: false },
      { itemId: "a1", role: "assistant", text: "Hello", interrupted: true },
    ]);
    expect(result.nextDeadlineMs).toBeNull();
    expect([...result.state.inFlight]).toEqual(["u1", "a1"]);
  });

  it("blocks Kota behind an unfinished user item until it times out as [inaudible]", () => {
    const items = [item("u1", "user", "par", { final: false }), item("a1", "assistant", "Reply")];
    const first = takePersistable(items, EMPTY_PERSIST_QUEUE, 1000);
    expect(first.batch).toEqual([]);
    expect(first.nextDeadlineMs).toBe(1000 + DEFAULT_PERSIST_TIMEOUT_MS);

    const early = takePersistable(items, first.state, 5000);
    expect(early.batch).toEqual([]);
    expect(early.nextDeadlineMs).toBe(1000 + DEFAULT_PERSIST_TIMEOUT_MS);

    const late = takePersistable(items, early.state, 1000 + DEFAULT_PERSIST_TIMEOUT_MS);
    expect(late.batch.map((i) => [i.itemId, i.text])).toEqual([
      ["u1", INAUDIBLE_PLACEHOLDER],
      ["a1", "Reply"],
    ]);
  });

  it("uses [inaudible] for failed or empty final user items", () => {
    const items = [
      item("u1", "user", "", { failed: true }),
      item("u2", "user", "   "),
    ];
    expect(takePersistable(items, EMPTY_PERSIST_QUEUE, 0).batch.map((i) => i.text)).toEqual([
      INAUDIBLE_PLACEHOLDER,
      INAUDIBLE_PLACEHOLDER,
    ]);
  });

  it("times out an unfinished Kota item with its partial text, interrupted", () => {
    const items = [item("a1", "assistant", "Half a", { final: false })];
    const first = takePersistable(items, EMPTY_PERSIST_QUEUE, 0, 100);
    expect(first.batch).toEqual([]);
    const late = takePersistable(items, first.state, 100, 100);
    expect(late.batch).toEqual([{ itemId: "a1", role: "assistant", text: "Half a", interrupted: true }]);
  });

  it("drops empty Kota items without blocking", () => {
    const items = [item("a1", "assistant", " "), item("a2", "assistant", "", { final: false }), item("u1", "user", "Next")];
    const first = takePersistable(items, EMPTY_PERSIST_QUEUE, 0, 10);
    expect(first.batch).toEqual([]);
    expect(first.state.done.has("a1")).toBe(true);
    const late = takePersistable(items, first.state, 10, 10);
    expect(late.batch.map((i) => i.itemId)).toEqual(["u1"]);
    expect(late.state.done.has("a2")).toBe(true);
  });

  it("dedupes: in-flight and acked items are not sent again, late transcripts are ignored", () => {
    const items = [item("u1", "user", "Hi")];
    const first = takePersistable(items, EMPTY_PERSIST_QUEUE, 0);
    expect(takePersistable(items, first.state, 1).batch).toEqual([]);
    const acked = ackPersisted(first.state, ["u1"]);
    expect(acked.inFlight.size).toBe(0);
    expect(takePersistable([item("u1", "user", "Hi, corrected")], acked, 2).batch).toEqual([]);
  });

  it("resends released items in order after a failed call", () => {
    const items = [item("u1", "user", "Hi"), item("a1", "assistant", "Hello")];
    const first = takePersistable(items, EMPTY_PERSIST_QUEUE, 0);
    const released = releaseInFlight(first.state, ["u1", "a1"]);
    expect(takePersistable(items, released, 1).batch.map((i) => i.itemId)).toEqual(["u1", "a1"]);
  });
});
