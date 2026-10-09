import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAiBudget,
  clearAiPricingCache,
  computeCostUsd,
  modeFromSessionType,
  normalizeUsage,
  recordAiUsage,
  resolveConversationMode,
  type PricingRow,
} from "../../../../supabase/functions/_shared/aiUsage.ts";

const PRICING: PricingRow[] = [
  { provider: "openai", model: "gpt-4o-mini", unit: "token_in_1m", usdPerUnit: 0.15, effectiveFrom: "2024-01-01T00:00:00Z" },
  { provider: "openai", model: "gpt-4o-mini", unit: "token_cached_in_1m", usdPerUnit: 0.075, effectiveFrom: "2024-01-01T00:00:00Z" },
  { provider: "openai", model: "gpt-4o-mini", unit: "token_out_1m", usdPerUnit: 0.6, effectiveFrom: "2024-01-01T00:00:00Z" },
  { provider: "openai", model: "whisper-1", unit: "audio_minute", usdPerUnit: 0.006, effectiveFrom: "2024-01-01T00:00:00Z" },
  { provider: "openai", model: "tts-1", unit: "tts_1m_chars", usdPerUnit: 15, effectiveFrom: "2024-01-01T00:00:00Z" },
];

describe("computeCostUsd (NCLDD-52)", () => {
  it("prices input, cached input and output tokens", () => {
    const result = computeCostUsd(PRICING, "openai", "gpt-4o-mini", {
      inputTokens: 1_000_000,
      cachedInputTokens: 400_000,
      outputTokens: 500_000,
    });
    // 600k * 0.15/1M + 400k * 0.075/1M + 500k * 0.6/1M
    expect(result.costUsd).toBeCloseTo(0.09 + 0.03 + 0.3, 6);
    expect(result.pricingMissing).toBe(false);
  });

  it("prices whisper by audio minutes and TTS by characters", () => {
    expect(computeCostUsd(PRICING, "openai", "whisper-1", { audioSeconds: 90 }).costUsd).toBeCloseTo(0.009, 6);
    expect(computeCostUsd(PRICING, "openai", "tts-1", { ttsChars: 2000 }).costUsd).toBeCloseTo(0.03, 6);
  });

  it("flags unknown models instead of inventing a price", () => {
    const result = computeCostUsd(PRICING, "openai", "gpt-future", { inputTokens: 1000 });
    expect(result).toEqual({ costUsd: 0, pricingMissing: true });
  });

  it("falls back to the regular input price when no cached price exists", () => {
    const noCached = PRICING.filter((row) => row.unit !== "token_cached_in_1m");
    const result = computeCostUsd(noCached, "openai", "gpt-4o-mini", {
      inputTokens: 1_000_000,
      cachedInputTokens: 1_000_000,
    });
    expect(result.costUsd).toBeCloseTo(0.15, 6);
    expect(result.pricingMissing).toBe(false);
  });

  it("uses the latest price effective at the event time", () => {
    const rows: PricingRow[] = [
      ...PRICING,
      { provider: "openai", model: "gpt-4o-mini", unit: "token_in_1m", usdPerUnit: 0.3, effectiveFrom: "2026-06-01T00:00:00Z" },
    ];
    const before = computeCostUsd(rows, "openai", "gpt-4o-mini", { inputTokens: 1_000_000 }, new Date("2026-05-01"));
    const after = computeCostUsd(rows, "openai", "gpt-4o-mini", { inputTokens: 1_000_000 }, new Date("2026-07-01"));
    expect(before.costUsd).toBeCloseTo(0.15, 6);
    expect(after.costUsd).toBeCloseTo(0.3, 6);
  });

  it("ignores negative / non-finite amounts and zero usage", () => {
    expect(computeCostUsd(PRICING, "openai", "gpt-4o-mini", { inputTokens: -5, outputTokens: Number.NaN }))
      .toEqual({ costUsd: 0, pricingMissing: false });
  });
});

describe("normalizeUsage", () => {
  it("reads AI SDK v5, v4 and raw OpenAI shapes", () => {
    expect(normalizeUsage({ inputTokens: 10, outputTokens: 5, cachedInputTokens: 2 })).toEqual({
      inputTokens: 10, outputTokens: 5, cachedInputTokens: 2,
    });
    expect(normalizeUsage({ promptTokens: 7, completionTokens: 3 })).toMatchObject({ inputTokens: 7, outputTokens: 3 });
    expect(
      normalizeUsage({ prompt_tokens: 20, completion_tokens: 4, prompt_tokens_details: { cached_tokens: 8 } }),
    ).toEqual({ inputTokens: 20, outputTokens: 4, cachedInputTokens: 8 });
    expect(normalizeUsage(undefined)).toEqual({});
  });
});

describe("resolveConversationMode", () => {
  it("maps voice to voice and everything else to text", () => {
    expect(modeFromSessionType("voice")).toBe("voice");
    expect(modeFromSessionType("text")).toBe("text");
    expect(modeFromSessionType("quick_checkin")).toBe("text");
    expect(modeFromSessionType(undefined)).toBe("text");
  });

  it("prefers the stored conversation sessionType over the client value", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { sessionType: "voice" } });
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = maybeSingle;
    const client = { from: vi.fn(() => chain) } as never;

    const mode = await resolveConversationMode(
      client,
      "123e4567-e89b-42d3-a456-426614174000",
      "user-1",
      "text",
    );
    expect(mode).toBe("voice");
  });

  it("falls back to the client session type without a valid conversation id", async () => {
    const client = { from: vi.fn() } as never;
    expect(await resolveConversationMode(client, "not-a-uuid", "user-1", "voice")).toBe("voice");
    expect(await resolveConversationMode(client, null, "user-1", undefined)).toBe("text");
  });
});

describe("checkAiBudget", () => {
  it("never limits `other` and does not call the database", async () => {
    const rpc = vi.fn();
    const result = await checkAiBudget({ rpc } as never, "u", "other");
    expect(result.allowed).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks only when the RPC says allowed=false", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, code: "ai_monthly_limit_reached", tier: "pro" },
      error: null,
    });
    const result = await checkAiBudget({ rpc } as never, "u", "text");
    expect(result).toEqual({ allowed: false, tier: "pro", mode: "text" });
    expect(rpc).toHaveBeenCalledWith("check_ai_budget", { p_user: "u", p_mode: "text" });
  });

  it("fails open on RPC errors and thrown exceptions", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = vi.fn().mockResolvedValue({ data: null, error: { code: "42883", message: "missing" } });
    expect((await checkAiBudget({ rpc: failing } as never, "u", "voice")).allowed).toBe(true);
    const throwing = vi.fn().mockRejectedValue(new Error("network"));
    expect((await checkAiBudget({ rpc: throwing } as never, "u", "voice")).allowed).toBe(true);
    warn.mockRestore();
  });
});

describe("recordAiUsage", () => {
  beforeEach(() => clearAiPricingCache());

  function fakeAdmin(insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>) {
    return {
      rpc: vi.fn().mockResolvedValue({ data: "pro", error: null }),
      from: vi.fn((table: string) => {
        if (table === "aiModelPricing") {
          return { select: vi.fn().mockResolvedValue({ data: PRICING, error: null }) };
        }
        return { insert };
      }),
    } as never;
  }

  it("inserts an estimated cost row with the resolved tier and a valid conversation id", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAiUsage(fakeAdmin(insert), {
      userId: "user-1",
      conversationId: "123e4567-e89b-42d3-a456-426614174000",
      mode: "text",
      source: "chat_turn",
      model: "gpt-4o-mini",
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        conversationId: "123e4567-e89b-42d3-a456-426614174000",
        mode: "text",
        source: "chat_turn",
        planTierAtEvent: "pro",
        pricingMissing: false,
      }),
    );
    expect(insert.mock.calls[0][0].costUsd).toBeCloseTo(0.15, 6);
  });

  it("drops an invalid conversation id instead of failing the insert", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    await recordAiUsage(fakeAdmin(insert), {
      userId: "user-1",
      conversationId: "nope",
      mode: "other",
      source: "kota_read",
      model: "gpt-4o-mini",
      usage: {},
    });
    expect(insert.mock.calls[0][0].conversationId).toBeNull();
  });

  it("never throws when the insert fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const insert = vi.fn().mockRejectedValue(new Error("db down"));
    await expect(
      recordAiUsage(fakeAdmin(insert), {
        userId: "user-1",
        mode: "text",
        source: "title",
        model: "gpt-4o-mini",
        usage: { inputTokens: 5 },
      }),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
