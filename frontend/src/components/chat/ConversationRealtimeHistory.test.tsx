import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchConversationById = vi.fn();
const fetchMessagesForConversation = vi.fn();
const callChatEdge = vi.fn();

vi.mock("@/lib/chat/chatConversationsApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/chatConversationsApi")>()),
  fetchConversationById: (...args: unknown[]) => fetchConversationById(...args),
}));
vi.mock("@/lib/chat/chatMessagesApi", () => ({
  fetchMessagesForConversation: (...args: unknown[]) => fetchMessagesForConversation(...args),
}));
vi.mock("@/components/aiInsights/AiInsightsConsentGate", () => ({
  AiInsightsConsentGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/voice/VoiceSessionPanel", () => ({ default: () => <div>Voice messages panel</div> }));
vi.mock("./ChatPanelMount", () => ({ default: () => <div>Text chat panel</div> }));
vi.mock("@/components/chat/ChatMessagesList", () => ({
  ChatMessagesList: ({ messages, feedbackConversationId }: { messages: Array<{ content: string }>; feedbackConversationId: string }) => (
    <div data-testid="list" data-feedback={feedbackConversationId}>
      {messages.map((m) => m.content).join(" | ")}
    </div>
  ),
}));
vi.mock("@/lib/chat/chatAiReplyStub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/chatAiReplyStub")>()),
  callChatEdge: (...args: unknown[]) => callChatEdge(...args),
}));

import ConversationPanelMount from "./ConversationPanelMount";
import ConversationThreadCell from "./ConversationThreadCell";
import { finalizeSessionFromThread as realFinalize } from "@/lib/chat/chatSessionLifecycleApi";

function Probe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

beforeEach(() => {
  fetchConversationById.mockReset();
  fetchMessagesForConversation.mockReset();
  callChatEdge.mockReset();
});

describe("Conversation mode in history (NCLDD-57 S6)", () => {
  it("badges voice_conversation as Conversation and voice as Voice", () => {
    const noop = vi.fn();
    const { rerender } = render(
      <ConversationThreadCell
        conversation={{ id: "c1", title: "Talk", sessionType: "voice_conversation" } as never}
        isActive={false}
        onSelect={noop}
        onRenameRequest={noop}
        onDeleteRequest={noop}
      />,
    );
    expect(screen.getByText("Conversation")).toBeInTheDocument();
    rerender(
      <ConversationThreadCell
        conversation={{ id: "c2", title: "Old", sessionType: "voice" } as never}
        isActive={false}
        onSelect={noop}
        onRenameRequest={noop}
        onDeleteRequest={noop}
      />,
    );
    expect(screen.getByText("Voice")).toBeInTheDocument();
  });

  it("opens a read-only transcript with feedback and a link to a new conversation", async () => {
    fetchConversationById.mockResolvedValue({ id: "c1", sessionType: "voice_conversation" });
    fetchMessagesForConversation.mockResolvedValue([
      { id: "m1", role: "user", content: "I feel stuck" },
      { id: "m2", role: "assistant", content: "Tell me more" },
    ]);
    render(
      <MemoryRouter initialEntries={["/chat"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ConversationPanelMount conversationId="c1" userId="u1" />
                <Probe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    const list = await screen.findByTestId("list");
    expect(list).toHaveTextContent("I feel stuck | Tell me more");
    expect(list).toHaveAttribute("data-feedback", "c1");
    expect(screen.queryByText("Voice messages panel")).toBeNull();
    expect(screen.queryByText("Text chat panel")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start a new conversation" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/coaching/voice?mode=conversation");
  });

  it("shows a load error instead of an empty transcript", async () => {
    fetchConversationById.mockResolvedValue({ id: "c1", sessionType: "voice_conversation" });
    fetchMessagesForConversation.mockRejectedValue(new Error("rls"));
    render(
      <MemoryRouter>
        <ConversationPanelMount conversationId="c1" userId="u1" />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Couldn't load this conversation.")).toBeInTheDocument();
  });

  it("finalize sends sessionType voice_conversation to the chat edge", async () => {
    callChatEdge.mockResolvedValue({ lastSessionTopic: "t", summaryStub: "s" });
    await realFinalize([{ id: "m1", role: "user", content: "hi" }], undefined, undefined, "c1", "voice_conversation").catch(
      () => undefined,
    );
    expect(callChatEdge).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: "session_finalize", conversationId: "c1", sessionType: "voice_conversation" }),
    );
  });
});
