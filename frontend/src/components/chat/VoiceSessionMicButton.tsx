import { Mic, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

type VoiceSessionMicButtonProps = {
  recording: boolean;
  transcribing: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
};

export default function VoiceSessionMicButton({
  recording,
  transcribing,
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
    <Button
      type="button"
      size="icon"
      variant={recording ? "default" : "outline"}
      disabled={disabled || transcribing}
      aria-pressed={recording}
      aria-label={label}
      title={label}
      className={className}
      onClick={onToggle}
    >
      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
