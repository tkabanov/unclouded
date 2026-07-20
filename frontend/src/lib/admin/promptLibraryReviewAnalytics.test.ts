import { describe, expect, it } from "vitest";
import {
  aggregatePromptLibraryReviewSignals,
  type PromptReviewProfileRow,
} from "./promptLibraryReviewAnalytics";

const NOW = new Date("2026-07-20T12:00:00.000Z");

function profile(
  classification: string,
  onboardingData: Record<string, unknown>,
): PromptReviewProfileRow {
  return { classification, onboardingData, createdAt: "2026-01-01T00:00:00.000Z" };
}

describe("aggregatePromptLibraryReviewSignals", () => {
  it("ranks classifications by continued engagement from session memory", () => {
    const signals = aggregatePromptLibraryReviewSignals(
      [
        profile("Building Momentum", {
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-07-18T10:00:00.000Z",
              topic: "Small wins",
              summaryStub: "Named momentum blockers.",
              exchangeCount: 7,
            },
            {
              conversationId: "c2",
              closedAt: "2026-07-10T10:00:00.000Z",
              topic: "Follow-through",
              summaryStub: "Second session.",
              exchangeCount: 9,
            },
          ],
        }),
        profile("Capacity Erosion", {
          chat_session_memory: [
            {
              conversationId: "c3",
              closedAt: "2026-05-01T10:00:00.000Z",
              topic: "Burnout",
              summaryStub: "Only one old session.",
              exchangeCount: 4,
            },
          ],
        }),
      ],
      NOW,
    );

    expect(signals.profilesAnalyzed).toBe(2);
    expect(signals.sessionsInMemory).toBe(3);
    expect(signals.classificationEngagement[0]?.classification).toBe("Building Momentum");
    expect(signals.classificationEngagement[0]?.continuedEngagementRate).toBe(1);
    expect(signals.classificationEngagement[1]?.continuedEngagementRate).toBe(0);
  });

  it("builds exchange-count buckets and peak bucket from stored exchangeCount", () => {
    const signals = aggregatePromptLibraryReviewSignals(
      [
        profile("Building Momentum", {
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-07-18T10:00:00.000Z",
              topic: "Closing synthesis",
              summaryStub: "Wrapped session.",
              exchangeCount: 14,
            },
            {
              conversationId: "c2",
              closedAt: "2026-07-10T10:00:00.000Z",
              topic: "Depth work",
              summaryStub: "Middle session.",
              exchangeCount: 8,
            },
          ],
        }),
      ],
      NOW,
    );

    expect(signals.averageExchangeCount).toBe(11);
    expect(signals.peakExchangeBucket).toBe("6–12 (depth)");
    expect(
      signals.exchangeCountDistribution.find((row) => row.label.includes("13+"))?.sessionCount,
    ).toBe(1);
  });

  it("computes commitment follow-through from effectiveness signals and check-ins", () => {
    const signals = aggregatePromptLibraryReviewSignals(
      [
        profile("Building Momentum", {
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-07-18T10:00:00.000Z",
              topic: "Commitment",
              summaryStub: "Set a walk commitment.",
              microCommitment: "Walk 10 minutes after lunch",
              effectivenessSignal: "kept it twice",
              exchangeCount: 6,
            },
            {
              conversationId: "c2",
              closedAt: "2026-07-10T10:00:00.000Z",
              topic: "Writing",
              summaryStub: "Journal commitment.",
              microCommitment: "Write one paragraph tonight",
              effectivenessSignal: "guarded",
              exchangeCount: 5,
            },
          ],
          daily_checkins: [{ microCommitmentStatus: "yes", date: "2026-07-19" }],
        }),
      ],
      NOW,
    );

    expect(signals.commitmentFollowThroughRate).toBe(0.5);
    expect(
      signals.commitmentByCategory.find((row) => row.category === "movement")?.followed,
    ).toBe(1);
  });

  it("surfaces high load combinations with elevated disengagement", () => {
    const signals = aggregatePromptLibraryReviewSignals(
      [
        profile("Capacity Erosion", {
          loadSignals: {
            cognitive_load_signal: "head_rarely_feels_quiet___constant",
            relational_load_signal: "significant_conflict_or_strain_in_key_relationships",
          },
          chat_session_memory: [],
        }),
        profile("Capacity Erosion", {
          loadSignals: {
            cognitive_load_signal: "head_rarely_feels_quiet___constant",
            relational_load_signal: "significant_conflict_or_strain_in_key_relationships",
          },
          chat_session_memory: [
            {
              conversationId: "c1",
              closedAt: "2026-06-01T10:00:00.000Z",
              topic: "Old session",
              summaryStub: "Stale.",
              exchangeCount: 3,
            },
          ],
        }),
        profile("Capacity Erosion", {
          loadSignals: {
            cognitive_load_signal: "head_rarely_feels_quiet___constant",
            relational_load_signal: "significant_conflict_or_strain_in_key_relationships",
          },
          chat_session_memory: [],
        }),
        profile("Building Momentum", {
          loadSignals: {
            cognitive_load_signal: "some_noise_but_manageable",
          },
          chat_session_memory: [
            {
              conversationId: "c2",
              closedAt: "2026-07-18T10:00:00.000Z",
              topic: "Recent session",
              summaryStub: "Active user.",
              exchangeCount: 6,
            },
          ],
        }),
        profile("Building Momentum", {
          loadSignals: {
            cognitive_load_signal: "some_noise_but_manageable",
          },
          chat_session_memory: [
            {
              conversationId: "c3",
              closedAt: "2026-07-17T10:00:00.000Z",
              topic: "Another recent session",
              summaryStub: "Still active.",
              exchangeCount: 5,
            },
          ],
        }),
        profile("Building Momentum", {
          loadSignals: {
            cognitive_load_signal: "some_noise_but_manageable",
          },
          chat_session_memory: [
            {
              conversationId: "c4",
              closedAt: "2026-07-16T10:00:00.000Z",
              topic: "Third active user",
              summaryStub: "Active cohort.",
              exchangeCount: 4,
            },
          ],
        }),
      ],
      NOW,
    );

    const highLoadRow = signals.loadSignalDisengagement.find((row) =>
      row.loadCombination.includes("cognitive"),
    );
    expect(highLoadRow?.disengagementRate).toBe(1);
  });
});
