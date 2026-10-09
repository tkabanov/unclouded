import {
  FREE_TIER_SESSION_LIMIT,
  FREE_TIER_UPSELL_MESSAGE,
  isFreeTierUser,
  readMonthlyUsage,
} from "../../../../supabase/functions/chat/tierGateHelpers.ts";

export { FREE_TIER_SESSION_LIMIT, FREE_TIER_UPSELL_MESSAGE };

/** NCLDD-52: server code when the monthly AI spend limit for text or voice is used up. */
export const AI_MONTHLY_LIMIT_CODE = "ai_monthly_limit_reached";
export const FREE_TIER_LIMIT_CODE = "free_tier_session_limit";

export type AiLimitMode = "text" | "voice";

export function formatMonthlyAiLimitMessage(mode: AiLimitMode = "text"): string {
  return `You've reached this month's AI ${mode} limit. It resets on the 1st (UTC).`;
}

/** Errors that block the whole coaching session UI (Free-tier sessions or monthly AI budget). */
export function isSessionLimitCode(code: string | undefined | null): boolean {
  return code === FREE_TIER_LIMIT_CODE || code === AI_MONTHLY_LIMIT_CODE;
}

/**
 * Whether the chat composer is disabled. A session blocked by a limit still lets the user answer
 * the closing commitment: close-ack is never limited (OVR-072), so they must be able to finish.
 */
export function isChatComposerDisabled(input: {
  awaitingAssistantReply: boolean;
  sessionClosed: boolean;
  sessionLimitBlocked: boolean;
  awaitingCommitment: boolean;
}): boolean {
  return (
    input.awaitingAssistantReply ||
    input.sessionClosed ||
    (input.sessionLimitBlocked && !input.awaitingCommitment)
  );
}

/** Banner text shown above a blocked session. */
export function sessionLimitNoticeFor(code: string | undefined | null, message: string): string {
  return code === AI_MONTHLY_LIMIT_CODE ? message : FREE_TIER_UPSELL_MESSAGE;
}

export type SessionLimitCheckInput = {
  tier?: string | null;
  subscribed?: boolean | null;
  accountType?: string | null;
  enterpriseTier?: string | null;
  onboardingData?: Record<string, unknown> | null;
};

/** True when a Free-tier user has consumed all monthly coaching sessions. */
export function isAtFreeTierSessionLimit(input: SessionLimitCheckInput): boolean {
  if (!isFreeTierUser(input.tier, input.subscribed, input.accountType, input.enterpriseTier)) {
    return false;
  }
  const usage = readMonthlyUsage(input.onboardingData);
  return usage.sessionConversationIds.length >= FREE_TIER_SESSION_LIMIT;
}

/** Whether the user may start AI in a conversation not yet counted this month. */
export function canStartNewChatSession(input: SessionLimitCheckInput): boolean {
  return !isAtFreeTierSessionLimit(input);
}
