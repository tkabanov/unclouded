import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  endsSession,
  evaluateAiBudgetGate,
} from "../../../../supabase/functions/chat/aiBudgetGate.ts";

/** Fake service client: `check_ai_budget` answers per mode. */
function budgetClient(allowed: { text: boolean; voice: boolean }, tier = "free") {
  const rpc = vi.fn(async (_fn: string, args: { p_mode: "text" | "voice" }) => ({
    data: { allowed: allowed[args.p_mode], tier },
    error: null,
  }));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

const gate = (
  client: SupabaseClient,
  overrides: Partial<Parameters<typeof evaluateAiBudgetGate>[1]> = {},
) =>
  evaluateAiBudgetGate(client, {
    userId: "user-1",
    usageMode: "text",
    ownedConversation: true,
    allowWhenOwnedConversation: false,
    ...overrides,
  });

describe("endsSession (NCLDD-52)", () => {
  it("is true only for close / close-ack / finalize", () => {
    expect(endsSession("session_close")).toBe(true);
    expect(endsSession("session_close_ack")).toBe(true);
    expect(endsSession("session_finalize")).toBe(true);
    expect(endsSession("session_open")).toBe(false);
    expect(endsSession("turn")).toBe(false);
    expect(endsSession(undefined)).toBe(false);
  });
});

describe("evaluateAiBudgetGate (NCLDD-52)", () => {
  it("blocks a text turn / session open when the text budget is used up", async () => {
    const { client, rpc } = budgetClient({ text: false, voice: true });
    await expect(gate(client)).resolves.toEqual({ blockedMode: "text", tier: "free" });
    expect(rpc).toHaveBeenCalledWith("check_ai_budget", { p_user: "user-1", p_mode: "text" });
  });

  it("checks only the conversation's own mode for an owned conversation", async () => {
    const { client, rpc } = budgetClient({ text: false, voice: true });
    await expect(gate(client, { usageMode: "voice" })).resolves.toEqual({ blockedMode: null, tier: "free" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_mode: "voice" });
  });

  it("lets close / close-ack / finalize of an owned conversation through over budget", async () => {
    const { client } = budgetClient({ text: false, voice: false }, "pro");
    await expect(
      gate(client, { allowWhenOwnedConversation: endsSession("session_finalize") }),
    ).resolves.toEqual({ blockedMode: null, tier: "pro" });
  });

  it("still blocks closing calls when the conversation is not owned", async () => {
    const { client } = budgetClient({ text: true, voice: false });
    await expect(
      gate(client, { ownedConversation: false, allowWhenOwnedConversation: true }),
    ).resolves.toEqual({ blockedMode: "voice", tier: "free" });
  });

  it("applies both budgets without an owned conversation (client-sent mode is not trusted)", async () => {
    const { client, rpc } = budgetClient({ text: true, voice: false });
    await expect(gate(client, { ownedConversation: false, usageMode: "text" })).resolves.toEqual({
      blockedMode: "voice",
      tier: "free",
    });
    expect(rpc.mock.calls.map((call) => call[1].p_mode)).toEqual(["text", "voice"]);
  });

  it("never checks or blocks `other`", async () => {
    const { client, rpc } = budgetClient({ text: false, voice: false });
    await expect(gate(client, { usageMode: "other" })).resolves.toEqual({ blockedMode: null, tier: null });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails open when the budget RPC errors", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { code: "57014", message: "timeout" } }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(gate({ rpc } as unknown as SupabaseClient)).resolves.toEqual({
      blockedMode: null,
      tier: null,
    });
    errorSpy.mockRestore();
  });
});
