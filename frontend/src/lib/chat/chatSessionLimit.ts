import {
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  isFreeTierUser,
  readMonthlyUsage,
} from "../../../../supabase/functions/chat/tierGateHelpers.ts";

export { FREE_TIER_SESSION_LIMIT, FREE_TIER_UPSELL_MESSAGE };

export type SessionLimitCheckInput = {
  tier?: string | null;
  subscribed?: boolean | null;
  onboardingData?: Record<string, unknown> | null;
};

/** True when a Free-tier user has consumed all monthly coaching sessions. */
export function isAtFreeTierSessionLimit(input: SessionLimitCheckInput): boolean {
  if (!isFreeTierUser(input.tier, input.subscribed)) return false;
  const usage = readMonthlyUsage(input.onboardingData);
  return usage.sessionConversationIds.length >= FREE_TIER_SESSION_LIMIT;
}

/** Whether the user may start AI in a conversation not yet counted this month. */
export function canStartNewChatSession(input: SessionLimitCheckInput): boolean {
  return !isAtFreeTierSessionLimit(input);
}
