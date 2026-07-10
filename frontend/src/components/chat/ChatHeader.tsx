import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";
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
 * Group chat-panel-header (bTIRb): title left, coaching disclaimer badge right.
 */
export function ChatHeader({
  conversation,
  onEndSession,
  endSessionDisabled = false,
  endSessionLabel = "End session",
  className,
}: ChatHeaderProps) {
  const title = conversation.title || CHAT_CONVERSATION_DEFAULTS.title;
  const modeBadge =
    conversation.modeBadgeText || CHAT_CONVERSATION_DEFAULTS.modeBadgeText;
  const disclaimerBadge =
    conversation.disclaimerBadgeText ||
    CHAT_CONVERSATION_DEFAULTS.disclaimerBadgeText;

  return (
    <header
      className={cn(
        "flex w-full shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <h2
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "text-lg font-semibold")}
        >
          {title}
        </h2>
        <p
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "text-xs text-muted-foreground")}
        >
          {modeBadge}
        </p>
      </div>

      <div
        className="flex shrink-0 items-center gap-2"
      >
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
        <div
          data-style-ref="Group_badge_accent_"
          className={cn(
            bubbleStyle("Group_badge_accent_"),
            "inline-flex items-center gap-1.5",
          )}
        >
          <Info
            data-style-ref="Icon_default_"
            className={cn(bubbleStyle("Icon_default_"), "h-3.5 w-3.5 shrink-0")}
            aria-hidden
          />
          <span
            className={cn(bubbleStyle("Text_small_"), "whitespace-nowrap")}
          >
            {disclaimerBadge}
          </span>
        </div>
      </div>
    </header>
  );
}
