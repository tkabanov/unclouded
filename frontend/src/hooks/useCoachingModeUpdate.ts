import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ChatComposerMode } from "@/components/chat/types";
import { CHAT_CONVERSATION_DEFAULTS } from "@/components/chat/types";
import { updateConversationCoachingMode } from "@/lib/chat/chatConversationsApi";

const MODE_BADGE_LABELS: Record<ChatComposerMode, string> = {
  plan: "Planning • Executive Coaching",
  reflect: "Reflection • Executive Coaching",
  goal: "Goals • Executive Coaching",
  stress: "Stress support • Executive Coaching",
};

interface UseCoachingModeUpdateOptions {
  conversationId: string;
  userId: string;
  initialMode?: ChatComposerMode;
}

/**
 * Wire DS-06 coaching mode chips to conversation context + bTIRi badge text.
 */
export function useCoachingModeUpdate({
  conversationId,
  userId,
  initialMode,
}: UseCoachingModeUpdateOptions) {
  const [selectedMode, setSelectedMode] = useState<ChatComposerMode | undefined>(initialMode);

  useEffect(() => {
    setSelectedMode(initialMode);
  }, [conversationId, initialMode]);

  const modeBadgeText =
    selectedMode !== undefined
      ? MODE_BADGE_LABELS[selectedMode]
      : CHAT_CONVERSATION_DEFAULTS.mode_badge_text;

  const onModeSelect = useCallback(
    (mode: ChatComposerMode) => {
      setSelectedMode(mode);
      void updateConversationCoachingMode(userId, conversationId, mode).catch(() => {
        toast.error("Couldn't save coaching mode. Please try again.");
      });
    },
    [conversationId, userId],
  );

  return { selectedMode, modeBadgeText, onModeSelect };
}
