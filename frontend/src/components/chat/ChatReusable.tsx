import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ChatComposer, type ChatComposerProps } from "./ChatComposer";
import { ChatFloatingDisclaimer } from "./ChatFloatingDisclaimer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessagesList } from "./ChatMessagesList";
import type { ChatConversation, ChatMessage } from "./types";

export type ChatReusableProps = {
  conversation: ChatConversation;
  messages: ChatMessage[];
  composerValue: string;
  onComposerChange: ChatComposerProps["onChange"];
  onSend: ChatComposerProps["onSend"];
  onSuggestionSend?: ChatComposerProps["onSuggestionSend"];
  composerDisabled?: boolean;
  composerLeadingSlot?: ReactNode;
  isAssistantTyping?: boolean;
  disclaimerCollapsed?: boolean;
  onEndSession?: () => void;
  endSessionDisabled?: boolean;
  endSessionLabel?: string;
  className?: string;
};

/**
 * RE - chat shell (bTIRW): header, messages, composer, floating disclaimer.
 */
export function ChatReusable({
  conversation,
  messages,
  composerValue,
  onComposerChange,
  onSend,
  onSuggestionSend,
  composerDisabled,
  composerLeadingSlot,
  isAssistantTyping,
  disclaimerCollapsed,
  onEndSession,
  endSessionDisabled,
  endSessionLabel,
  className,
}: ChatReusableProps) {
  return (
    <section
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      <ChatHeader
        conversation={conversation}
        onEndSession={onEndSession}
        endSessionDisabled={endSessionDisabled}
        endSessionLabel={endSessionLabel}
      />

      <ChatMessagesList messages={messages} isAssistantTyping={isAssistantTyping} />

      <div className="relative shrink-0">
        <ChatFloatingDisclaimer collapsed={disclaimerCollapsed} />
        <ChatComposer
          value={composerValue}
          onChange={onComposerChange}
          onSend={onSend}
          onSuggestionSend={onSuggestionSend}
          disabled={composerDisabled}
          leadingSlot={composerLeadingSlot}
        />
      </div>
    </section>
  );
}
