import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { bubbleStyle } from "@/styles";

export type ChatAssistantTypingCellProps = {
  className?: string;
};

/**
 * Assistant typing indicator shown while waiting for AI reply.
 */
export function ChatAssistantTypingCell({ className }: ChatAssistantTypingCellProps) {
  return (
    <div className={cn("flex w-full items-start gap-2", className)} aria-live="polite" aria-busy="true">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
        <Cloud
          data-style-ref="Icon_default_"
          className={cn(bubbleStyle("Icon_default_"), "h-4 w-4")}
          aria-hidden
        />
      </div>

      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
        <span className="sr-only">Assistant is typing</span>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
