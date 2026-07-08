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
  selectedMode?: ChatComposerProps["selectedMode"];
  onModeSelect?: ChatComposerProps["onModeSelect"];
  composerDisabled?: boolean;
  disclaimerCollapsed?: boolean;
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
  selectedMode,
  onModeSelect,
  composerDisabled,
  disclaimerCollapsed,
  className,
}: ChatReusableProps) {
  return (
    <section
      data-bubble-id="bTIRW"
      className={cn("flex h-full min-h-0 flex-col", className)}
    >
      <ChatHeader conversation={conversation} />

      <ChatMessagesList messages={messages} />

      <div className="relative shrink-0">
        <ChatFloatingDisclaimer collapsed={disclaimerCollapsed} />
        <ChatComposer
          value={composerValue}
          onChange={onComposerChange}
          onSend={onSend}
          selectedMode={selectedMode}
          onModeSelect={onModeSelect}
          disabled={composerDisabled}
        />
      </div>
    </section>
  );
}
