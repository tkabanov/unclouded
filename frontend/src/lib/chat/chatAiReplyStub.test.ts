import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn().mockResolvedValue({
  data: { session: { access_token: "token-abc" } },
  error: null,
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

vi.mock("@/lib/chat/readChatStreamText", () => ({
  readChatStreamText: vi.fn().mockResolvedValue("ok"),
}));

describe("callChatEdge payload", () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: "token-abc" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    getSessionMock.mockClear();
  });

  it("does not send client liveContext or profileData to the edge function", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain" },
      body: {},
    });
    vi.stubGlobal("fetch", fetchMock);

    const { callChatEdge } = await import("@/lib/chat/chatAiReplyStub");

    await callChatEdge({
      messages: [{ id: "1", role: "user", content: "hello" }],
      context: "Name: Alex",
      conversationId: "conv-1",
      profileData: {
        liveContext: {
          latestCheckIn: { feeling: "I want to die" },
        },
      },
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.profileData).toBeUndefined();
    expect(body.conversationId).toBe("conv-1");
    expect(body.context).toBe("Name: Alex");
  });

  it("returns text from session_close JSON replies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        text: "Before we close — what's one thing you're willing to do before we talk again?",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { callChatEdge } = await import("@/lib/chat/chatAiReplyStub");

    const result = await callChatEdge({
      lifecycle: "session_close",
      messages: [{ id: "1", role: "user", content: "hello" }],
      conversationId: "conv-1",
    });

    expect(result).toBe(
      "Before we close — what's one thing you're willing to do before we talk again?",
    );
  });

  it("sends sessionType voice on voice session turns (REQ-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain" },
      body: {},
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateAiReplyStub } = await import("@/lib/chat/chatAiReplyStub");

    await generateAiReplyStub(
      [{ id: "1", role: "user", content: "hello" }],
      "Name: Alex",
      undefined,
      "conv-voice",
      "voice",
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.sessionType).toBe("voice");
    expect(body.conversationId).toBe("conv-voice");
  });

  it("sends sessionType on session open for voice (REQ-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "text/plain" },
      body: {},
    });
    vi.stubGlobal("fetch", fetchMock);

    const { requestSessionOpening } = await import("@/lib/chat/chatSessionLifecycleApi");

    await requestSessionOpening(undefined, "Name: Alex", "conv-voice", "voice");

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.lifecycle).toBe("session_open");
    expect(body.sessionType).toBe("voice");
  });

  it("sends sessionType on session close for voice (REQ-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ text: "Close prompt" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { requestSessionClose } = await import("@/lib/chat/chatSessionLifecycleApi");

    await requestSessionClose(
      [{ id: "1", role: "user", content: "done" }],
      undefined,
      undefined,
      "conv-voice",
      "voice",
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.lifecycle).toBe("session_close");
    expect(body.sessionType).toBe("voice");
  });

  it("sends sessionType on session finalize for voice (REQ-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        lastSessionTopic: "boundaries",
        summaryStub: "Named work overload.",
        microCommitmentText: "Decline one meeting.",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { finalizeSessionFromThread } = await import("@/lib/chat/chatSessionLifecycleApi");

    await finalizeSessionFromThread(
      [{ id: "1", role: "user", content: "I'll decline one meeting." }],
      undefined,
      undefined,
      "conv-voice",
      "voice",
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.lifecycle).toBe("session_finalize");
    expect(body.sessionType).toBe("voice");
  });
});
