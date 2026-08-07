import { afterEach, describe, expect, it } from "vitest";
import {
  PATH_CLOSING_CHAT_CONTEXT_KEY,
  clearPathClosingChatContext,
  consumePathClosingChatContext,
  isPathClosingChatContext,
  mergeChatContextWithPathClosing,
  peekPathClosingChatContext,
  setPathClosingChatContext,
} from "./pathClosingChatContext";

const SAMPLE_NOTE =
  "The user just completed Session 1 of path of Comfortable Plateau and wants to discuss something that came up.";

afterEach(() => {
  clearPathClosingChatContext();
});

describe("pathClosingChatContext", () => {
  it("writes, peeks, and consumes the handoff note", () => {
    setPathClosingChatContext(SAMPLE_NOTE);
    expect(sessionStorage.getItem(PATH_CLOSING_CHAT_CONTEXT_KEY)).toBe(SAMPLE_NOTE);
    expect(peekPathClosingChatContext()).toBe(SAMPLE_NOTE);
    expect(consumePathClosingChatContext()).toBe(SAMPLE_NOTE);
    expect(peekPathClosingChatContext()).toBeNull();
    expect(consumePathClosingChatContext()).toBeNull();
  });

  it("ignores blank notes", () => {
    setPathClosingChatContext("   ");
    expect(peekPathClosingChatContext()).toBeNull();
  });

  it("detects path-closing handoff phrasing", () => {
    expect(isPathClosingChatContext(SAMPLE_NOTE)).toBe(true);
    expect(isPathClosingChatContext("Name: Alex. Focus area: Stability")).toBe(false);
    expect(isPathClosingChatContext(null)).toBe(false);
  });

  it("merges profile context with the handoff note", () => {
    expect(mergeChatContextWithPathClosing("Name: Alex", SAMPLE_NOTE)).toBe(
      `Name: Alex. ${SAMPLE_NOTE}`,
    );
    expect(mergeChatContextWithPathClosing(undefined, SAMPLE_NOTE)).toBe(SAMPLE_NOTE);
    expect(mergeChatContextWithPathClosing("Name: Alex", null)).toBe("Name: Alex");
    expect(mergeChatContextWithPathClosing(undefined, null)).toBeUndefined();
  });
});
