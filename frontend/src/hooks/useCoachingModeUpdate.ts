import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ChatComposerMode } from "@/components/chat/types";
import { CHAT_CONVERSATION_DEFAULTS } from "@/components/chat/types";

const MODE_BADGE_LABELS: Record<ChatComposerMode, string> = {
  plan: "Planning • Executive Coaching",
  reflect: "Reflection • Executive Coaching",
  goal: "Goals • Executive Coaching",
  stress: "Stress support • Executive Coaching",
};

/**
 * Wire DS-06 coaching mode chips to conversation context badge text (bTIRi).
 */
export function useCoachingModeUpdate() {
  const [selectedMode, setSelectedMode] = useState<ChatComposerMode | undefined>();

  const modeBadgeText =
    selectedMode !== undefined
      ? MODE_BADGE_LABELS[selectedMode]
      : CHAT_CONVERSATION_DEFAULTS.mode_badge_text;

  const onModeSelect = useCallback((mode: ChatComposerMode) => {
    setSelectedMode(mode);
  }, []);

  return { selectedMode, modeBadgeText, onModeSelect };
}
