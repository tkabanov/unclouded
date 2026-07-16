import { describe, expect, it } from "vitest";
import {
  buildConversationTitleUserPrompt,
  extractLatestUserAssistantPair,
  isDefaultConversationTitle,
  sanitizeConversationTitle,
} from "../../../../supabase/functions/chat/prompt/conversationTitle.ts";

describe("conversationTitle helpers", () => {
  it("detects default conversation titles from app and Bubble copy", () => {
    expect(isDefaultConversationTitle("New conversation")).toBe(true);
    expect(isDefaultConversationTitle("New Conversation")).toBe(true);
    expect(isDefaultConversationTitle("Work boundaries")).toBe(false);
  });

  it("extracts the latest user and assistant pair from the thread", () => {
    const pair = extractLatestUserAssistantPair([
      { id: "1", role: "assistant", parts: [{ type: "text", text: "Welcome back" }] },
      { id: "2", role: "user", parts: [{ type: "text", text: "I feel overwhelmed" }] },
      { id: "3", role: "assistant", parts: [{ type: "text", text: "Tell me more" }] },
    ]);

    expect(pair).toEqual({
      userMessage: "I feel overwhelmed",
      assistantMessage: "Tell me more",
    });
  });

  it("builds the Bubble title prompt payload", () => {
    expect(
      buildConversationTitleUserPrompt("Need help sleeping", "Let's start with your evenings"),
    ).toBe(`User message: Need help sleeping
Model answer: Let's start with your evenings`);
  });

  it("sanitizes generated titles to short plain text", () => {
    expect(sanitizeConversationTitle('"Evening sleep routine!"')).toBe("Evening sleep routine");
    expect(sanitizeConversationTitle("one two three four five six seven")).toBe(
      "one two three four five",
    );
  });
});
