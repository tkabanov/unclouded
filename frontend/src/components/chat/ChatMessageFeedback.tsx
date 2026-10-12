import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import type { AiFeedbackRating, AiMessageFeedback } from "@/lib/chat/aiMessageFeedbackApi";
import { cn } from "@/lib/utils";

import {
  AI_FEEDBACK_NEGATIVE_REASONS,
  AI_FEEDBACK_POSITIVE_REASONS,
} from "../../../../supabase/functions/_shared/aiInsights/taxonomy.ts";

export type ChatMessageFeedbackProps = {
  feedback: AiMessageFeedback | null;
  onSubmit: (rating: AiFeedbackRating | 0, reasons?: string[]) => void;
  className?: string;
};

/**
 * NCLDD-55 — 👍 / 👎 under a Kota reply. Picking a rating reveals optional reason chips;
 * clicking the active rating again clears it.
 */
export function ChatMessageFeedback({ feedback, onSubmit, className }: ChatMessageFeedbackProps) {
  const [showReasons, setShowReasons] = useState(false);
  const rating = feedback?.rating ?? null;
  const reasons = feedback?.reasons ?? [];
  const reasonOptions = rating === 1 ? AI_FEEDBACK_POSITIVE_REASONS : AI_FEEDBACK_NEGATIVE_REASONS;
  const selectedLabels = reasonOptions
    .filter((option) => reasons.includes(option.key))
    .map((option) => option.label);

  const rate = (next: AiFeedbackRating) => {
    if (rating === next) {
      setShowReasons(false);
      onSubmit(0);
      return;
    }
    setShowReasons(true);
    onSubmit(next);
  };

  const toggleReason = (key: string) => {
    if (rating === null) return;
    const nextReasons = reasons.includes(key)
      ? reasons.filter((reason) => reason !== key)
      : [...reasons, key];
    onSubmit(rating, nextReasons);
  };

  const iconButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className={cn(iconButton, rating === 1 && "text-primary")}
          aria-label="Helpful"
          aria-pressed={rating === 1}
          onClick={() => rate(1)}
        >
          <ThumbsUp className="h-3.5 w-3.5" fill={rating === 1 ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          className={cn(iconButton, rating === -1 && "text-primary")}
          aria-label="Not helpful"
          aria-pressed={rating === -1}
          onClick={() => rate(-1)}
        >
          <ThumbsDown className="h-3.5 w-3.5" fill={rating === -1 ? "currentColor" : "none"} />
        </button>
        {!showReasons && rating !== null ? (
          <button
            type="button"
            className="ml-1 px-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setShowReasons(true)}
          >
            {selectedLabels.length ? selectedLabels.join(", ") : "Add reason"}
          </button>
        ) : null}
      </div>

      {showReasons && rating !== null ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Feedback reasons">
          {reasonOptions.map((option) => {
            const selected = reasons.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleReason(option.key)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className="px-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setShowReasons(false)}
          >
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
