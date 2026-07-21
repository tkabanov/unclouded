import { describe, expect, it } from "vitest";
import { buildArchiveInsertFromFinalize } from "../../../../supabase/functions/chat/sessionMemory/coachingSessionArchive.ts";

describe("coachingSessionArchive — sessionType (REQ-02)", () => {
  it("persists voice sessionType on archive insert payload", () => {
    const insert = buildArchiveInsertFromFinalize({
      userId: "user-1",
      conversationId: "conv-voice",
      sessionType: "voice",
      finalize: {
        lastSessionTopic: "boundaries",
        summaryStub: "Named work overload.",
        keyPatternOrInsight: "saying yes too often",
        unresolvedThread: null,
        microCommitment: "Decline one non-essential meeting.",
        microCommitmentDue: "2026-07-22",
      },
      coachingModeUsed: "stability",
      exchangeCount: 4,
    });

    expect(insert.sessionType).toBe("voice");
    expect(insert.conversationId).toBe("conv-voice");
    expect(insert.exchangeCount).toBe(4);
  });
});
