/**
 * REQ-14 — Voice session infrastructure helpers.
 * STT via Whisper, TTS via OpenAI; sessionType=voice activates Block 3.36.
 */

import { supabase } from "@/integrations/supabase/client";
import { detectVoiceEmotionFromBlob } from "@/lib/chat/voiceEmotionSignal";

const CHAT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export type VoiceSessionCallbacks = {
  onPartialTranscript?: (text: string) => void;
  onSilenceMs?: (ms: number) => void;
};

/** Silence longer than this is NOT treated as end-of-turn (REQ-14). */
export const VOICE_SILENCE_HOLD_MS = 5000;

/** Ritual silence before voice session close TTS (Block 3.36 — 2–3 seconds). */
export const VOICE_CLOSE_SILENCE_MS = 2500;

export const KOTA_TTS_VOICE = "nova" as const;

export type VoiceTranscriptionResult = {
  text: string;
  emotionDetected: boolean;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  return {
    Authorization: `Bearer ${token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function parseVoiceError(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      message = payload.error.trim();
    }
  } catch {
    // ignore
  }
  throw new Error(message);
}

export async function transcribeVoiceBlob(audio: Blob): Promise<VoiceTranscriptionResult> {
  const form = new FormData();
  form.append("file", audio, "voice.webm");
  form.append("model", "whisper-1");

  const [response, emotionAnalysis] = await Promise.all([
    fetch(`${CHAT_ENDPOINT}?voice=transcribe`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: form,
    }),
    detectVoiceEmotionFromBlob(audio).catch(() => ({ emotionDetected: false })),
  ]);

  if (!response.ok) {
    return parseVoiceError(response, "Transcription failed");
  }

  const payload = (await response.json()) as { text?: string };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";

  return { text, emotionDetected: emotionAnalysis.emotionDetected };
}

/** Block 3.36 — pause before Kota speaks the voice session close. */
export function playVoiceCloseRitualSilence(ms = VOICE_CLOSE_SILENCE_MS): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function synthesizeKotaSpeech(text: string): Promise<Blob> {
  if (!text.trim()) {
    throw new Error("No text to synthesize");
  }

  const response = await fetch(`${CHAT_ENDPOINT}?voice=tts`, {
    method: "POST",
    headers: {
      ...(await getAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 4096),
      voice: KOTA_TTS_VOICE,
    }),
  });

  if (!response.ok) {
    return parseVoiceError(response, "Speech synthesis failed");
  }

  return response.blob();
}

export function createVoiceSilenceWatcher(
  onHold: () => void,
  holdMs = VOICE_SILENCE_HOLD_MS,
): { noteSound: () => void; noteSilenceTick: (deltaMs: number) => void; reset: () => void } {
  let silenceAccum = 0;
  let holdNotified = false;
  return {
    noteSound: () => {
      silenceAccum = 0;
      holdNotified = false;
    },
    noteSilenceTick: (deltaMs: number) => {
      silenceAccum += deltaMs;
      // Do not auto-complete turn; only notify for UI (REQ-14).
      if (!holdNotified && silenceAccum >= holdMs) {
        onHold();
        holdNotified = true;
      }
    },
    reset: () => {
      silenceAccum = 0;
      holdNotified = false;
    },
  };
}
