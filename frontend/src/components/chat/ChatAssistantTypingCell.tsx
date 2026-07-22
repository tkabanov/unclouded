import coachAvatar from "@/assets/coach-avatar.png";
import { cn } from "@/lib/utils";

export type ChatAssistantTypingCellProps = {
  className?: string;
};

/**
 * Lovable-style assistant typing indicator.
 */
export function ChatAssistantTypingCell({ className }: ChatAssistantTypingCellProps) {
  return (
    <div
      className={cn("group flex w-full max-w-[95%] flex-col gap-2 is-assistant", className)}
      aria-live="polite"
      aria-busy="true"
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
        <p className="text-sm text-muted-foreground animate-pulse">
          <span className="sr-only">Assistant is typing</span>
          Thinking…
        </p>
      </div>
    </div>
  );
}
