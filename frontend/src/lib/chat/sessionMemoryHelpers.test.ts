import { describe, expect, it } from "vitest";
import {
  buildSessionMemoryOnboardingPatch,
  buildSessionMemoryPromptBlock,
  buildSessionMemoryRecord,
  formatReturningMemoryHint,
  readSessionMemoryRecords,
  truncateToMaxWords,
} from "../../../../supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts";
import type { SessionFinalizePayload } from "../../../../supabase/functions/chat/prompt/sessionLifecycle.ts";

function baseFinalize(overrides: Partial<SessionFinalizePayload> = {}): SessionFinalizePayload {
  return {
    lastSessionTopic: "boundaries",
    summaryStub: "User named exhaustion and resistance to asking for help.",
    microCommitmentText: "Ask one colleague for help this week",
    emotionalStart: "overwhelmed",
    emotionalEnd: "slightly steadier",
    keyPatternOrInsight: "over-functioning at work",
    resistancePoints: "deflected with humor when help was suggested",
    effectivenessSignal: "open but fatigued",
    ...overrides,
  };
}

describe("sessionMemoryHelpers", () => {
  it("truncates summaries to the 200-word cap", () => {
    const words = Array.from({ length: 250 }, (_, index) => `word${index}`).join(" ");
    const truncated = truncateToMaxWords(words, 200);
    expect(truncated.split(/\s+/)).toHaveLength(200);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("builds a full memory record with coaching mode from server truth", () => {
    const record = buildSessionMemoryRecord("conv-1", baseFinalize(), "stabilizer");
    expect(record.topic).toBe("boundaries");
    expect(record.coachingModeUsed).toBe("stabilizer");
    expect(record.emotionalStart).toBe("overwhelmed");
    expect(record.resistancePoints).toContain("humor");
    expect(record.microCommitmentDue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps only the last 5 session records in onboarding patch", () => {
    const onboarding = {
      chat_session_memory: Array.from({ length: 5 }, (_, index) => ({
        conversationId: `c${index}`,
        closedAt: "2026-07-01",
        topic: `topic-${index}`,
        summaryStub: `summary-${index}`,
      })),
    };

    const patch = buildSessionMemoryOnboardingPatch(
      onboarding,
      "conv-new",
      baseFinalize({ lastSessionTopic: "sleep" }),
      "strategist",
    );

    const records = readSessionMemoryRecords({
      ...onboarding,
      ...patch,
    });
    expect(records).toHaveLength(5);
    expect(records[4]?.topic).toBe("sleep");
    expect(records[4]?.coachingModeUsed).toBe("strategist");
    expect(patch.last_session_topic_text).toBe("sleep");
  });

  it("renders honest not recorded fields in the prompt block", () => {
    const prompt = buildSessionMemoryPromptBlock({
      chat_session_memory: [
        {
          conversationId: "c1",
          closedAt: "2026-07-01",
          topic: "sleep",
          summaryStub: "Named poor sleep patterns.",
        },
      ],
    });

    expect(prompt).toContain("SESSION MEMORY (Phase 2 — server-loaded");
    expect(prompt).toContain("topic=sleep");
    expect(prompt).toContain("emotional-start=not recorded");
    expect(prompt).toContain("resistance=not recorded");
  });

  it("builds returning opener memory hint from the latest record", () => {
    const hint = formatReturningMemoryHint({
      chat_session_memory: [
        {
          conversationId: "c1",
          closedAt: "2026-07-01",
          topic: "sleep",
          summaryStub: "Named poor sleep patterns.",
          keyPatternOrInsight: "evening scrolling loop",
          microCommitment: "No screens after 10pm",
        },
      ],
    });

    expect(hint).toContain("evening scrolling loop");
    expect(hint).toContain("No screens after 10pm");
  });
});
