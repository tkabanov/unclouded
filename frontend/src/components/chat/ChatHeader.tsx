import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  CHAT_CONVERSATION_DEFAULTS,
  type ChatConversation,
} from "./types";

export type ChatHeaderProps = {
  conversation: ChatConversation;
  className?: string;
};

/**
 * Group chat-panel-header (bTIRb): title left, coaching disclaimer badge right.
 */
export function ChatHeader({ conversation, className }: ChatHeaderProps) {
  const title = conversation.title || CHAT_CONVERSATION_DEFAULTS.title;
  const modeBadge =
    conversation.mode_badge_text || CHAT_CONVERSATION_DEFAULTS.mode_badge_text;
  const disclaimerBadge =
    conversation.disclaimer_badge_text ||
    CHAT_CONVERSATION_DEFAULTS.disclaimer_badge_text;

  return (
    <header
      data-bubble-id="bTIRb"
      className={cn(
        "flex w-full shrink-0 items-center justify-between gap-4 border-b border-[var(--color_aiRNbAaxgw_default)] px-4 py-3",
        className,
      )}
    >
      <div
        data-bubble-id="bTIRg"
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <h2
          data-bubble-id="bTIRh"
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "text-lg font-semibold")}
        >
          {title}
        </h2>
        <p
          data-bubble-id="bTIRi"
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "text-xs text-[var(--color_aiRNbAaxgs_default)]")}
        >
          {modeBadge}
        </p>
      </div>

      <div
        data-bubble-id="bTIRm"
        className="flex shrink-0 items-center"
      >
        <div
          data-bubble-id="bTIRn"
          data-style-ref="Group_badge_accent_"
          className={cn(
            bubbleStyle("Group_badge_accent_"),
            "inline-flex items-center gap-1.5",
          )}
        >
          <Info
            data-bubble-id="bTIRo"
            data-style-ref="Icon_default_"
            className={cn(bubbleStyle("Icon_default_"), "h-3.5 w-3.5 shrink-0")}
            aria-hidden
          />
          <span
            data-bubble-id="bTIRs"
            className={cn(bubbleStyle("Text_small_"), "whitespace-nowrap")}
          >
            {disclaimerBadge}
          </span>
        </div>
      </div>
    </header>
  );
}
