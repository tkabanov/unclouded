import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { ChatCommitmentAwaitingBanner } from "./ChatCommitmentAwaitingBanner";
import { ChatComposer, type ChatComposerProps } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatMessagesList } from "./ChatMessagesList";
import { CHAT_COMPOSER_DISCLAIMER } from "./types";
import type { ChatConversation, ChatMessage } from "./types";

export type ChatReusableProps = {
  conversation: ChatConversation;
  messages: ChatMessage[];
  composerValue: string;
  onComposerChange: ChatComposerProps["onChange"];
  onSend: ChatComposerProps["onSend"];
  onSuggestionSend?: (text: string) => void;
  composerDisabled?: boolean;
  composerLeadingSlot?: ReactNode;
  isAssistantTyping?: boolean;
  onEndSession?: () => void;
  endSessionDisabled?: boolean;
  endSessionLabel?: string;
  awaitingCommitment?: boolean;
  commitmentPromptMessageId?: string | null;
  className?: string;
};

/**
 * Lovable-style chat shell: optional session header, messages, composer with footer disclaimer.
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
  onEndSession,
  endSessionDisabled,
  endSessionLabel,
  awaitingCommitment = false,
  commitmentPromptMessageId = null,
  className,
}: ChatReusableProps) {
  return (
    <section className={cn("flex h-full min-h-0 flex-col", className)}>
      {onEndSession ? (
        <ChatHeader
          conversation={conversation}
          onEndSession={onEndSession}
          endSessionDisabled={endSessionDisabled}
          endSessionLabel={endSessionLabel}
        />
      ) : null}

      <ChatMessagesList
        messages={messages}
        isAssistantTyping={isAssistantTyping}
        commitmentPromptMessageId={commitmentPromptMessageId}
        onSuggestionSend={onSuggestionSend}
        suggestionsDisabled={composerDisabled}
      />

      <div className="relative shrink-0 border-t border-border bg-card/60 px-4 py-3">
        {awaitingCommitment ? <ChatCommitmentAwaitingBanner channel="text" /> : null}
        <div className="mx-auto w-full max-w-3xl">
          <ChatComposer
            value={composerValue}
            onChange={onComposerChange}
            onSend={onSend}
            disabled={composerDisabled}
            leadingSlot={composerLeadingSlot}
            mode={awaitingCommitment ? "commitment" : "default"}
          />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {CHAT_COMPOSER_DISCLAIMER}
          </p>
        </div>
      </div>
    </section>
  );
}
