import { describe, expect, it } from "vitest";
import {
  MAX_CONVERSATION_EXCHANGES,
  truncateConversationMessages,
} from "../../../../supabase/functions/chat/truncateConversationMessages.ts";

describe("truncateConversationMessages", () => {
  it("keeps only the most recent user exchanges", () => {
    const messages = Array.from({ length: 41 }, (_, index) => ({
      id: `m-${index}`,
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      parts: [{ type: "text" as const, text: `message-${index}` }],
    }));

    const truncated = truncateConversationMessages(messages);
    const userMessages = truncated.filter((message) => message.role === "user");
    expect(userMessages).toHaveLength(MAX_CONVERSATION_EXCHANGES);
    expect(truncated[0]?.id).toBe("m-2");
  });

  it("preserves short threads unchanged", () => {
    const messages = [
      { id: "u1", role: "user" as const, parts: [{ type: "text" as const, text: "hello" }] },
      {
        id: "a1",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "hi" }],
      },
    ];

    expect(truncateConversationMessages(messages)).toEqual(messages);
  });
});
