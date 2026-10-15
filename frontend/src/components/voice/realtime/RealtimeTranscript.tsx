import { useEffect, useRef } from "react";
import type { TranscriptItem } from "@/lib/realtime/transcriptAssembler";
import { cn } from "@/lib/utils";

export interface RealtimeTranscriptProps {
  items: readonly TranscriptItem[];
  className?: string;
}

/** NCLDD-57 — live transcript: ordered bubbles, partial text, "interrupted" mark, auto-scroll. */
export function RealtimeTranscript({ items, className }: RealtimeTranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastText = items.length ? items[items.length - 1].text : "";

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [items.length, lastText]);

  if (items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", className)}>
        The transcript will appear here.
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-2 px-1", className)}
      aria-label="Conversation transcript"
      role="log"
    >
      {items.map((item) => {
        const user = item.role === "user";
        const text = item.text.trim() || (item.failed ? "[inaudible]" : "…");
        return (
          <div key={item.itemId} className={cn("flex", user ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                user ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                !item.final && "opacity-70",
              )}
            >
              <span className="sr-only">{user ? "You: " : "Kota: "}</span>
              {text}
              {item.interrupted ? (
                <span className={cn("ml-1 text-xs italic", user ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  (interrupted)
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
