import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "token-abc" } },
        error: null,
      }),
    },
  },
}));

vi.mock("@/lib/chat/readChatStreamText", () => ({
  readChatStreamText: vi.fn().mockResolvedValue("ok"),
}));

describe("callChatEdge payload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
