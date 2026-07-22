import { StickToBottom } from "use-stick-to-bottom";

import { cn } from "@/lib/utils";

import { ChatAssistantTypingCell } from "./ChatAssistantTypingCell";
import { ChatCommitmentPromptCell } from "./ChatCommitmentPromptCell";
import { ChatEmptyWelcome } from "./ChatEmptyWelcome";
import { ChatMessageCell } from "./ChatMessageCell";
import type { ChatMessage } from "./types";

export type ChatMessagesListProps = {
  messages: ChatMessage[];
  isAssistantTyping?: boolean;
  /** When set, this assistant message renders as the session-close commitment prompt. */
  commitmentPromptMessageId?: string | null;
  onSuggestionSend?: (text: string) => void;
  suggestionsDisabled?: boolean;
  className?: string;
};

/**
 * Scrollable message list with Lovable-style centered column and empty welcome state.
 */
export function ChatMessagesList({
  messages,
  isAssistantTyping = false,
  commitmentPromptMessageId = null,
  onSuggestionSend,
  suggestionsDisabled = false,
  className,
}: ChatMessagesListProps) {
  const showEmptyWelcome = messages.length === 0 && !isAssistantTyping;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <StickToBottom
        className="relative flex min-h-0 flex-1 overflow-y-hidden"
        initial="instant"
        resize="instant"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <StickToBottom.Content
          scrollClassName="[overflow-anchor:none] [scroll-behavior:auto]"
          className="flex min-h-full flex-col justify-end px-4 py-4"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {showEmptyWelcome ? (
              <ChatEmptyWelcome
                onSuggestionSend={onSuggestionSend}
                suggestionsDisabled={suggestionsDisabled}
              />
            ) : (
              messages.map((message) =>
                message.id === commitmentPromptMessageId ? (
                  <ChatCommitmentPromptCell key={message.id} message={message} />
                ) : (
                  <ChatMessageCell key={message.id} message={message} />
                ),
              )
            )}
            {isAssistantTyping ? <ChatAssistantTypingCell /> : null}
          </div>
        </StickToBottom.Content>
      </StickToBottom>
    </div>
  );
}
