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
        className={cn("flex w-full justify-end", className)}
      >
        <p
          data-style-ref="Text_body_"
          className={cn(
            bubbleStyle("Text_body_"),
            "max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground",
          )}
        >
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex w-full items-start gap-2", className)}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary"
      >
        <Cloud
          data-style-ref="Icon_default_"
          className={cn(bubbleStyle("Icon_default_"), "h-4 w-4")}
          aria-hidden
        />
      </div>

      <div
        className="flex min-w-0 max-w-[85%] flex-col gap-1 rounded-2xl bg-muted px-4 py-2.5"
      >
        <p
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "whitespace-pre-wrap text-sm")}
        >
          {message.content}
        </p>
        <p
          data-style-ref="Text_disclaimer_"
          className={bubbleStyle("Text_disclaimer_")}
        >
          {CHAT_ASSISTANT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
