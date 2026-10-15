/**
 * NCLDD-57 S5b — copy and small formatters for the Conversation-mode UI.
 */
import type { RealtimePhase } from "./realtimeSessionMachine";

export type VoiceMode = "messages" | "conversation";

export function parseVoiceMode(value: string | null | undefined): VoiceMode {
  return value === "conversation" ? "conversation" : "messages";
}

export const VOICE_MODE_LOCKED_HINT = "End the conversation to switch";
export const REALTIME_VOICE_LOCKED_HINT = "Voice can be changed for the next conversation";
export const REALTIME_TIME_WARNING_MESSAGE = "Less than 5 minutes left in this conversation.";

const STATUS: Record<RealtimePhase, string> = {
  idle: "Ready when you are",
  requesting_mic: "Waiting for microphone access…",
  connecting: "Connecting…",
  listening: "Kota is listening",
  user_speaking: "Listening to you…",
  thinking: "Kota is thinking…",
  speaking: "Kota is speaking",
  ending: "Ending the conversation…",
  ended: "Conversation ended",
  error: "Couldn't start the conversation",
};

export function realtimeStatusLabel(phase: RealtimePhase): string {
  return STATUS[phase];
}

/** `m:ss` for the remaining-time label. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
