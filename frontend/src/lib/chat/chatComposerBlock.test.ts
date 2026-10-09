import { describe, expect, it } from "vitest";
import { isChatComposerDisabled } from "@/lib/chat/chatSessionLimit";

const open = {
  awaitingAssistantReply: false,
  sessionClosed: false,
  sessionLimitBlocked: false,
  awaitingCommitment: false,
};

describe("isChatComposerDisabled", () => {
  it("is enabled for a normal session", () => {
    expect(isChatComposerDisabled(open)).toBe(false);
  });

  it("is disabled while the assistant replies or after the session closed", () => {
    expect(isChatComposerDisabled({ ...open, awaitingAssistantReply: true })).toBe(true);
    expect(isChatComposerDisabled({ ...open, sessionClosed: true })).toBe(true);
  });

  it("is disabled when a limit blocks the session", () => {
    expect(isChatComposerDisabled({ ...open, sessionLimitBlocked: true })).toBe(true);
  });

  it("stays enabled for the closing commitment even when a limit blocks the session", () => {
    expect(
      isChatComposerDisabled({ ...open, sessionLimitBlocked: true, awaitingCommitment: true }),
    ).toBe(false);
  });

  it("still disables the commitment input while the assistant replies", () => {
    expect(
      isChatComposerDisabled({
        ...open,
        sessionLimitBlocked: true,
        awaitingCommitment: true,
        awaitingAssistantReply: true,
      }),
    ).toBe(true);
  });
});
