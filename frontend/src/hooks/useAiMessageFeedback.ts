import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  fetchConversationFeedback,
  setAiMessageFeedback,
  type AiFeedbackRating,
  type AiMessageFeedback,
} from "@/lib/chat/aiMessageFeedbackApi";

export type UseAiMessageFeedback = {
  /** False until loaded, and when feedback storage is unavailable. */
  available: boolean;
  feedbackFor: (messageId: string) => AiMessageFeedback | null;
  submit: (messageId: string, rating: AiFeedbackRating | 0, reasons?: string[]) => Promise<void>;
};

/** NCLDD-55 — the current user's 👍 / 👎 on Kota replies in one conversation. */
export function useAiMessageFeedback(conversationId: string | null | undefined): UseAiMessageFeedback {
  const [available, setAvailable] = useState(false);
  const [byMessageId, setByMessageId] = useState<Record<string, AiMessageFeedback>>({});

  useEffect(() => {
    setAvailable(false);
    setByMessageId({});
    if (!conversationId) return;
    let cancelled = false;
    void fetchConversationFeedback(conversationId).then((loaded) => {
      if (cancelled) return;
      setAvailable(loaded.available);
      if (loaded.available) setByMessageId(loaded.byMessageId);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const feedbackFor = useCallback(
    (messageId: string) => byMessageId[messageId] ?? null,
    [byMessageId],
  );

  const submit = useCallback(
    async (messageId: string, rating: AiFeedbackRating | 0, reasons: string[] = []) => {
      const previous = byMessageId[messageId] ?? null;
      const apply = (value: AiMessageFeedback | null) =>
        setByMessageId((current) => {
          const next = { ...current };
          if (value) next[messageId] = value;
          else delete next[messageId];
          return next;
        });

      apply(rating === 0 ? null : { rating, reasons });
      try {
        apply(await setAiMessageFeedback(messageId, rating, reasons));
      } catch (err) {
        apply(previous);
        toast.error(err instanceof Error ? err.message : "Couldn't save your feedback.");
      }
    },
    [byMessageId],
  );

  return { available, feedbackFor, submit };
}
