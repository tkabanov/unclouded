import { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import coachAvatar from "@/assets/coach-avatar.png";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

interface ChatWindowProps {
  threadId: string;
  initialMessages: UIMessage[];
  context?: string;
  onMessagesChange: (messages: UIMessage[]) => void;
}

const STARTERS = [
  "I'm feeling stretched thin lately.",
  "Help me think through a decision.",
  "I want to reset my week.",
  "Something's been weighing on me.",
];

export default function ChatWindow({
  threadId,
  initialMessages,
  context,
  onMessagesChange,
}: ChatWindowProps) {
  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: CHAT_ENDPOINT,
      body: context ? { context } : undefined,
    }),
    onError: (error) => {
      const message = error?.message ?? "";
      if (message.includes("429")) {
        toast.error("You're sending messages a bit fast — please wait a moment and try again.");
      } else if (message.includes("402")) {
        toast.error("AI credits are exhausted. Add credits in Settings → Plans & credits to continue.");
      } else {
        toast.error("Something went wrong reaching your coach. Please try again.");
      }
    },
  });

  useEffect(() => {
    onMessagesChange(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            <ConversationEmptyState className="py-16">
              <img
                src={coachAvatar}
                alt="Uncloud360 coach"
                width={64}
                height={64}
                className="h-16 w-16"
              />
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-semibold text-foreground">How are you, really?</h3>
                <p className="text-sm text-muted-foreground">
                  Share what's on your mind. Your coach listens without judgment and helps you find one clear next step.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground hover:bg-accent/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>

          ) : (
            messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              return (
                <Message key={message.id} from={message.role}>
                  {message.role === "assistant" && (
                    <img
                      src={coachAvatar}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 shrink-0 rounded-full bg-accent/50 mt-0.5"
                      loading="lazy"
                    />
                  )}
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{text}</MessageResponse>
                    ) : (
                      <p className="whitespace-pre-wrap">{text}</p>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <img
                src={coachAvatar}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full bg-accent/50 mt-0.5"
                loading="lazy"
              />
              <MessageContent>
                <p className="text-sm text-muted-foreground animate-pulse">Thinking…</p>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-card/60 px-4 py-3">
        <div className="max-w-3xl mx-auto w-full">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              placeholder="Share what's on your mind…"
              disabled={isBusy}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Uncloud360 is AI coaching only — not therapy or medical care. In an emergency, call 911 or text 988.
          </p>
        </div>
      </div>
    </div>
  );
}
