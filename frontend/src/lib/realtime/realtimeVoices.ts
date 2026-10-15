/**
 * NCLDD-57 S4 — Kota voices for the Conversation mode (spike §1.7). The voice is fixed when a
 * session starts (C9); the choice is remembered per browser.
 */

export const REALTIME_VOICES = [
  "marin",
  "cedar",
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
] as const;

export type RealtimeVoice = (typeof REALTIME_VOICES)[number];

export const DEFAULT_REALTIME_VOICE: RealtimeVoice = "marin";

/** OpenAI recommends these two for realtime speech. */
const RECOMMENDED: ReadonlySet<RealtimeVoice> = new Set(["marin", "cedar"]);

export const REALTIME_VOICE_STORAGE_KEY = "unclouded.realtimeVoice";

export function isRealtimeVoice(value: unknown): value is RealtimeVoice {
  return typeof value === "string" && (REALTIME_VOICES as readonly string[]).includes(value);
}

export function realtimeVoiceLabel(voice: RealtimeVoice): string {
  const name = voice.charAt(0).toUpperCase() + voice.slice(1);
  return RECOMMENDED.has(voice) ? `${name} (recommended)` : name;
}

export function realtimeVoiceOptions(): Array<{ value: RealtimeVoice; label: string }> {
  return REALTIME_VOICES.map((value) => ({ value, label: realtimeVoiceLabel(value) }));
}

type VoiceStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): VoiceStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredRealtimeVoice(storage: VoiceStorage | null = defaultStorage()): RealtimeVoice {
  try {
    const value = storage?.getItem(REALTIME_VOICE_STORAGE_KEY);
    return isRealtimeVoice(value) ? value : DEFAULT_REALTIME_VOICE;
  } catch {
    return DEFAULT_REALTIME_VOICE;
  }
}

export function storeRealtimeVoice(voice: RealtimeVoice, storage: VoiceStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(REALTIME_VOICE_STORAGE_KEY, voice);
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}
