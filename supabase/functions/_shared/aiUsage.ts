import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { isValidUuid } from "./uuidHelpers.ts";

/**
 * NCLDD-52 — AI usage ledger + monthly budget check.
 * Costs are ESTIMATES: real tokens / audio seconds / TTS characters x `aiModelPricing`.
 * Recording never breaks a user-facing reply; the budget check fails open on infra errors.
 */

export type AiUsageMode = "text" | "voice" | "other";

export type AiUsageSource =
  | "chat_turn"
  | "title"
  | "session_close"
  | "session_close_ack"
  | "session_finalize"
  | "memory_extract"
  | "arc_summary"
  | "stt"
  | "tts"
  | "standalone_insight"
  | "journal_reflection"
  | "coaching_summary"
  | "trajectory_statement"
  | "path_closing"
  | "kota_read"
  | "pup_pdf"
  | "prompt_test";

export type AiPlanTier = "free" | "pro" | "premium";

export type AiUsageAmounts = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  audioSeconds?: number;
  ttsChars?: number;
};

export type PricingRow = {
  provider: string;
  model: string;
  unit: string;
  usdPerUnit: number;
  effectiveFrom: string;
};

/** Callback for raw-fetch OpenAI calls: report the model id sent and its usage. */
export type UsageReporter = (model: string, usage: AiUsageAmounts) => void;

export const AI_MONTHLY_LIMIT_CODE = "ai_monthly_limit_reached";

const PRICING_CACHE_TTL_MS = 60_000;
let pricingCache: { loadedAt: number; rows: PricingRow[] } | null = null;

export function clearAiPricingCache(): void {
  pricingCache = null;
}

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Latest price effective at `at` for one provider/model/unit, or null. */
function findPrice(
  pricing: PricingRow[],
  provider: string,
  model: string,
  unit: string,
  at: Date,
): number | null {
  let best: PricingRow | null = null;
  for (const row of pricing) {
    if (row.provider !== provider || row.model !== model || row.unit !== unit) continue;
    if (new Date(row.effectiveFrom).getTime() > at.getTime()) continue;
    if (!best || new Date(row.effectiveFrom) > new Date(best.effectiveFrom)) best = row;
  }
  return best ? best.usdPerUnit : null;
}

/**
 * Pure cost estimate. `pricingMissing` is true when a used unit has no price row
 * (that part is counted as 0 so the ledger still shows the usage).
 */
export function computeCostUsd(
  pricing: PricingRow[],
  provider: string,
  model: string,
  usage: AiUsageAmounts,
  at: Date = new Date(),
): { costUsd: number; pricingMissing: boolean } {
  const cached = finiteNonNegative(usage.cachedInputTokens);
  const input = finiteNonNegative(usage.inputTokens);
  const uncached = Math.max(input - cached, 0);
  const output = finiteNonNegative(usage.outputTokens);
  const audioMinutes = finiteNonNegative(usage.audioSeconds) / 60;
  const ttsMillionChars = finiteNonNegative(usage.ttsChars) / 1_000_000;

  let cost = 0;
  let missing = false;

  const add = (amount: number, unit: string, perUnitDivisor: number, fallbackUnit?: string) => {
    if (amount <= 0) return;
    let price = findPrice(pricing, provider, model, unit, at);
    if (price === null && fallbackUnit) price = findPrice(pricing, provider, model, fallbackUnit, at);
    if (price === null) {
      missing = true;
      return;
    }
    cost += (amount / perUnitDivisor) * price;
  };

  add(uncached, "token_in_1m", 1_000_000);
  add(cached, "token_cached_in_1m", 1_000_000, "token_in_1m");
  add(output, "token_out_1m", 1_000_000);
  add(audioMinutes, "audio_minute", 1);
  add(ttsMillionChars, "tts_1m_chars", 1);

  return { costUsd: Math.round(cost * 1_000_000) / 1_000_000, pricingMissing: missing };
}

/** Voice sessions are `voice`; text and quick check-ins are `text`. */
export function modeFromSessionType(sessionType: unknown): "text" | "voice" {
  return sessionType === "voice" ? "voice" : "text";
}

/**
 * Normalise AI SDK (v5 `inputTokens`, v4 `promptTokens`) or raw OpenAI (`prompt_tokens`)
 * usage objects into ledger amounts.
 */
export function normalizeUsage(raw: unknown): AiUsageAmounts {
  if (!raw || typeof raw !== "object") return {};
  const u = raw as Record<string, unknown>;
  const details = (u.prompt_tokens_details ?? {}) as Record<string, unknown>;
  const pick = (...keys: Array<unknown>) => {
    for (const value of keys) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return 0;
  };
  return {
    inputTokens: pick(u.inputTokens, u.promptTokens, u.prompt_tokens),
    outputTokens: pick(u.outputTokens, u.completionTokens, u.completion_tokens),
    cachedInputTokens: pick(u.cachedInputTokens, details.cached_tokens),
  };
}

export async function loadPricing(admin: SupabaseClient): Promise<PricingRow[]> {
  if (pricingCache && Date.now() - pricingCache.loadedAt <= PRICING_CACHE_TTL_MS) {
    return pricingCache.rows;
  }
  const { data, error } = await admin
    .from("aiModelPricing")
    .select("provider, model, unit, usdPerUnit, effectiveFrom");
  if (error) {
    console.warn("loadPricing failed", error.code ?? error.message);
    return pricingCache?.rows ?? [];
  }
  const rows = (data ?? []).map((row) => ({
    provider: String(row.provider),
    model: String(row.model),
    unit: String(row.unit),
    usdPerUnit: Number(row.usdPerUnit),
    effectiveFrom: String(row.effectiveFrom),
  }));
  pricingCache = { loadedAt: Date.now(), rows };
  return rows;
}

async function resolveTier(admin: SupabaseClient, userId: string): Promise<AiPlanTier> {
  const { data, error } = await admin.rpc("ai_limit_tier", { p_user: userId });
  if (error) {
    console.warn("ai_limit_tier failed", error.code ?? error.message);
    return "free";
  }
  return data === "pro" || data === "premium" ? data : "free";
}

export type RecordAiUsageParams = {
  userId: string;
  conversationId?: string | null;
  mode: AiUsageMode;
  source: AiUsageSource;
  model: string;
  provider?: string;
  usage: AiUsageAmounts;
  /** Pass when already known (budget check); otherwise resolved server-side. */
  tier?: AiPlanTier | null;
};

/** Insert one ledger row. Never throws; failures are only logged. */
export async function recordAiUsage(
  admin: SupabaseClient,
  params: RecordAiUsageParams,
): Promise<void> {
  try {
    const provider = params.provider ?? "openai";
    const [pricing, tier] = await Promise.all([
      loadPricing(admin),
      params.tier ? Promise.resolve(params.tier) : resolveTier(admin, params.userId),
    ]);
    const { costUsd, pricingMissing } = computeCostUsd(pricing, provider, params.model, params.usage);
    const conversationId =
      params.conversationId && isValidUuid(params.conversationId)
        ? params.conversationId.trim()
        : null;

    const { error } = await admin.from("aiUsageEvent").insert({
      userId: params.userId,
      conversationId,
      mode: params.mode,
      source: params.source,
      provider,
      model: params.model,
      inputTokens: Math.round(finiteNonNegative(params.usage.inputTokens)),
      outputTokens: Math.round(finiteNonNegative(params.usage.outputTokens)),
      cachedInputTokens: Math.round(finiteNonNegative(params.usage.cachedInputTokens)),
      audioSeconds: finiteNonNegative(params.usage.audioSeconds),
      ttsChars: Math.round(finiteNonNegative(params.usage.ttsChars)),
      costUsd,
      pricingMissing,
      planTierAtEvent: tier,
    });
    if (error) console.warn("recordAiUsage insert failed", error.code ?? error.message);
  } catch (err) {
    console.warn("recordAiUsage failed", err);
  }
}

export type AiBudgetResult = {
  allowed: boolean;
  tier: AiPlanTier | null;
  mode: AiUsageMode;
};

/**
 * Server-side monthly budget gate. Fails OPEN on RPC/infra errors (and before the migration
 * is applied) so an outage of the limits tables never blocks coaching.
 */
export async function checkAiBudget(
  admin: SupabaseClient,
  userId: string,
  mode: AiUsageMode,
): Promise<AiBudgetResult> {
  if (mode === "other") return { allowed: true, tier: null, mode };
  try {
    const { data, error } = await admin.rpc("check_ai_budget", { p_user: userId, p_mode: mode });
    if (error || !data || typeof data !== "object") {
      console.error("check_ai_budget failed (limits NOT enforced)", error?.code ?? error?.message ?? "no data");
      return { allowed: true, tier: null, mode };
    }
    const result = data as { allowed?: boolean; tier?: string };
    const tier =
      result.tier === "pro" || result.tier === "premium" || result.tier === "free"
        ? result.tier
        : null;
    return { allowed: result.allowed !== false, tier, mode };
  } catch (err) {
    console.error("check_ai_budget threw (limits NOT enforced)", err);
    return { allowed: true, tier: null, mode };
  }
}

/**
 * Mode of a conversation from `chatConversation.sessionType` (authoritative), falling back to
 * the sessionType sent by the client when the conversation row cannot be read.
 */
export async function lookupConversation(
  client: SupabaseClient,
  conversationId: string | null | undefined,
  userId: string,
  fallbackSessionType?: unknown,
): Promise<{ mode: "text" | "voice"; owned: boolean }> {
  if (conversationId && isValidUuid(conversationId)) {
    try {
      const { data } = await client
        .from("chatConversation")
        .select("sessionType")
        .eq("id", conversationId.trim())
        .eq("userId", userId)
        .maybeSingle();
      if (data?.sessionType) return { mode: modeFromSessionType(data.sessionType), owned: true };
    } catch (err) {
      console.warn("lookupConversation failed", err);
    }
  }
  return { mode: modeFromSessionType(fallbackSessionType), owned: false };
}

export async function resolveConversationMode(
  client: SupabaseClient,
  conversationId: string | null | undefined,
  userId: string,
  fallbackSessionType?: unknown,
): Promise<"text" | "voice"> {
  return (await lookupConversation(client, conversationId, userId, fallbackSessionType)).mode;
}
