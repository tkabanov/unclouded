import { Mic, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatCommitmentChannel = "text" | "voice";

export type ChatCommitmentAwaitingBannerProps = {
  channel?: ChatCommitmentChannel;
  className?: string;
};

/**
 * Shown while the session waits for the user's micro-commitment reply.
 */
export function ChatCommitmentAwaitingBanner({
  channel = "text",
  className,
}: ChatCommitmentAwaitingBannerProps) {
  const isVoice = channel === "voice";
  const Icon = isVoice ? Mic : MessageSquareText;

  return (
    <div
      className={cn(
        "border-b border-primary/25 bg-primary/10 px-4 py-3",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isVoice ? "Say your commitment out loud" : "Type your commitment to finish"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isVoice
              ? "Tap the mic and state one concrete step in your own words. Kota will briefly connect it to what matters to you, then save the session."
              : "Send one message below with a concrete step for before your next session. Kota will briefly acknowledge it, then save the session."}
          </p>
        </div>
      </div>
    </div>
  );
}
