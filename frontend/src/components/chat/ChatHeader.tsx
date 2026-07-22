import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  CHAT_CONVERSATION_DEFAULTS,
  type ChatConversation,
} from "./types";

export type ChatHeaderProps = {
  conversation: ChatConversation;
  onEndSession?: () => void;
  endSessionDisabled?: boolean;
  endSessionLabel?: string;
  className?: string;
};

/**
 * Minimal session toolbar — End session only (Lovable has no in-thread title bar).
 */
export function ChatHeader({
  conversation,
  onEndSession,
  endSessionDisabled = false,
  endSessionLabel = "End session",
  className,
}: ChatHeaderProps) {
  const modeBadge =
    conversation.modeBadgeText || CHAT_CONVERSATION_DEFAULTS.modeBadgeText;

  return (
    <header
      className={cn(
        "flex w-full shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5",
        className,
      )}
    >
      <p className="min-w-0 truncate text-xs text-muted-foreground">{modeBadge}</p>

      {onEndSession ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEndSession}
          disabled={endSessionDisabled}
          className="shrink-0"
        >
          {endSessionLabel}
        </Button>
      ) : null}
    </header>
  );
}
