import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoiceSessionMicButtonProps = {
  recording: boolean;
  transcribing: boolean;
  silenceHoldActive: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
};

export default function VoiceSessionMicButton({
  recording,
  transcribing,
  silenceHoldActive,
  disabled = false,
  onToggle,
  className,
}: VoiceSessionMicButtonProps) {
  const label = transcribing
    ? "Transcribing…"
    : recording
      ? "Stop recording"
      : "Record voice message";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        type="button"
        size="icon"
        variant={recording ? "default" : "outline"}
        disabled={disabled || transcribing}
        aria-pressed={recording}
        aria-label={label}
        title={label}
        onClick={onToggle}
      >
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      {recording && silenceHoldActive ? (
        <p className="text-[10px] text-muted-foreground">Still listening — silence is okay.</p>
      ) : null}
    </div>
  );
}
