import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createConversation } from "@/lib/chat/chatConversationsApi";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import {
  canStartNewChatSession,
  FREE_TIER_UPSELL_MESSAGE,
} from "@/lib/chat/chatSessionLimit";

interface UseNewConversationOptions {
  userId: string | undefined;
  onboardingData?: Record<string, unknown> | null;
  tier?: string | null;
  subscribed?: boolean | null;
  accountType?: string | null;
  enterpriseTier?: string | null;
  setConversationId: (id: string | null) => void;
  onCreated?: () => void;
}

/**
 * bTImJ / ai_RNbBHXbH new-conversation button parity.
 */
export function useNewConversation({
  userId,
  onboardingData,
  tier,
  subscribed,
  accountType,
  enterpriseTier,
  setConversationId,
  onCreated,
}: UseNewConversationOptions) {
  const [creating, setCreating] = useState(false);

  const createNew = useCallback(async () => {
    if (!userId || creating) return;

    if (
      !canStartNewChatSession({
        tier,
        subscribed,
        accountType,
        enterpriseTier,
        onboardingData,
      })
    ) {
      trackProductEvent("paywall_shown", { surface: "new_conversation" });
      toast.error(FREE_TIER_UPSELL_MESSAGE);
      return;
    }

    setCreating(true);
    try {
      const created = await createConversation(userId, onboardingData ?? null);
      trackProductEvent("session_started", { conversation_id: created.id });
      setConversationId(created.id);
      onCreated?.();
    } catch {
      toast.error("Couldn't start a new conversation. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [accountType, creating, enterpriseTier, onboardingData, onCreated, setConversationId, subscribed, tier, userId]);

  return { createNew, creating };
}
