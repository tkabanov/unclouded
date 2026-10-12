import coachAvatar from "@/assets/coach-avatar.png";
import type { AiFeedbackRating, AiMessageFeedback } from "@/lib/chat/aiMessageFeedbackApi";
import { cn } from "@/lib/utils";

import { ChatMessageFeedback } from "./ChatMessageFeedback";
import type { ChatMessage } from "./types";

export type ChatMessageCellProps = {
  message: ChatMessage;
  /** NCLDD-55: when set, the assistant reply shows 👍 / 👎 controls. */
  feedback?: {
    value: AiMessageFeedback | null;
    onSubmit: (rating: AiFeedbackRating | 0, reasons?: string[]) => void;
  };
  className?: string;
};

/**
 * Lovable-style message row: user bubble on the right, assistant text with coach avatar.
 */
export function ChatMessageCell({ message, feedback, className }: ChatMessageCellProps) {
  if (message.role === "user") {
    return (
      <div className={cn("group flex w-full max-w-[95%] flex-col gap-2 is-user ml-auto justify-end", className)}>
        <div className="ml-auto flex w-fit min-w-0 max-w-full flex-col gap-2 overflow-hidden rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group flex w-full max-w-[95%] flex-col gap-2 is-assistant", className)}
    >
      <div className="flex w-fit min-w-0 max-w-full items-start gap-2">
        <img
          src={coachAvatar}
          alt=""
          width={28}
          height={28}
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-accent/50"
          loading="lazy"
        />
        <div className="min-w-0 text-sm text-foreground">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {feedback ? (
            <ChatMessageFeedback
              className="mt-1 -ml-1.5"
              feedback={feedback.value}
              onSubmit={feedback.onSubmit}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
