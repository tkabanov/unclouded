import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  FREE_TIER_UPSELL_MESSAGE,
  parseConsumeChatSessionResult,
} from "../../../../supabase/functions/chat/tierGateHelpers.ts";

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  "../../../../supabase/migrations/20260710130000_consume_chat_session_rpc.sql",
);

describe("parseConsumeChatSessionResult", () => {
  it("parses allowed + recorded responses from consume_chat_session", () => {
    expect(parseConsumeChatSessionResult({ allowed: true, recorded: true })).toEqual({
      allowed: true,
      recorded: true,
      code: undefined,
    });
    expect(parseConsumeChatSessionResult({ allowed: true, recorded: false })).toEqual({
      allowed: true,
      recorded: false,
      code: undefined,
    });
    expect(parseConsumeChatSessionResult({ allowed: false, code: "free_tier_session_limit" })).toEqual({
      allowed: false,
      recorded: false,
      code: "free_tier_session_limit",
    });
  });
});

describe("consume_chat_session migration security contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("binds RPC to auth.uid() matching p_user_id (two-user isolation)", () => {
    expect(sql).toMatch(/auth\.uid\(\)\s*IS NULL OR auth\.uid\(\)\s*<>\s*p_user_id/);
    expect(sql).toMatch(/RAISE EXCEPTION 'forbidden'/);
  });

  it("computes month key and session limit inside the RPC (not caller-controlled)", () => {
    expect(sql).toMatch(/v_month_key := to_char\(timezone\('utc', now\(\)\), 'YYYY-MM'\)/);
    expect(sql).toMatch(/v_limit int := 3/);
    expect(sql).not.toMatch(/p_month_key text/);
    expect(sql).not.toMatch(/p_limit int/);
  });

  it("uses row lock and jsonb array membership (not object-key ? operator)", () => {
    expect(sql).toMatch(/FOR UPDATE/);
    expect(sql).toMatch(/jsonb_array_elements_text\(v_ids\)/);
    expect(sql).not.toMatch(/IF v_ids \? p_conversation_id/);
  });

  it("supports check-only mode via p_record for session_finalize", () => {
    expect(sql).toMatch(/p_record boolean DEFAULT true/);
    expect(sql).toMatch(/IF NOT p_record THEN/);
  });

  it("repairs updatedAt trigger drift for profiles updates", () => {
    expect(sql).toMatch(/NEW\."updatedAt" = now\(\)/);
  });

  it("is SECURITY DEFINER with search_path pinned and execute limited to authenticated", () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.consume_chat_session\(uuid, text, boolean\)/);
    expect(sql).toMatch(/TO authenticated/);
  });
});

describe("enforceFreeTierSessionGate", () => {
  it("calls consume_chat_session for the authenticated user id only", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: true, recorded: true },
      error: null,
    });
    const supabase = { rpc } as never;

    const { enforceFreeTierSessionGate } = await import(
      "../../../../supabase/functions/chat/tierGate.ts"
    );

    const result = await enforceFreeTierSessionGate(
      supabase,
      "11111111-1111-1111-1111-111111111111",
      "conv-a",
      undefined,
    );

    expect(result).toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledWith("consume_chat_session", {
      p_user_id: "11111111-1111-1111-1111-111111111111",
      p_conversation_id: "conv-a",
      p_record: true,
    });
  });

  it("returns upsell copy when RPC reports free_tier_session_limit", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, code: "free_tier_session_limit" },
      error: null,
    });
    const supabase = { rpc } as never;

    const { enforceFreeTierSessionGate } = await import(
      "../../../../supabase/functions/chat/tierGate.ts"
    );

    const result = await enforceFreeTierSessionGate(
      supabase,
      "11111111-1111-1111-1111-111111111111",
      "conv-new",
      "session_open",
    );

    expect(result).toEqual({
      allowed: false,
      message: FREE_TIER_UPSELL_MESSAGE,
      code: "free_tier_session_limit",
    });
  });

  it("rejects cross-user RPC attempts surfaced as forbidden", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "forbidden" },
    });
    const supabase = { rpc } as never;

    const { enforceFreeTierSessionGate } = await import(
      "../../../../supabase/functions/chat/tierGate.ts"
    );

    await expect(
      enforceFreeTierSessionGate(
        supabase,
        "22222222-2222-2222-2222-222222222222",
        "conv-a",
        undefined,
      ),
    ).rejects.toThrow(/cannot consume another profile/i);
  });

  it("uses check-only RPC on session_finalize", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: true, recorded: false },
      error: null,
    });
    const supabase = { rpc } as never;

    const { enforceFreeTierSessionGate } = await import(
      "../../../../supabase/functions/chat/tierGate.ts"
    );

    const result = await enforceFreeTierSessionGate(
      supabase,
      "11111111-1111-1111-1111-111111111111",
      "conv-a",
      "session_finalize",
    );

    expect(result).toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledWith("consume_chat_session", {
      p_user_id: "11111111-1111-1111-1111-111111111111",
      p_conversation_id: "conv-a",
      p_record: false,
    });
  });

  it("rejects session_finalize when RPC reports free_tier_session_limit", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, code: "free_tier_session_limit" },
      error: null,
    });
    const supabase = { rpc } as never;

    const { enforceFreeTierSessionGate } = await import(
      "../../../../supabase/functions/chat/tierGate.ts"
    );

    const result = await enforceFreeTierSessionGate(
      supabase,
      "11111111-1111-1111-1111-111111111111",
      "conv-new",
      "session_finalize",
    );

    expect(result.allowed).toBe(false);
    expect(rpc).toHaveBeenCalledWith("consume_chat_session", expect.objectContaining({ p_record: false }));
  });
});
