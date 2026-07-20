import { describe, expect, it } from "vitest";
import { buildChatContextBlock } from "../../../../supabase/functions/chat/prompt/chatContext.ts";
import type { ProfileData } from "../../../../supabase/functions/chat/prompt/types.ts";

function baseProfile(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    firstName: "Alex",
    tier: "pro",
    subscribed: true,
    onboardingData: {
      loadSignals: {},
      chat_session_memory: [
        {
          conversationId: "c1",
          closedAt: "2026-07-01",
          topic: "sleep",
          summaryStub: "Named poor sleep patterns.",
          keyPatternOrInsight: "evening scrolling loop",
          unresolvedThread: "whether to tell their manager",
        },
      ],
    },
    liveContext: {},
    ...overrides,
  };
}

describe("buildChatContextBlock — Layer 10 session memory tier gate", () => {
  it("shows Not available on Free tier for item 2 instead of last 5 sessions", () => {
    const block = buildChatContextBlock(
      baseProfile({
        tier: "free",
        subscribed: false,
      }),
    );

    expect(block).toContain("2. MOST RECENT SESSION MEMORY (last 5 sessions)");
    expect(block).toContain("Not available on Free tier.");
    expect(block).not.toContain("Theme — sleep");
    expect(block).not.toContain("evening scrolling loop");
  });

  it("includes last 5 session summaries on Pro tier", () => {
    const block = buildChatContextBlock(baseProfile());

    expect(block).toContain("Session 2026-07-01: Theme — sleep.");
    expect(block).toContain("Insight — evening scrolling loop");
    expect(block).not.toContain("Not available on Free tier.");
  });

  it("does not expose unresolved threads from session memory on Free tier", () => {
    const block = buildChatContextBlock(
      baseProfile({
        tier: "free",
        subscribed: false,
      }),
    );

    expect(block).toContain("4. UNRESOLVED THREADS");
    expect(block).toContain("None flagged.");
    expect(block).not.toContain("whether to tell their manager");
  });
});
