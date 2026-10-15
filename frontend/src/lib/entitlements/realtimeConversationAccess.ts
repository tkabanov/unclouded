/**
 * NCLDD-57 §5.5 — client side of the Conversation-mode tier gate. Uses the same helper as the
 * `realtime-voice` edge function; today every tier is allowed (`REALTIME_CONVERSATION_MIN_TIER`).
 */
import { canUseRealtimeConversation } from "../../../../supabase/functions/chat/tierGateHelpers.ts";
import { resolveUserEntitlement, type UserEntitlementInput } from "./userEntitlementHelpers";

export function canUseRealtimeConversationForUser(input: UserEntitlementInput): boolean {
  return canUseRealtimeConversation(resolveUserEntitlement(input).tier);
}
