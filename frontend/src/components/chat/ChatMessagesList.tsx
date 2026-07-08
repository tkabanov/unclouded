import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import { ChatMessageCell } from "./ChatMessageCell";
import type { ChatMessage } from "./types";

export type ChatMessagesListProps = {
  messages: ChatMessage[];
  className?: string;
};

/**
 * Group chat-messages-area (bTISK): scrollable RepeatingGroup bTISM of message cells.
 */
export function ChatMessagesList({ messages, className }: ChatMessagesListProps) {
  return (
    <div
      data-bubble-id="bTISK"
      data-style-ref="Group_transparent_"
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <div
        data-bubble-id="bTISM"
        data-style-ref="RepeatingGroup_list_"
        className={cn(
          bubbleStyle("RepeatingGroup_list_"),
          "flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4",
        )}
      >
        {messages.map((message) => (
          <ChatMessageCell key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
