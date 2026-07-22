import type { FormEvent, ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  CHAT_COMMITMENT_COMPOSER,
  CHAT_COMPOSER_DEFAULTS,
} from "./types";

export type ChatComposerInputMode = "default" | "commitment";

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  leadingSlot?: ReactNode;
  mode?: ChatComposerInputMode;
  className?: string;
};

/**
 * Lovable-style composer: single input row with send button.
 */
export function ChatComposer({
  value,
  onChange,
  onSend,
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
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div
        className={cn(
          "flex items-end gap-2 rounded-xl border bg-background px-3 py-2",
          isCommitmentMode ? "border-primary/30 bg-primary/5" : "border-border",
        )}
      >
        {leadingSlot}
        <input
          id="chat-composer-input"
          type="text"
          value={value}
          disabled={disabled}
          placeholder={copy.input_placeholder}
          aria-describedby={isCommitmentMode ? "chat-commitment-hint" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="icon"
          variant="cta"
          disabled={disabled || !value.trim()}
          className="h-8 w-8 shrink-0 rounded-lg"
          aria-label={copy.send_label}
        >
          <ArrowUp className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {isCommitmentMode ? (
        <p id="chat-commitment-hint" className="mt-2 text-xs text-muted-foreground">
          Kota will briefly acknowledge your commitment, then save the session.
        </p>
      ) : null}
    </form>
  );
}
