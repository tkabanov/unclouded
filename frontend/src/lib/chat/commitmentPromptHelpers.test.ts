import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/components/chat/types";
import { resolveCommitmentPromptMessageId } from "./commitmentPromptHelpers";

describe("resolveCommitmentPromptMessageId", () => {
  const messages: ChatMessage[] = [
    { id: "u1", role: "user", content: "hello" },
    { id: "a1", role: "assistant", content: "Hi there" },
    { id: "u2", role: "user", content: "work stress" },
    { id: "a2", role: "assistant", content: "Before we close…" },
  ];

  it("returns null when not awaiting commitment", () => {
    expect(resolveCommitmentPromptMessageId(messages, false)).toBeNull();
  });

  it("returns the last assistant message while awaiting commitment", () => {
    expect(resolveCommitmentPromptMessageId(messages, true)).toBe("a2");
  });

  it("prefers the stored close prompt id after an ack message arrives", () => {
    const withAck: ChatMessage[] = [
      ...messages,
      { id: "u3", role: "user", content: "My commitment" },
      { id: "a3", role: "assistant", content: "Thanks — that matters." },
    ];
    expect(resolveCommitmentPromptMessageId(withAck, true, "a2")).toBe("a2");
  });

  it("returns null when awaiting commitment but no assistant message exists", () => {
    expect(
      resolveCommitmentPromptMessageId([{ id: "u1", role: "user", content: "hi" }], true),
    ).toBeNull();
  });
});
