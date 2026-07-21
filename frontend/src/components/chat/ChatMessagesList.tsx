import { StickToBottom } from "use-stick-to-bottom";

import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import { ChatAssistantTypingCell } from "./ChatAssistantTypingCell";
import { ChatCommitmentPromptCell } from "./ChatCommitmentPromptCell";
import { ChatMessageCell } from "./ChatMessageCell";
import type { ChatMessage } from "./types";

export type ChatMessagesListProps = {
  messages: ChatMessage[];
  isAssistantTyping?: boolean;
  /** When set, this assistant message renders as the session-close commitment prompt. */
  commitmentPromptMessageId?: string | null;
  className?: string;
};

/**
 * Group chat-messages-area (bTISK): scrollable RepeatingGroup bTISM of message cells.
 * Telegram-style — newest at bottom, viewport pinned to bottom without smooth scroll.
 */
export function ChatMessagesList({
  messages,
  isAssistantTyping = false,
  commitmentPromptMessageId = null,
  className,
}: ChatMessagesListProps) {
  return (
    <div
      data-style-ref="Group_transparent_"
      className={cn(
        bubbleStyle("Group_transparent_"),
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <StickToBottom
        className="relative flex min-h-0 flex-1 overflow-y-hidden"
        initial="instant"
        resize="instant"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <StickToBottom.Content
          data-style-ref="RepeatingGroup_list_"
          scrollClassName="[overflow-anchor:none] [scroll-behavior:auto]"
          className={cn(
            bubbleStyle("RepeatingGroup_list_"),
            "flex min-h-full flex-col justify-end gap-4 px-4 py-4",
          )}
        >
          {messages.map((message) =>
            message.id === commitmentPromptMessageId ? (
              <ChatCommitmentPromptCell key={message.id} message={message} />
            ) : (
              <ChatMessageCell key={message.id} message={message} />
            ),
          )}
          {isAssistantTyping ? <ChatAssistantTypingCell /> : null}
        </StickToBottom.Content>
      </StickToBottom>
    </div>
  );
}
