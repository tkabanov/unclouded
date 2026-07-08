import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import { CHAT_ASSISTANT_DISCLAIMER, type ChatMessage } from "./types";

export type ChatMessageCellProps = {
  message: ChatMessage;
  className?: string;
};

/**
 * RepeatingGroup cell: user bubble (bTISQ) or assistant response (bTIUI).
 */
export function ChatMessageCell({ message, className }: ChatMessageCellProps) {
  if (message.role === "user") {
    return (
      <div
        data-bubble-id="bTISQ"
        className={cn("flex w-full justify-end", className)}
      >
        <p
          data-bubble-id="bTISS"
          data-style-ref="Text_body_"
          className={cn(
            bubbleStyle("Text_body_"),
            "max-w-[85%] rounded-2xl bg-[var(--color_primary_default)] px-4 py-2.5 text-[var(--color_primary_contrast_default)]",
          )}
        >
          {message.content_text}
        </p>
      </div>
    );
  }

  return (
    <div
      data-bubble-id="bTIUI"
      className={cn("flex w-full items-start gap-2", className)}
    >
      <div
        data-bubble-id="bTIUK"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color_aiRNbAaxgt_default)]"
      >
        <Cloud
          data-bubble-id="bTIUO"
          data-style-ref="Icon_default_"
          className={cn(bubbleStyle("Icon_default_"), "h-4 w-4")}
          aria-hidden
        />
      </div>

      <div
        data-bubble-id="bTIUP"
        className="flex min-w-0 max-w-[85%] flex-col gap-1 rounded-2xl bg-[var(--color_aiRNbAaxgr_default)] px-4 py-2.5"
      >
        <p
          data-bubble-id="bTIUQ"
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "whitespace-pre-wrap text-sm")}
        >
          {message.content_text}
        </p>
        <p
          data-bubble-id="bTIUU"
          data-style-ref="Text_disclaimer_"
          className={bubbleStyle("Text_disclaimer_")}
        >
          {CHAT_ASSISTANT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
