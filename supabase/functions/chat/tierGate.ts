import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  CHAT_AI_MONTHLY_USAGE_KEY,
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  currentMonthKey,
  isContinuingSession,
  isFreeTierUser,
  readMonthlyUsage,
  shouldRecordNewSession,
  type MonthlyUsageRecord,
} from "./tierGateHelpers.ts";

export {
  CHAT_AI_MONTHLY_USAGE_KEY,
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  currentMonthKey,
  isContinuingSession,
  isFreeTierUser,
  readMonthlyUsage,
  shouldRecordNewSession,
} from "./tierGateHelpers.ts";

type ProfileTierRow = {
  tier?: string | null;
  subscribed?: boolean | null;
  onboardingData?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export type TierGateResult =
  | { allowed: true; usage: MonthlyUsageRecord; shouldRecordSession: boolean }
  | { allowed: false; message: string; code: "free_tier_session_limit" | "conversation_required" };

export async function checkFreeTierSessionAllowance(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  lifecycle: string | undefined,
): Promise<TierGateResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("tier, subscribed, onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || typeof data !== "object") {
    throw new Error("Profile not found for tier gate");
  }

  const row = data as ProfileTierRow;
  const onboardingData = asRecord(row.onboardingData);
  const usage = readMonthlyUsage(onboardingData);

  if (!isFreeTierUser(row.tier, row.subscribed)) {
    return { allowed: true, usage, shouldRecordSession: false };
  }

  if (isContinuingSession(conversationId, usage)) {
    return { allowed: true, usage, shouldRecordSession: false };
  }

  if (!conversationId?.trim()) {
    return {
      allowed: false,
      message: "A conversation is required to start a coaching session.",
      code: "conversation_required",
    };
  }

  if (usage.sessionConversationIds.length >= FREE_TIER_SESSION_LIMIT) {
    return {
      allowed: false,
      message: FREE_TIER_UPSELL_MESSAGE,
      code: "free_tier_session_limit",
    };
  }

  const shouldRecordSession = shouldRecordNewSession(conversationId, usage, lifecycle);
  return { allowed: true, usage, shouldRecordSession };
}

export async function recordNewChatSession(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  usage: MonthlyUsageRecord,
): Promise<void> {
  if (!conversationId || usage.sessionConversationIds.includes(conversationId)) {
    return;
  }

  const { data, error: fetchError } = await supabase
    .from("profiles")
    .select("onboardingData")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const onboardingData = asRecord(
    data && typeof data === "object"
      ? (data as ProfileTierRow).onboardingData
      : null,
  );

  const currentUsage = readMonthlyUsage(onboardingData, usage.monthKey);
  if (currentUsage.sessionConversationIds.includes(conversationId)) {
    return;
  }

  const nextOnboarding = {
    ...onboardingData,
    [CHAT_AI_MONTHLY_USAGE_KEY]: {
      monthKey: usage.monthKey,
      sessionConversationIds: [...currentUsage.sessionConversationIds, conversationId],
    },
  };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ onboardingData: nextOnboarding as never })
    .eq("id", userId);

  if (updateError) throw updateError;
}
