import { describe, expect, it, vi } from "vitest";

const calls: Array<[string, ...unknown[]]> = [];
function chain(): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  for (const method of ["from", "select", "eq", "is", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return builder;
    };
  }
  builder.maybeSingle = async () => ({ data: null, error: null });
  return builder;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (...args: unknown[]) => (chain().from as (...a: unknown[]) => unknown)(...args) } }));

import { fetchLatestUnfinishedVoiceConversation } from "./chatConversationsApi";

describe("fetchLatestUnfinishedVoiceConversation (NCLDD-57 regression)", () => {
  it("resumes only Voice messages conversations, never voice_conversation", async () => {
    await fetchLatestUnfinishedVoiceConversation("u1");
    expect(calls).toContainEqual(["eq", "sessionType", "voice"]);
    expect(calls.some((call) => call.includes("voice_conversation"))).toBe(false);
    expect(calls).toContainEqual(["is", "finalizedAt", null]);
  });
});
