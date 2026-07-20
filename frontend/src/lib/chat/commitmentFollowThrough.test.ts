import { describe, expect, it } from "vitest";
import {
  normalizeCheckInCommitmentStatus,
  resolveActiveCommitmentStatus,
  resolveSessionMemoryCommitmentStatus,
} from "../../../../supabase/functions/chat/sessionMemory/commitmentFollowThrough.ts";
import type { SessionMemoryRecord } from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";

function memoryRecord(
  overrides: Partial<SessionMemoryRecord> & Pick<SessionMemoryRecord, "closedAt">,
): SessionMemoryRecord {
  return {
    conversationId: overrides.conversationId ?? "conv-1",
    closedAt: overrides.closedAt,
    topic: overrides.topic ?? "topic",
    summaryStub: overrides.summaryStub ?? "summary",
    microCommitment: overrides.microCommitment ?? null,
    microCommitmentDue: overrides.microCommitmentDue ?? null,
    commitmentStatus: overrides.commitmentStatus ?? null,
  };
}

describe("commitmentFollowThrough", () => {
  it("maps check-in answers to completed or missed", () => {
    expect(normalizeCheckInCommitmentStatus("yes")).toBe("completed");
    expect(normalizeCheckInCommitmentStatus("Partially")).toBe("completed");
    expect(normalizeCheckInCommitmentStatus("no")).toBe("missed");
    expect(normalizeCheckInCommitmentStatus("I forgot")).toBe("missed");
  });

  it("defaults new session memory commitments to open", () => {
    const record = memoryRecord({
      closedAt: "2026-07-01T10:00:00.000Z",
      microCommitment: "Walk after lunch",
      commitmentStatus: "open",
    });

    expect(
      resolveSessionMemoryCommitmentStatus(record, {
        allRecords: [record],
        checkIns: [],
        activeMicroCommitment: "Walk after lunch",
      }),
    ).toBe("open");
  });

  it("marks active commitment missed when latest check-in says no", () => {
    const record = memoryRecord({
      closedAt: "2026-07-01T10:00:00.000Z",
      microCommitment: "Walk after lunch",
      commitmentStatus: "open",
    });

    expect(
      resolveActiveCommitmentStatus({
        records: [record],
        checkIns: [],
        activeMicroCommitment: "Walk after lunch",
        latestCheckInStatus: "no",
      }),
    ).toBe("missed");
  });

  it("marks commitment completed from follow-up daily check-in", () => {
    const record = memoryRecord({
      closedAt: "2026-07-01T10:00:00.000Z",
      microCommitment: "Walk after lunch",
      commitmentStatus: "open",
    });

    expect(
      resolveSessionMemoryCommitmentStatus(record, {
        allRecords: [record],
        checkIns: [
          { date: "2026-07-03", microCommitmentStatus: "yes" },
        ],
        activeMicroCommitment: null,
      }),
    ).toBe("completed");
  });

  it("marks superseded commitment missed when a later session closes without follow-up", () => {
    const first = memoryRecord({
      conversationId: "conv-1",
      closedAt: "2026-07-01T10:00:00.000Z",
      microCommitment: "Walk after lunch",
      commitmentStatus: "open",
    });
    const second = memoryRecord({
      conversationId: "conv-2",
      closedAt: "2026-07-08T10:00:00.000Z",
      microCommitment: "Leave work by 6pm",
      commitmentStatus: "open",
    });

    expect(
      resolveSessionMemoryCommitmentStatus(first, {
        allRecords: [first, second],
        checkIns: [],
        activeMicroCommitment: "Leave work by 6pm",
      }),
    ).toBe("missed");
  });
});
