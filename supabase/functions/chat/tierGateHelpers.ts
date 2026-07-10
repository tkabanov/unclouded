/** Build Brief §12 upsell when Free tier monthly session limit is reached. */
export const FREE_TIER_SESSION_LIMIT = 3;

export const FREE_TIER_UPSELL_MESSAGE =
  "You've used your 3 sessions for this month. Pro members get unlimited sessions — your coach is ready when you are.";

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
  if (lifecycle === "session_finalize") return false;
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
