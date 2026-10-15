import { beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();
const persistSessionMemory = vi.fn(() => Promise.resolve());
const persistCoachingSessionArchive = vi.fn(() => Promise.resolve());

vi.mock("npm:ai", () => ({ generateText: (...args: unknown[]) => generateText(...args) }));
vi.mock("../../../../supabase/functions/chat/persistSessionMemory.ts", () => ({
  persistSessionMemory: (...args: unknown[]) => persistSessionMemory(...args),
}));
vi.mock("../../../../supabase/functions/chat/sessionMemory/coachingSessionArchive.ts", async (orig) => ({
  ...(await orig<object>()),
  persistCoachingSessionArchive: (...args: unknown[]) => persistCoachingSessionArchive(...args),
}));

import { runSessionFinalize } from "../../../../supabase/functions/chat/sessionMemory/runSessionFinalize.ts";

const userId = "11111111-1111-1111-1111-111111111111";
const conversationId = "22222222-2222-2222-2222-222222222222";

function fakeDb() {
  const eq = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => ({ eq }));
  return { db: { from: vi.fn(() => ({ update })) }, update };
}

function params(db: unknown, trackUsage = vi.fn()) {
  return {
    db: db as never,
    serviceClient: {} as never,
    model: {} as never,
    modelId: "gpt-test",
    userId,
    conversationId,
    sessionType: "voice" as const,
    conversationMode: "voice" as const,
    ownedConversation: true,
    profileData: { firstName: "Ana" },
    uiMessages: [
      { id: "a", role: "assistant" as const, parts: [{ type: "text" as const, text: "Hi, how are you?" }] },
      { id: "u", role: "user" as const, parts: [{ type: "text" as const, text: "Work has been stressful." }] },
    ],
    trackUsage,
  };
}

describe("runSessionFinalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("Deno", { env: { get: () => undefined } });
  });

  it("persists memory + archive with the session type and clears the prior-crisis flag", async () => {
    generateText.mockResolvedValue({
      text: JSON.stringify({ lastSessionTopic: "work stress", summaryStub: "Talked about work." }),
      usage: { inputTokens: 10, outputTokens: 5 },
    });
    const { db, update } = fakeDb();
    const trackUsage = vi.fn();

    const parsed = await runSessionFinalize(params(db, trackUsage));

    expect(parsed?.lastSessionTopic).toBe("work stress");
    expect(persistSessionMemory).toHaveBeenCalledWith(db, userId, conversationId, parsed, expect.any(String), 1);
    expect(persistCoachingSessionArchive).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ userId, conversationId, sessionType: "voice", exchangeCount: 1 }),
    );
    expect(trackUsage).toHaveBeenCalledWith("session_finalize", expect.anything());
    expect(update).toHaveBeenCalledWith({ hasPriorCrisisSession: false });
  });

  it("retries once, then falls back to a payload built from the thread", async () => {
    generateText.mockResolvedValue({ text: "not json", usage: {} });
    const { db } = fakeDb();

    const parsed = await runSessionFinalize(params(db));

    expect(generateText).toHaveBeenCalledTimes(2);
    expect(parsed).not.toBeNull();
    expect(persistCoachingSessionArchive).toHaveBeenCalledTimes(1);
  });
});
