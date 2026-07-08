import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatReusable } from "./ChatReusable";
import type { ChatComposerMode } from "./types";
import { CHAT_CONVERSATION_DEFAULTS, type ChatConversation, type ChatMessage } from "./types";
import {
  fetchConversations,
  type ConversationListItem,
} from "@/lib/chat/chatConversationsApi";
import { fetchMessagesForConversation } from "@/lib/chat/chatMessagesApi";
import { CHAT_PANEL_MOUNT_BUBBLE_ID } from "@/lib/chat/routes";
import { cn } from "@/lib/utils";

export interface ChatPanelMountProps {
  conversationId: string;
  userId: string;
  onboardingData?: Record<string, unknown> | null;
  /** Bump when sidebar list changes so title/metadata can refresh. */
  listVersion?: number;
  className?: string;
}

/**
 * CHAT-03 — mount DS-06 ChatReusable at CustomElement bTIUt with conversation binding.
 */
export default function ChatPanelMount({
  conversationId,
  userId,
  onboardingData,
  listVersion = 0,
  className,
}: ChatPanelMountProps) {
  const [conversationMeta, setConversationMeta] = useState<ConversationListItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [selectedMode, setSelectedMode] = useState<ChatComposerMode | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [conversations, nextMessages] = await Promise.all([
          fetchConversations(userId, onboardingData),
          fetchMessagesForConversation(conversationId),
        ]);
        if (cancelled) return;
        setConversationMeta(conversations.find((row) => row.id === conversationId) ?? null);
        setMessages(nextMessages);
      } catch {
        if (!cancelled) {
          setConversationMeta(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId, listVersion, onboardingData, userId]);

  const conversation: ChatConversation = useMemo(
    () => ({
      title: conversationMeta?.title_text ?? CHAT_CONVERSATION_DEFAULTS.title,
      mode_badge_text: CHAT_CONVERSATION_DEFAULTS.mode_badge_text,
      disclaimer_badge_text: CHAT_CONVERSATION_DEFAULTS.disclaimer_badge_text,
    }),
    [conversationMeta?.title_text],
  );

  const handleSend = useCallback(() => {
    const text = composerValue.trim();
    if (!text) return;
    // CHAT-05 wires Supabase insert + AI reply; optimistic UI stub for panel mount.
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content_text: text },
    ]);
    setComposerValue("");
  }, [composerValue]);

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
          onSend={handleSend}
          selectedMode={selectedMode}
          onModeSelect={setSelectedMode}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}
