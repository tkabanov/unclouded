import { useEffect, useRef } from "react";
import {
  createConversation,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { canStartNewChatSession } from "@/lib/chat/chatSessionLimit";

export interface UseEmptyConversationBootstrapOptions {
  userId: string | undefined;
  conversations: ConversationListItem[];
  loading: boolean;
  onboardingData?: Record<string, unknown> | null;
  tier?: string | null;
  subscribed?: boolean | null;
  setConversationId: (id: string | null) => void;
  onBootstrapped?: () => void | Promise<void>;
}

/**
 * bTInQ ConditionTrue parity — when the thread list is empty on mount, create the first
 * chatconversation and navigate to /chat?conversation=<new_id> (bTInW ChangePage).
 */
export function useEmptyConversationBootstrap({
  userId,
  conversations,
  loading,
  onboardingData,
  tier,
  subscribed,
  setConversationId,
  onBootstrapped,
}: UseEmptyConversationBootstrapOptions): void {
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (loading || bootstrappedRef.current || !userId || conversations.length > 0) return;

    if (
      !canStartNewChatSession({
        tier,
        subscribed,
        onboardingData,
      })
    ) {
      bootstrappedRef.current = true;
      return;
    }

    bootstrappedRef.current = true;

    void (async () => {
      const created = await createConversation(userId, onboardingData ?? null);
      setConversationId(created.id);
      await onBootstrapped?.();
    })();
  }, [
    conversations.length,
    loading,
    onboardingData,
    onBootstrapped,
    setConversationId,
    subscribed,
    tier,
    userId,
  ]);
}
