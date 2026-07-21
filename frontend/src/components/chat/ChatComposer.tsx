import type { FormEvent, ReactNode } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  CHAT_COMMITMENT_COMPOSER,
  CHAT_COMPOSER_DEFAULTS,
  CHAT_COMPOSER_MODES,
} from "./types";

export type ChatComposerInputMode = "default" | "commitment";

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSuggestionSend?: (text: string) => void;
  disabled?: boolean;
  leadingSlot?: ReactNode;
  mode?: ChatComposerInputMode;
  className?: string;
};

/**
 * Group chat-input-area (bTITC): suggestion chips, caption + input, send button.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  onSuggestionSend,
  disabled = false,
  leadingSlot,
  mode = "default",
  className,
}: ChatComposerProps) {
  const isCommitmentMode = mode === "commitment";
  const copy = isCommitmentMode ? CHAT_COMMITMENT_COMPOSER : CHAT_COMPOSER_DEFAULTS;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!disabled && value.trim()) {
      onSend();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full shrink-0 flex-col gap-3 border-t px-6 pb-4 pt-4",
        isCommitmentMode ? "border-primary/30 bg-primary/5" : "border-border",
        className,
      )}
    >
      {!isCommitmentMode ? (
        <div className="flex flex-wrap gap-2">
          {CHAT_COMPOSER_MODES.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              disabled={disabled}
              onClick={() => onSuggestionSend?.(suggestion.label)}
              className={cn(
                "min-h-10 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        {leadingSlot}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor="chat-composer-input"
            data-style-ref="Text_caption_"
            className={bubbleStyle("Text_caption_")}
          >
            {copy.input_caption}
          </label>
          <input
            id="chat-composer-input"
            type="text"
            data-style-ref="Input_default_"
            value={value}
            disabled={disabled}
            placeholder={copy.input_placeholder}
            aria-describedby={isCommitmentMode ? "chat-commitment-hint" : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
              bubbleStyle("Input_default_"),
              "w-full text-sm outline-none focus:ring-1 focus:ring-primary",
            )}
          />
        </div>

        <button
          type="submit"
          data-style-ref="Button_primary_"
          disabled={disabled || !value.trim()}
          className={cn(
            bubbleStyle("Button_primary_"),
            "inline-flex shrink-0 items-center gap-2",
          )}
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          {copy.send_label}
        </button>
      </div>
      {isCommitmentMode ? (
        <p id="chat-commitment-hint" className="text-xs text-muted-foreground">
          Kota will briefly acknowledge your commitment, then save the session.
        </p>
      ) : null}
    </form>
  );
}
