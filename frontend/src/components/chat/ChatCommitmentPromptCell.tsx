import coachAvatar from "@/assets/coach-avatar.png";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import { CHAT_ASSISTANT_DISCLAIMER, type ChatMessage } from "./types";

export type ChatCommitmentPromptCellProps = {
  message: ChatMessage;
  className?: string;
};

/**
 * Session-close message — visually distinct from regular coach replies so users
 * know this turn asks for their micro-commitment, not ongoing coaching.
 */
export function ChatCommitmentPromptCell({ message, className }: ChatCommitmentPromptCellProps) {
  return (
    <div
      className={cn("flex w-full items-start gap-2", className)}
      role="article"
      aria-label="Session closing — your commitment is needed"
    >
      <img
        src={coachAvatar}
        alt=""
        width={28}
        height={28}
        className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-accent/50 ring-2 ring-primary/30"
        loading="lazy"
      />

      <div className="flex min-w-0 max-w-[92%] flex-col gap-3 rounded-2xl border-2 border-primary/35 bg-primary/5 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
            <Target className="h-3 w-3" aria-hidden />
            Before we close
          </span>
          <span className="text-xs text-muted-foreground">One step from finishing this session</span>
        </div>

        <p
          data-style-ref="Text_body_"
          className={cn(bubbleStyle("Text_body_"), "whitespace-pre-wrap text-sm text-foreground")}
        >
          {message.content}
        </p>

        <div className="rounded-xl border border-dashed border-primary/40 bg-background/80 px-3 py-2.5">
          <p className="text-xs font-semibold text-primary">Your turn</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Reply with one specific thing you&apos;ll do before you talk again — what, and when if you
            can. If nothing feels possible, say that honestly; that counts too.
          </p>
        </div>

        <p
          data-style-ref="Text_disclaimer_"
          className={cn(bubbleStyle("Text_disclaimer_"), "text-[11px]")}
        >
          {CHAT_ASSISTANT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
