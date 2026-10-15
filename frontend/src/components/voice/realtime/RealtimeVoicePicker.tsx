import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  isRealtimeVoice,
  realtimeVoiceLabel,
  realtimeVoiceOptions,
  type RealtimeVoice,
} from "@/lib/realtime/realtimeVoices";
import { REALTIME_VOICE_LOCKED_HINT } from "@/lib/realtime/realtimeUi";

export interface RealtimeVoicePickerProps {
  value: RealtimeVoice;
  onChange: (voice: RealtimeVoice) => void;
  /** A session is running: the voice is fixed at start (C9). */
  locked?: boolean;
}

export function RealtimeVoicePicker({ value, onChange, locked = false }: RealtimeVoicePickerProps) {
  if (locked) {
    return (
      <p className="text-xs text-muted-foreground">
        Voice: {realtimeVoiceLabel(value)} · {REALTIME_VOICE_LOCKED_HINT}
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-1.5">
      <Label htmlFor="realtime-voice" className="text-xs text-muted-foreground">
        Kota's voice
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (isRealtimeVoice(next)) onChange(next);
        }}
      >
        <SelectTrigger id="realtime-voice" aria-label="Kota's voice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {realtimeVoiceOptions().map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
