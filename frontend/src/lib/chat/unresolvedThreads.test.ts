import { describe, expect, it } from "vitest";
import {
  buildUnresolvedThreadsSectionLines,
  collectSessionUnresolvedThreadLines,
  formatUnresolvedThreadLine,
} from "../../../../supabase/functions/chat/sessionMemory/unresolvedThreads.ts";
import type { SessionMemoryRecord } from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";

function memoryRecord(
  overrides: Partial<SessionMemoryRecord> & Pick<SessionMemoryRecord, "closedAt">,
): SessionMemoryRecord {
  return {
    conversationId: "conv-1",
    closedAt: overrides.closedAt,
    topic: overrides.topic ?? "topic",
    summaryStub: overrides.summaryStub ?? "summary",
    unresolvedThread: overrides.unresolvedThread ?? null,
  };
}

describe("unresolvedThreads", () => {
  it("formats session-flagged threads with date per Layer 10 spec", () => {
    const lines = collectSessionUnresolvedThreadLines([
      memoryRecord({
        closedAt: "2026-07-10T18:30:00.000Z",
        unresolvedThread: "whether to leave the team",
      }),
    ]);

    expect(lines).toEqual([
      formatUnresolvedThreadLine("2026-07-10", "whether to leave the team"),
    ]);
  });

  it("prefers the most recent flagged session threads first", () => {
    const lines = collectSessionUnresolvedThreadLines([
      memoryRecord({
        closedAt: "2026-07-01T10:00:00.000Z",
        unresolvedThread: "older thread",
      }),
      memoryRecord({
        closedAt: "2026-07-12T10:00:00.000Z",
        unresolvedThread: "newer thread",
      }),
    ]);

    expect(lines[0]).toContain("2026-07-12");
    expect(lines[0]).toContain("newer thread");
  });

  it("merges reassessment Q2 using assessment date when present", () => {
    const lines = buildUnresolvedThreadsSectionLines({
      sessionRecords: [],
      latestReassessment: {
        reflectionQ2: "still figuring out boundaries with my manager",
        assessmentDate: "2026-06-15T00:00:00.000Z",
      },
    });

    expect(lines).toEqual([
      "Unresolved from 2026-06-15: still figuring out boundaries with my manager.",
    ]);
  });

  it("includes both session-flagged and reassessment threads", () => {
    const lines = buildUnresolvedThreadsSectionLines({
      sessionRecords: [
        memoryRecord({
          closedAt: "2026-07-08T12:00:00.000Z",
          unresolvedThread: "the conversation with my partner we never finished",
        }),
      ],
      latestReassessment: {
        reflectionQ2: "what success would actually feel like",
        assessmentDate: "2026-06-01T00:00:00.000Z",
      },
    });

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("2026-07-08");
    expect(lines[0]).toContain("partner");
    expect(lines[1]).toContain("2026-06-01");
    expect(lines[1]).toContain("success");
  });

  it("returns None flagged when no threads are present", () => {
    expect(
      buildUnresolvedThreadsSectionLines({
        sessionRecords: [],
        latestReassessment: null,
      }),
    ).toEqual(["None flagged."]);
  });
});
