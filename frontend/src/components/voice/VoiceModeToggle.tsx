import { Lock } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseVoiceMode, VOICE_MODE_LOCKED_HINT, type VoiceMode } from "@/lib/realtime/realtimeUi";
import { cn } from "@/lib/utils";

export interface VoiceModeToggleProps {
  mode: VoiceMode;
  onChange: (mode: VoiceMode) => void;
  /** A realtime session is running: switching would cut it off. */
  disabled?: boolean;
  /** Plan does not include Conversation mode (unused while the min tier is Free). */
  conversationLocked?: boolean;
  onConversationLocked?: () => void;
  className?: string;
}

/** NCLDD-57 — segmented control: Voice messages | Conversation. */
export function VoiceModeToggle({
  mode,
  onChange,
  disabled = false,
  conversationLocked = false,
  onConversationLocked,
  className,
}: VoiceModeToggleProps) {
  const group = (
    <ToggleGroup
      type="single"
      value={mode}
      disabled={disabled}
      aria-label="Voice mode"
      onValueChange={(value) => {
        if (!value || value === mode) return;
        const next = parseVoiceMode(value);
        if (next === "conversation" && conversationLocked) {
          onConversationLocked?.();
          return;
        }
        onChange(next);
      }}
      className={cn("inline-flex rounded-lg border border-border bg-muted/40 p-1", className)}
    >
      <ToggleGroupItem
        value="messages"
        className="h-8 rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Voice messages
      </ToggleGroupItem>
      <ToggleGroupItem
        value="conversation"
        className="h-8 gap-1.5 rounded-md px-3 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        {conversationLocked ? <Lock className="h-3.5 w-3.5" aria-hidden /> : null}
        Conversation
      </ToggleGroupItem>
    </ToggleGroup>
  );

  if (!disabled) return group;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} aria-label={VOICE_MODE_LOCKED_HINT} className="inline-flex">
          {group}
        </span>
      </TooltipTrigger>
      <TooltipContent>{VOICE_MODE_LOCKED_HINT}</TooltipContent>
    </Tooltip>
  );
}
