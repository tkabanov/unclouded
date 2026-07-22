import coachAvatar from "@/assets/coach-avatar.png";
import { cn } from "@/lib/utils";

import { CHAT_WELCOME_SUGGESTIONS } from "./types";

export type ChatEmptyWelcomeProps = {
  onSuggestionSend?: (text: string) => void;
  suggestionsDisabled?: boolean;
  className?: string;
};

/**
 * Lovable empty-thread welcome: coach avatar, headline, and quick-start chips.
 */
export function ChatEmptyWelcome({
  onSuggestionSend,
  suggestionsDisabled = false,
  className,
}: ChatEmptyWelcomeProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className,
      )}
    >
      <img
        src={coachAvatar}
        alt="Unclouded coach"
        width={64}
        height={64}
        className="h-16 w-16"
      />

      <div className="max-w-md space-y-1">
        <h3 className="text-lg font-semibold text-foreground">How are you, really?</h3>
        <p className="text-sm text-muted-foreground">
          Share what&apos;s on your mind. Your coach listens without judgment and helps you find
          one clear next step.
        </p>
      </div>

      {onSuggestionSend ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {CHAT_WELCOME_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={suggestionsDisabled}
              onClick={() => onSuggestionSend(suggestion)}
              className={cn(
                "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/60",
                suggestionsDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
