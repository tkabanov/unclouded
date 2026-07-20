import { describe, expect, it, vi } from "vitest";
import { persistSessionMemory } from "../../../../supabase/functions/chat/persistSessionMemory.ts";

describe("persistSessionMemory", () => {
  it("merges session memory into the authenticated user's onboardingData", async () => {
    const userId = "11111111-1111-1111-1111-111111111111";
    const existingOnboarding = {
      chat_session_memory: [
        {
          conversationId: "c-old",
          closedAt: "2026-07-01",
          topic: "stress",
          summaryStub: "Older session summary.",
        },
      ],
    };

    const update = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
    const maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: { onboardingData: existingOnboarding },
        error: null,
      }),
    );
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return { select, update, eq };
      }
      return { select, update, eq };
    });

    const supabase = { from } as never;

    await persistSessionMemory(
      supabase,
      userId,
      "conv-new",
      {
        lastSessionTopic: "delegation",
        summaryStub: "User resisted asking for help.",
        microCommitmentText: "Ask one colleague for help this week",
        emotionalStart: "tense",
        emotionalEnd: "hopeful",
        keyPatternOrInsight: "over-functioning",
        resistancePoints: "topic switching",
        effectivenessSignal: "guarded",
        unresolvedThread: "whether to delegate the project timeline",
      },
      "stabilizer",
    );

    expect(from).toHaveBeenCalledWith("profiles");
    expect(eq).toHaveBeenCalledWith("id", userId);
    expect(update).toHaveBeenCalledOnce();
    const updateArg = update.mock.calls[0]?.[0] as {
      onboardingData: Record<string, unknown>;
    };
    const records = updateArg.onboardingData.chat_session_memory as Array<Record<string, unknown>>;
    expect(records).toHaveLength(2);
    expect(records[1]?.topic).toBe("delegation");
    expect(records[1]?.coachingModeUsed).toBe("stabilizer");
    expect(records[1]?.unresolvedThread).toBe("whether to delegate the project timeline");
    expect(updateArg.onboardingData.last_session_topic_text).toBe("delegation");
  });
});
