import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ConversationThreadCell from "@/components/chat/ConversationThreadCell";
import { useEmptyConversationBootstrap } from "@/hooks/useEmptyConversationBootstrap";
import {
  fetchConversations,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { useChatConversationParam } from "@/lib/chat/chatRouteStore";
import { cn } from "@/lib/utils";

export interface ConversationSidebarProps {
  userId: string | undefined;
  onboardingData?: Record<string, unknown> | null;
  tier?: string | null;
  subscribed?: boolean | null;
  onRenameRequest: (conversation: ConversationListItem) => void;
  onDeleteRequest: (conversation: ConversationListItem) => void;
  listVersion?: number;
  className?: string;
}

export default function ConversationSidebar({
  userId,
  onboardingData,
  tier,
  subscribed,
  onRenameRequest,
  onDeleteRequest,
  listVersion = 0,
  className,
}: ConversationSidebarProps) {
  const { conversationId, setConversationId } = useChatConversationParam();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const rows = await fetchConversations(userId, onboardingData ?? null);
      setConversations(rows);
    } catch {
      if (!options?.silent) {
        toast.error("Couldn't load conversations. Please try again.");
      }
      if (!options?.silent) {
        setConversations([]);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [onboardingData, userId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (listVersion > 0) {
      void loadConversations({ silent: true });
    }
  }, [listVersion, loadConversations]);

  useEmptyConversationBootstrap({
    userId,
    conversations,
    loading,
    onboardingData,
    tier,
    subscribed,
    setConversationId,
    onBootstrapped: loadConversations,
  });

  const handleSelect = useCallback(
    (conversation: ConversationListItem) => {
      setConversationId(conversation.id);
    },
    [setConversationId],
  );

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {loading ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">Starting your first chat…</p>
        ) : (
          conversations.map((conversation) => (
            <ConversationThreadCell
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === conversationId}
              onSelect={handleSelect}
              onRenameRequest={onRenameRequest}
              onDeleteRequest={onDeleteRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}
