/** Build Brief §12 upsell when Free tier monthly session limit is reached. */
export const FREE_TIER_SESSION_LIMIT = 7;

export const FREE_TIER_UPSELL_MESSAGE =
  "You've used your 7 sessions for this month. Pro members get unlimited sessions — your coach is ready when you are.";

export const CHAT_AI_MONTHLY_USAGE_KEY = "chat_ai_monthly_usage" as const;

type MonthlyUsageRecord = {
  monthKey: string;
  sessionConversationIds: string[];
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim());
}

export function currentMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function readMonthlyUsage(
  onboardingData: Record<string, unknown> | null | undefined,
  monthKey = currentMonthKey(),
): MonthlyUsageRecord {
  const raw = onboardingData?.[CHAT_AI_MONTHLY_USAGE_KEY];
  if (!raw || typeof raw !== "object") {
    return { monthKey, sessionConversationIds: [] };
  }
  const row = raw as Record<string, unknown>;
  const storedMonth = typeof row.monthKey === "string" ? row.monthKey : monthKey;
  const sessionConversationIds = asStringArray(row.sessionConversationIds);

  if (storedMonth !== monthKey) {
    return { monthKey, sessionConversationIds: [] };
  }

  return { monthKey, sessionConversationIds };
}

export function isFreeTierUser(
  tier: string | null | undefined,
  subscribed: boolean | null | undefined,
): boolean {
  if (subscribed === true) return false;
  const normalized = (tier ?? "free").toLowerCase();
  return normalized === "free" || normalized === "explorer" || normalized === "";
}

/** Layer 10 item 2 — Pro/Premium only; Free gets "Not available on Free tier." */
export function canAccessSessionMemoryInPrompt(
  tier: string | null | undefined,
  subscribed: boolean | null | undefined,
): boolean {
  return !isFreeTierUser(tier, subscribed);
}

export function resolveCurrentTier(
  subscribed: boolean | null | undefined,
  tier: string | null | undefined,
): "free" | "pro" | "premium" {
  const normalized = (tier ?? "").toLowerCase();
  if (normalized === "pro" || normalized === "premium" || normalized === "free") {
    return normalized;
  }
  return subscribed === true ? "pro" : "free";
}

/** AI journal reflection is Pro/Premium only (US-405). */
export function canUseJournalAiReflection(
  subscribed: boolean | null | undefined,
  tier: string | null | undefined,
): boolean {
  const currentTier = resolveCurrentTier(subscribed, tier);
  return currentTier === "pro" || currentTier === "premium";
}

export function isContinuingSession(
  conversationId: string | undefined,
  usage: MonthlyUsageRecord,
): boolean {
  if (!conversationId) return false;
  return usage.sessionConversationIds.includes(conversationId);
}

/** First AI touch per conversation counts as a session (not only session_open). */
export function shouldRecordNewSession(
  conversationId: string | undefined,
  usage: MonthlyUsageRecord,
  lifecycle: string | undefined,
): boolean {
  if (!conversationId || isContinuingSession(conversationId, usage)) return false;
  if (lifecycle === "session_finalize" || lifecycle === "conversation_title") return false;
  return true;
}

export type { MonthlyUsageRecord };

export type ConsumeChatSessionResult = {
  allowed: boolean;
  recorded?: boolean;
  code?: string;
};

export function parseConsumeChatSessionResult(data: unknown): ConsumeChatSessionResult {
  if (!data || typeof data !== "object") {
    return { allowed: false, code: "invalid_response" };
  }

  const row = data as Record<string, unknown>;
  return {
    allowed: row.allowed === true,
    recorded: row.recorded === true,
    code: typeof row.code === "string" ? row.code : undefined,
  };
}
