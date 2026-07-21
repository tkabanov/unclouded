import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ChatCommitmentAwaitingBanner } from "./ChatCommitmentAwaitingBanner";
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
  awaitingCommitment?: boolean;
  commitmentPromptMessageId?: string | null;
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
  awaitingCommitment = false,
  commitmentPromptMessageId = null,
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

      <ChatMessagesList
        messages={messages}
        isAssistantTyping={isAssistantTyping}
        commitmentPromptMessageId={commitmentPromptMessageId}
      />

      <div className="relative shrink-0">
        {awaitingCommitment ? <ChatCommitmentAwaitingBanner channel="text" /> : null}
        <ChatFloatingDisclaimer collapsed={disclaimerCollapsed} />
        <ChatComposer
          value={composerValue}
          onChange={onComposerChange}
          onSend={onSend}
          onSuggestionSend={onSuggestionSend}
          disabled={composerDisabled}
          leadingSlot={composerLeadingSlot}
          mode={awaitingCommitment ? "commitment" : "default"}
        />
      </div>
    </section>
  );
}
