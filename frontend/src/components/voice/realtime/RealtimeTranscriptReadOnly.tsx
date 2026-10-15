import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessagesList } from "@/components/chat/ChatMessagesList";
import type { ChatMessage } from "@/components/chat/types";
import { fetchMessagesForConversation } from "@/lib/chat/chatMessagesApi";
import { cn } from "@/lib/utils";

export interface RealtimeTranscriptReadOnlyProps {
  conversationId: string;
  onboardingData?: Record<string, unknown> | null;
  className?: string;
}

/** NCLDD-57 — a finished Conversation-mode session in history: read-only transcript + 👍/👎. */
export default function RealtimeTranscriptReadOnly({
  conversationId,
  onboardingData,
  className,
}: RealtimeTranscriptReadOnlyProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    setFailed(false);
    fetchMessagesForConversation(conversationId, onboardingData)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId, onboardingData]);

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <AudioLines className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <h2 className="truncate text-sm font-semibold text-foreground">Voice conversation transcript</h2>
        </div>
        <Button type="button" size="sm" onClick={() => navigate("/coaching/voice?mode=conversation")}>
          Start a new conversation
        </Button>
      </div>
      {failed ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Couldn't load this conversation.
        </div>
      ) : messages === null ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading conversation…</div>
      ) : (
        <ChatMessagesList messages={messages} feedbackConversationId={conversationId} />
      )}
    </div>
  );
}
