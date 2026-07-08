import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChatReusable } from "./ChatReusable";
import type { ChatConversation, ChatMessage } from "./types";
import { CHAT_CONVERSATION_DEFAULTS } from "./types";
import {
  fetchConversations,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import {
  fetchMessagesForConversation,
  sendMessageWithAiReply,
} from "@/lib/chat/chatMessagesApi";
import { CHAT_PANEL_MOUNT_BUBBLE_ID } from "@/lib/chat/routes";
import { useCoachingModeUpdate } from "@/hooks/useCoachingModeUpdate";
import { cn } from "@/lib/utils";

export interface ChatPanelMountProps {
  conversationId: string;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  context?: string;
  listVersion?: number;
  onThreadUpdated?: () => void;
  className?: string;
}

/**
 * CHAT-03/05 — mount DS-06 ChatReusable at bTIUt with messaging API wiring.
 */
export default function ChatPanelMount({
  conversationId,
  userId,
  onboardingData,
  context,
  listVersion = 0,
  onThreadUpdated,
  className,
}: ChatPanelMountProps) {
  const [conversationMeta, setConversationMeta] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { selectedMode, modeBadgeText, onModeSelect } = useCoachingModeUpdate();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [conversations, nextMessages] = await Promise.all([
        fetchConversations(userId, onboardingData),
        fetchMessagesForConversation(conversationId, onboardingData),
      ]);
      setConversationMeta(conversations.find((row) => row.id === conversationId) ?? null);
      setMessages(nextMessages);
    } catch {
      setConversationMeta(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, onboardingData, userId]);

  useEffect(() => {
    void reload();
  }, [reload, listVersion]);

  const conversation: ChatConversation = useMemo(
    () => ({
      title: conversationMeta?.title_text ?? CHAT_CONVERSATION_DEFAULTS.title,
      mode_badge_text: modeBadgeText,
      disclaimer_badge_text: CHAT_CONVERSATION_DEFAULTS.disclaimer_badge_text,
    }),
    [conversationMeta?.title_text, modeBadgeText],
  );

  const handleSend = useCallback(async () => {
    const text = composerValue.trim();
    if (!text || sending) return;

    setSending(true);
    setComposerValue("");
    try {
      const nextMessages = await sendMessageWithAiReply({
        conversationId,
        userId,
        content: text,
        onboardingData,
        context,
        priorMessages: messages,
      });
      setMessages(nextMessages);
      onThreadUpdated?.();
    } catch {
      toast.error("Couldn't send your message. Please try again.");
      setComposerValue(text);
    } finally {
      setSending(false);
    }
  }, [
    composerValue,
    context,
    conversationId,
    messages,
    onboardingData,
    onThreadUpdated,
    sending,
    userId,
  ]);

  return (
    <div
      data-bubble-id={CHAT_PANEL_MOUNT_BUBBLE_ID}
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading conversation…
        </div>
      ) : (
        <ChatReusable
          conversation={conversation}
          messages={messages}
          composerValue={composerValue}
          onComposerChange={setComposerValue}
          onSend={() => void handleSend()}
          selectedMode={selectedMode}
          onModeSelect={onModeSelect}
          composerDisabled={sending}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
