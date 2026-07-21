import { describe, expect, it } from "vitest";

import {
  computeDaysSinceLastCompletedSessionFromMemory,
  resolveDaysSinceLastCompletedSession,
} from "../../../../supabase/functions/chat/liveContext/sessionGapHelpers.ts";

describe("sessionGapHelpers", () => {
  it("computes days since last closed session from memory JSON", () => {
    const days = computeDaysSinceLastCompletedSessionFromMemory(
      {
        chat_session_memory: [{ closedAt: "2026-07-06T18:00:00.000Z", topic: "sleep" }],
      },
      new Date("2026-07-10T12:00:00.000Z"),
    );
    expect(days).toBe(4);
  });

  it("prefers archive finalizedAt over memory fallback", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { finalizedAt: "2026-07-09T10:00:00.000Z" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const days = await resolveDaysSinceLastCompletedSession(
      supabase as never,
      "user-1",
      {
        chat_session_memory: [{ closedAt: "2026-07-01T18:00:00.000Z", topic: "old" }],
      },
      new Date("2026-07-10T12:00:00.000Z"),
    );

    expect(days).toBe(1);
  });
});
