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
  onNewSession?: () => void;
  newSessionDisabled?: boolean;
  newSessionLabel?: string;
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
  onNewSession,
  newSessionDisabled = false,
  newSessionLabel = "New session",
  className,
}: ChatHeaderProps) {
  const modeBadge =
    conversation.modeBadgeText || CHAT_CONVERSATION_DEFAULTS.modeBadgeText;

  const showActions = Boolean(onEndSession || onNewSession);

  return (
    <header
      className={cn(
        "flex w-full shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5",
        className,
      )}
    >
      <p className="min-w-0 truncate text-xs text-muted-foreground">{modeBadge}</p>

      {showActions ? (
        <div className="flex shrink-0 items-center gap-2">
          {onNewSession ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNewSession}
              disabled={newSessionDisabled}
            >
              {newSessionLabel}
            </Button>
          ) : null}
          {onEndSession ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEndSession}
              disabled={endSessionDisabled}
            >
              {endSessionLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
