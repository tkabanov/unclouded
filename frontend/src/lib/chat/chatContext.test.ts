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
  it("shows tier gate for item 2 on Free tier while keeping Layer 10 assembled", () => {
    const block = buildChatContextBlock(
      baseProfile({
        tier: "free",
        subscribed: false,
      }),
    );

    expect(block).toContain("1. CURRENT SESSION OPEN DATA");
    expect(block).toContain("2. MOST RECENT SESSION MEMORY (last 5 sessions)");
    expect(block).toContain("Not available on Free tier");
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

  it("does not inject yesterday's check-in into current session open data", () => {
    const block = buildChatContextBlock(
      baseProfile({
        liveContext: {
          latestCheckIn: {
            date: "2020-01-01T09:00:00.000Z",
            pulse: 3,
            feeling: "drained",
          },
        },
      }),
    );

    expect(block).toContain("Check-in pulse score: not submitted today");
    expect(block).toContain("Feeling word: not submitted today");
    expect(block).not.toContain("Feeling word (if submitted): drained");
  });

  it("includes today's feeling word without reflection prose", () => {
    const block = buildChatContextBlock(
      baseProfile({
        liveContext: {
          latestCheckIn: {
            date: new Date().toISOString(),
            pulse: 6,
            feeling: "steady",
          },
        },
      }),
    );

    expect(block).toContain("Feeling word (if submitted): steady");
    expect(block).toContain("Check-in pulse score (if submitted today): 6/10");
  });
});

describe("buildChatContextBlock — Layer 10 session type flag (REQ-02)", () => {
  it("activates Block 3.36 Voice Adaptation for voice sessions", () => {
    const block = buildChatContextBlock(
      baseProfile({
        liveContext: { sessionType: "voice" },
      }),
    );

    expect(block).toContain("10. SESSION TYPE FLAG");
    expect(block).toContain("session_type: voice");
    expect(block).toContain("Voice Session Adaptation Protocol");
    expect(block).toContain("Block 3.36");
  });

  it("uses quick_checkin mode line without Block 3.36", () => {
    const block = buildChatContextBlock(
      baseProfile({
        liveContext: { sessionType: "quick_checkin" },
      }),
    );

    expect(block).toContain("session_type: quick_checkin");
    expect(block).toContain("Quick check-in mode");
    expect(block).not.toContain("Voice Session Adaptation Protocol");
  });

  it("defaults session type to text", () => {
    const block = buildChatContextBlock(baseProfile());

    expect(block).toContain("session_type: text");
    expect(block).not.toContain("Voice Session Adaptation Protocol");
  });

  it("forbids coaching recap when prior crisis flag is set (REQ-03)", () => {
    const block = buildChatContextBlock(
      baseProfile({
        liveContext: { hasPriorCrisisSession: true },
      }),
    );

    expect(block).toContain("8. PREVIOUS SESSION TYPE FLAG");
    expect(block).toContain("Level 2+ crisis event? yes.");
    expect(block).toContain("Do NOT open with prior coaching topic recap");
  });
});
