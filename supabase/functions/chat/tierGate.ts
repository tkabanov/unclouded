import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  FREE_TIER_UPSELL_MESSAGE,
  parseConsumeChatSessionResult,
} from "./tierGateHelpers.ts";

export {
  CHAT_AI_MONTHLY_USAGE_KEY,
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  currentMonthKey,
  isContinuingSession,
  isFreeTierUser,
  parseConsumeChatSessionResult,
  readMonthlyUsage,
  shouldRecordNewSession,
} from "./tierGateHelpers.ts";

export type TierGateResult =
  | { allowed: true }
  | {
      allowed: false;
      message: string;
      code: "free_tier_session_limit" | "conversation_required";
    };

export async function enforceFreeTierSessionGate(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  lifecycle: string | undefined,
): Promise<TierGateResult> {
  if (!conversationId?.trim()) {
    return {
      allowed: false,
      message: "A conversation is required to start a coaching session.",
      code: "conversation_required",
    };
  }

  const recordSession = lifecycle !== "session_finalize";

  const { data, error } = await supabase.rpc("consume_chat_session", {
    p_user_id: userId,
    p_conversation_id: conversationId.trim(),
    p_record: recordSession,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("forbidden")) {
      throw new Error("Tier gate forbidden: authenticated user cannot consume another profile");
    }
    throw error;
  }

  const result = parseConsumeChatSessionResult(data);
  if (result.allowed) {
    return { allowed: true };
  }

  if (result.code === "conversation_required") {
    return {
      allowed: false,
      message: "A conversation is required to start a coaching session.",
      code: "conversation_required",
    };
  }

  return {
    allowed: false,
    message: FREE_TIER_UPSELL_MESSAGE,
    code: "free_tier_session_limit",
  };
}
