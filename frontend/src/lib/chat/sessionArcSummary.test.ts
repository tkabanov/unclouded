import { describe, expect, it } from "vitest";
import {
  buildArcSummaryUserPrompt,
  buildCompressedSessionMemorySectionLines,
  getSessionsEligibleForArc,
  needsSessionArcRegeneration,
  readSessionArcSummary,
  sessionArcSourceKey,
  SESSION_ARC_SOURCE_KEY,
  SESSION_ARC_SUMMARY_KEY,
} from "../../../../supabase/functions/chat/sessionMemory/sessionArcSummary.ts";
import type { SessionMemoryRecord } from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";

function record(id: string, topic: string): SessionMemoryRecord {
  return {
    conversationId: id,
    closedAt: "2026-07-01T12:00:00.000Z",
    topic,
    summaryStub: `Summary for ${topic}`,
    microCommitment: null,
    microCommitmentDue: null,
    keyPatternOrInsight: `Insight for ${topic}`,
    emotionalStart: null,
    emotionalEnd: null,
    resistancePoints: null,
    coachingModeUsed: "stabilizer",
    effectivenessSignal: null,
  };
}

describe("sessionArcSummary", () => {
  it("selects all sessions except the most recent for arc compression", () => {
    const records = [record("c1", "sleep"), record("c2", "boundaries"), record("c3", "energy")];
    expect(getSessionsEligibleForArc(records).map((entry) => entry.conversationId)).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("detects when arc summary must be regenerated", () => {
    const records = [record("c1", "sleep"), record("c2", "boundaries")];
    expect(
      needsSessionArcRegeneration(
        {
          [SESSION_ARC_SUMMARY_KEY]: "Older themes compressed.",
          [SESSION_ARC_SOURCE_KEY]: "c1",
        },
        records,
      ),
    ).toBe(false);

    expect(
      needsSessionArcRegeneration(
        {
          [SESSION_ARC_SUMMARY_KEY]: "Older themes compressed.",
          [SESSION_ARC_SOURCE_KEY]: "stale-id",
        },
        records,
      ),
    ).toBe(true);
  });

  it("builds OpenAI input from older session records", () => {
    const prompt = buildArcSummaryUserPrompt([record("c1", "sleep"), record("c2", "boundaries")]);
    expect(prompt).toContain("--- Session 1 ---");
    expect(prompt).toContain("topic=sleep");
    expect(prompt).toContain("topic=boundaries");
  });

  it("renders compressed memory with arc plus most recent session only", () => {
    const lines = buildCompressedSessionMemorySectionLines(
      "Major themes include sleep and boundaries; open commitment remains active.",
      record("c3", "energy"),
    );

    expect(lines[0]).toContain("Session arc summary");
    expect(lines[1]).toContain("Most recent session");
    expect(lines.join("\n")).toContain("Theme — energy");
    expect(lines.join("\n")).not.toContain("Theme — sleep");
  });

  it("stores and reads arc summary from onboarding data", () => {
    expect(
      readSessionArcSummary({
        [SESSION_ARC_SUMMARY_KEY]: "  Compressed arc summary.  ",
      }),
    ).toBe("Compressed arc summary.");
  });

  it("uses conversation ids as arc source key", () => {
    expect(sessionArcSourceKey([record("c1", "a"), record("c2", "b")])).toBe("c1");
  });
});
