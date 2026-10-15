import { describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/components/chat/types";
import { finalizeRealtimeConversation, hasUserSpeech, shouldFinalizeOnEnd } from "./realtimeFinalize";

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({ id: `${role}-${content}`, role, content });

describe("realtimeFinalize", () => {
  it("finalizes only on final ends", () => {
    for (const reason of ["user_ended", "max_duration", "idle_timeout", "budget_reached"] as const) {
      expect(shouldFinalizeOnEnd(reason)).toBe(true);
    }
    for (const reason of ["network_lost", "connect_failed", "mic_lost", "error", "crisis", "abandoned"] as const) {
      expect(shouldFinalizeOnEnd(reason)).toBe(false);
    }
    expect(shouldFinalizeOnEnd(null)).toBe(false);
  });

  it("needs real user speech", () => {
    expect(hasUserSpeech([msg("assistant", "Hi"), msg("user", "[inaudible]"), msg("user", "  ")])).toBe(false);
    expect(hasUserSpeech([msg("user", "I'm tired")])).toBe(true);
  });

  it("finalizes the persisted transcript with sessionType voice_conversation semantics", async () => {
    const messages = [msg("user", "I'm tired"), msg("assistant", "Tell me more")];
    const deps = { fetchMessages: vi.fn(async () => messages), finalize: vi.fn(async () => ({})) };
    await expect(finalizeRealtimeConversation("c1", deps)).resolves.toBe("saved");
    expect(deps.fetchMessages).toHaveBeenCalledWith("c1");
    expect(deps.finalize).toHaveBeenCalledWith(messages, "c1");
  });

  it("skips an empty conversation and propagates failures", async () => {
    const empty = { fetchMessages: vi.fn(async () => [msg("assistant", "Hi")]), finalize: vi.fn() };
    await expect(finalizeRealtimeConversation("c1", empty)).resolves.toBe("skipped");
    expect(empty.finalize).not.toHaveBeenCalled();
    const failing = {
      fetchMessages: vi.fn(async () => [msg("user", "Hi")]),
      finalize: vi.fn(async () => {
        throw new Error("500");
      }),
    };
    await expect(finalizeRealtimeConversation("c1", failing)).rejects.toThrow("500");
  });
});
