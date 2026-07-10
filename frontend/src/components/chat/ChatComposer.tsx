import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import { CHAT_COMPOSER_DEFAULTS, CHAT_COMPOSER_MODES } from "./types";

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSuggestionSend?: (text: string) => void;
  disabled?: boolean;
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
  className,
}: ChatComposerProps) {
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
        "flex w-full shrink-0 flex-col gap-3 border-t border-border px-6 pb-4 pt-4",
        className,
      )}
    >
      <div className="flex flex-wrap gap-2">
        {CHAT_COMPOSER_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onSuggestionSend?.(mode.label)}
            className={cn(
              "min-h-10 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor="chat-composer-input"
            data-style-ref="Text_caption_"
            className={bubbleStyle("Text_caption_")}
          >
            {CHAT_COMPOSER_DEFAULTS.input_caption}
          </label>
          <input
            id="chat-composer-input"
            type="text"
            data-style-ref="Input_default_"
            value={value}
            disabled={disabled}
            placeholder={CHAT_COMPOSER_DEFAULTS.input_placeholder}
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
          {CHAT_COMPOSER_DEFAULTS.send_label}
        </button>
      </div>
    </form>
  );
}
