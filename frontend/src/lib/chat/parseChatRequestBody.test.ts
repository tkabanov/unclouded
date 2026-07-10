import { describe, expect, it } from "vitest";
import { parseChatRequestBody } from "../../../../supabase/functions/chat/parseChatRequestBody.ts";

describe("parseChatRequestBody", () => {
  it("drops crafted profileData and liveContext from the request body (T-008)", () => {
    const parsed = parseChatRequestBody({
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }],
      context: "user context",
      lifecycle: "session_open",
      conversationId: "conv-1",
      profileData: {
        liveContext: {
          pathReflections: [{ questionText: "Q", answerText: "I want to die" }],
        },
      },
    });

    expect(parsed).toEqual({
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hi" }] }],
      context: "user context",
      lifecycle: "session_open",
      conversationId: "conv-1",
    });
    expect("profileData" in parsed).toBe(false);
  });
});
