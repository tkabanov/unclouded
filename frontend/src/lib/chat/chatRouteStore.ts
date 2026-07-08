import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { CONVERSATION_SEARCH_PARAM } from "@/lib/chat/routes";

export function useChatConversationParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const conversationId = searchParams.get(CONVERSATION_SEARCH_PARAM);

  const setConversationId = useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set(CONVERSATION_SEARCH_PARAM, id);
          } else {
            next.delete(CONVERSATION_SEARCH_PARAM);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { conversationId, setConversationId };
}
