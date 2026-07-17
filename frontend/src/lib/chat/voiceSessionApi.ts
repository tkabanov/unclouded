/**
 * REQ-14 — Voice session infrastructure helpers.
 * STT via Whisper, TTS via OpenAI; sessionType=voice activates Block 3.36.
 */

import { supabase } from "@/integrations/supabase/client";

const OPENAI_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type VoiceSessionCallbacks = {
  onPartialTranscript?: (text: string) => void;
  onSilenceMs?: (ms: number) => void;
};

/** Silence longer than this is NOT treated as end-of-turn (REQ-14). */
export const VOICE_SILENCE_HOLD_MS = 5000;

export async function transcribeVoiceBlob(audio: Blob): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", audio, "voice.webm");
  form.append("model", "whisper-1");
  form.append("mode", "transcribe");

  // Prefer dedicated voice edge when available; fall back to client-side note.
  const response = await fetch(`${OPENAI_PROXY}?voice=transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: form,
  });

  if (!response.ok) {
    // Graceful stub when voice edge is not yet deployed
    return "";
  }

  const payload = (await response.json()) as { text?: string };
  return typeof payload.text === "string" ? payload.text.trim() : "";
}

export async function synthesizeKotaSpeech(text: string): Promise<Blob | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token || !text.trim()) return null;

  const response = await fetch(`${OPENAI_PROXY}?voice=tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      mode: "tts",
      text: text.slice(0, 4000),
      voice: "nova",
    }),
  });

  if (!response.ok) return null;
  return response.blob();
}

export function createVoiceSilenceWatcher(
  onHold: () => void,
  holdMs = VOICE_SILENCE_HOLD_MS,
): { noteSound: () => void; noteSilenceTick: (deltaMs: number) => void; reset: () => void } {
  let silenceAccum = 0;
  return {
    noteSound: () => {
      silenceAccum = 0;
    },
    noteSilenceTick: (deltaMs: number) => {
      silenceAccum += deltaMs;
      // Do not auto-complete turn; only notify for UI (REQ-14).
      if (silenceAccum >= holdMs) {
        onHold();
        silenceAccum = 0;
      }
    },
    reset: () => {
      silenceAccum = 0;
    },
  };
}
