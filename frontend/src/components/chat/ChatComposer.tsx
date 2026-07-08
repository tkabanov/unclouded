import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

import {
  CHAT_COMPOSER_DEFAULTS,
  CHAT_COMPOSER_MODES,
  type ChatComposerMode,
} from "./types";

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  selectedMode?: ChatComposerMode;
  onModeSelect?: (mode: ChatComposerMode) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Group chat-input-area (bTITC): mode chips, caption + input, send button.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
  selectedMode,
  onModeSelect,
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
      data-bubble-id="bTITC"
      onSubmit={handleSubmit}
      className={cn(
        "flex w-full shrink-0 flex-col gap-3 border-t border-[var(--color_aiRNbAaxgw_default)] px-6 pb-4 pt-4",
        className,
      )}
    >
      <div
        data-bubble-id="bTITH"
        className="flex flex-wrap gap-2"
      >
        {CHAT_COMPOSER_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-bubble-id={mode.bubbleId}
            disabled={disabled}
            aria-pressed={selectedMode === mode.id}
            onClick={() => onModeSelect?.(mode.id)}
            className={cn(
              "min-h-10 rounded-full border border-[var(--color_aiRNbAaxgw_default)] bg-[var(--color_aiRNbAaxgr_default)] px-3 py-1 text-xs text-[var(--color_aiRNbAaxgs_default)] transition-colors",
              selectedMode === mode.id &&
                "border-[var(--color_primary_default)] text-[var(--color_text_default)]",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div
        data-bubble-id="bTITS"
        className="flex items-end gap-2"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label
            htmlFor="chat-composer-input"
            data-bubble-id="bTITU"
            data-style-ref="Text_caption_"
            className={bubbleStyle("Text_caption_")}
          >
            {CHAT_COMPOSER_DEFAULTS.input_caption}
          </label>
          <input
            id="chat-composer-input"
            type="text"
            data-bubble-id="bTITY"
            data-style-ref="Input_default_"
            value={value}
            disabled={disabled}
            placeholder={CHAT_COMPOSER_DEFAULTS.input_placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={cn(
              bubbleStyle("Input_default_"),
              "w-full text-sm outline-none focus:ring-1 focus:ring-[var(--color_primary_default)]",
            )}
          />
        </div>

        <button
          type="submit"
          data-bubble-id="bTITZ"
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
