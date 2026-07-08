import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChatConversationParam } from "@/hooks/useChatConversationParam";

/** bTIma LoggedOut workflow — clear active conversation param on sign-out. */
export function useChatSignOutClear() {
  const { user } = useAuth();
  const { conversationId, setConversationId } = useChatConversationParam();

  useEffect(() => {
    if (!user && conversationId) {
      setConversationId(null);
    }
  }, [conversationId, setConversationId, user]);
}
