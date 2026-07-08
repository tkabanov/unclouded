import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createConversation } from "@/lib/chat/chatConversationsApi";

interface UseNewConversationOptions {
  userId: string | undefined;
  onboardingData?: Record<string, unknown> | null;
  setConversationId: (id: string | null) => void;
  onCreated?: () => void;
}

/**
 * bTImJ / ai_RNbBHXbH new-conversation button parity.
 */
export function useNewConversation({
  userId,
  onboardingData,
  setConversationId,
  onCreated,
}: UseNewConversationOptions) {
  const [creating, setCreating] = useState(false);

  const createNew = useCallback(async () => {
    if (!userId || creating) return;
    setCreating(true);
    try {
      const created = await createConversation(userId, onboardingData ?? null);
      setConversationId(created.id);
      onCreated?.();
    } catch {
      toast.error("Couldn't start a new conversation. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [creating, onboardingData, onCreated, setConversationId, userId]);

  return { createNew, creating };
}
