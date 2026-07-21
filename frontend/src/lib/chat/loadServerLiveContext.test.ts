import { describe, expect, it, vi } from "vitest";
import {
  aggregateLiveContext,
  readActiveMicroCommitmentFromOnboarding,
  readLatestCheckInFromOnboarding,
  readPathReflectionsFromOnboarding,
  readSessionCountFromOnboarding,
  readStreakFromOnboarding,
} from "../../../../supabase/functions/chat/liveContext/liveContextHelpers.ts";

function createQueryResult<T>(data: T, error: null | { message: string; code?: string } = null) {
  return Promise.resolve({ data, error, count: Array.isArray(data) ? data.length : null });
}

function createFallbackChain(error: { code: string; message: string }) {
  const result = () => createQueryResult(null, error);
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.maybeSingle = vi.fn(result);
  chain.then = (
    resolve: (value: Awaited<ReturnType<typeof createQueryResult>>) => void,
  ) => result().then(resolve);
  return chain;
}

describe("loadServerLiveContext", () => {
  it("aggregates live signals from mocked DB queries scoped to the authenticated user", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-16T12:00:00.000Z") });
    const userId = "11111111-1111-1111-1111-111111111111";
    const sessionId = "session-1";
    const eqCalls: Array<[string, string]> = [];

    const from = vi.fn((table: string) => {
      const chain = {
        select: vi.fn((columns?: string) => {
          if (table === "dailyCheckin" && columns === "date") {
            return {
              eq: vi.fn(() =>
                createQueryResult([
                  { date: "2026-07-15" },
                  { date: "2026-07-16" },
                ]),
              ),
            };
          }
          return chain;
        }),
        eq: vi.fn((column: string, value: string) => {
          eqCalls.push([column, value]);
          return chain;
        }),
        order: vi.fn(() => chain),
        in: vi.fn(() => {
          if (table === "pathSession") {
            return createQueryResult([
              {
                id: "session-done",
                microCommitment: "Wrote the honest answer",
                title: "Session done",
                index: 1,
              },
            ]);
          }
          return createQueryResult([]);
        }),
        maybeSingle: vi.fn(() => {
          if (table === "pathEnrollment") {
            return createQueryResult({
              status: "active",
              isMicroCommitmentInFocus: true,
              focusedMicroCommitmentSessionId: [sessionId],
              completedMicroCommitmentSessionIds: ["session-done"],
              completedSessionsCount: 1,
              currentSessionId: sessionId,
              pathId: "path-1",
              path: { name: "Hard Seasons", sessionsCount: 6 },
            });
          }
          if (table === "pathSession") {
            return createQueryResult({ microCommitment: "Text a friend" });
          }
          return createQueryResult(null);
        }),
        limit: vi.fn((count?: number) => {
          if (table === "dailyCheckin" && count === 8) {
            return {
              then: (
                resolve: (value: Awaited<ReturnType<typeof createQueryResult>>) => void,
              ) =>
                createQueryResult([
                  {
                    mood: 4,
                    energyStressLevel: 5,
                    feelingWord: "steady",
                    reflection: "Focused morning.",
                    date: "2026-07-16T08:00:00.000Z",
                    microCommitmentStatus: "done",
                  },
                ]).then(resolve),
            };
          }
          if (table === "pathResponse") {
            return {
              then: (
                resolve: (value: Awaited<ReturnType<typeof createQueryResult>>) => void,
              ) =>
                createQueryResult([
                  {
                    questionText: "What felt heaviest?",
                    answerText: "Deadlines",
                    createdAt: "2026-07-09T12:00:00.000Z",
                    pathSession: { title: "Session 1", path: { name: "Hard Seasons" } },
                  },
                ]).then(resolve),
            };
          }
          return chain;
        }),
        then: undefined as never,
      };

      if (table === "chatConversation") {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => createQueryResult(null, null).then((result) => ({ ...result, count: 2 }))),
        })) as never;
      }

      if (table === "pathResponse") {
        chain.select = vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                createQueryResult([
                  {
                    questionText: "What felt heaviest?",
                    answerText: "Deadlines",
                    createdAt: "2026-07-09T12:00:00.000Z",
                    pathSession: { title: "Session 1", path: { name: "Hard Seasons" } },
                  },
                ]),
              ),
            })),
          })),
        })) as never;
      }

      return chain;
    });

    const supabase = { from } as never;
    const { loadServerLiveContext } = await import(
      "../../../../supabase/functions/chat/loadServerLiveContext.ts"
    );

    const result = await loadServerLiveContext(supabase, userId, {});

    expect(result.latestCheckIn?.feeling).toBe("steady");
    expect(result.streakDays).toBe(2);
    expect(result.activeMicroCommitment).toBe("Text a friend");
    expect(result.completedMicroCommitments).toEqual(["Wrote the honest answer"]);
    expect(result.sessionCount).toBe(2);
    expect(result.pathReflections[0]?.answerText).toBe("Deadlines");
    expect(from).toHaveBeenCalledWith("dailyCheckin");
    expect(from).toHaveBeenCalledWith("pathEnrollment");
    expect(from).toHaveBeenCalledWith("pathSession");
    expect(eqCalls).toContainEqual(["userId", userId]);
    vi.useRealTimers();
  });

  it("falls back to onboardingData when DB tables are unavailable", async () => {
    vi.useFakeTimers({ now: new Date("2026-07-16T12:00:00.000Z") });
    const userId = "user-1";
    const onboarding = {
      dailyCheckInStreak: 3,
      daily_checkins: [
        {
          userId,
          mood: 2,
          energyStressLevel: 4,
          feelingWord: "fallback",
          reflection: "fallback check-in prose",
          date: "2026-07-16T08:00:00.000Z",
        },
      ],
      chat_conversations: [{ id: "c1" }],
      micro_commitment_active_text: "Onboarding commitment",
    };

    const schemaError = { code: "42P01", message: 'relation "dailyCheckin" does not exist' };
    const from = vi.fn(() => createFallbackChain(schemaError));

    const supabase = { from } as never;
    const { loadServerLiveContext } = await import(
      "../../../../supabase/functions/chat/loadServerLiveContext.ts"
    );

    const result = await loadServerLiveContext(supabase, userId, onboarding);

    expect(result.latestCheckIn?.feeling).toBe("fallback");
    expect(result.streakDays).toBe(1);
    expect(result.activeMicroCommitment).toBe("Onboarding commitment");
    expect(result.sessionCount).toBe(1);
    vi.useRealTimers();
  });
});

describe("aggregateLiveContext", () => {
  it("merges micro-commitment candidates without fabricating values", () => {
    const result = aggregateLiveContext({
      latestCheckIn: {
        date: "2026-07-10",
        pulse: 4,
        feeling: "tired",
        energyStressLevel: 6,
        microCommitmentStatus: "partially",
      },
      streakDays: 5,
      activeMicroCommitmentCandidates: ["", null, "Text a friend"],
      sessionCount: 2,
      pathReflections: [
        {
          questionText: "What felt heaviest?",
          answerText: "Work deadlines",
        },
      ],
    });

    expect(result.activeMicroCommitment).toBe("Text a friend");
    expect(result.sessionCount).toBe(2);
    expect(result.pathReflections).toHaveLength(1);
  });
});

describe("onboarding liveContext readers", () => {
  it("reads streak, check-in, session count, and path reflections from onboardingData", () => {
    const today = new Date().toISOString();
    const onboarding = {
      dailyCheckInStreak: 4,
      daily_checkins: [
        {
          userId: "user-1",
          mood: 3,
          energyStressLevel: 5,
          feelingWord: "okay",
          reflection: "okay day details",
          date: today,
        },
      ],
      chat_conversations: [{ id: "c1" }, { id: "c2" }],
      path_responses: [
        {
          pathName: "Hard Seasons",
          answers: [{ questionText: "Q1", answerText: "A1" }],
        },
      ],
      micro_commitment_active_text: "Walk after lunch",
    };

    expect(readStreakFromOnboarding(onboarding)).toBe(4);
    expect(readLatestCheckInFromOnboarding("user-1", onboarding)?.feeling).toBe("okay");
    expect(readSessionCountFromOnboarding(onboarding)).toBe(2);
    expect(readPathReflectionsFromOnboarding(onboarding)).toHaveLength(1);
    expect(readActiveMicroCommitmentFromOnboarding(onboarding)).toBe("Walk after lunch");
  });
});
