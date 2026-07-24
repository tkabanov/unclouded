/**
 * REQ-14 — Voice session infrastructure helpers.
 * STT via Whisper, TTS via OpenAI; sessionType=voice activates Block 3.36.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  decodeVoiceBlobToMonoSamples,
  detectVoiceEmotionFromBlob,
  measureMeanRmsFromSamples,
  voiceBlobHasAudibleSpeech,
  voiceBlobHasSustainedSpeech,
} from "@/lib/chat/voiceEmotionSignal";

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

const VOICE_RECORDING_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

/** Prefer explicit codecs — embedded Chromium often records silence/garbage with the default mime. */
export function resolveVoiceRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const mime of VOICE_RECORDING_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export function voiceRecordingUploadFilename(mimeType: string): string {
  if (mimeType.includes("mp4")) return "voice.m4a";
  if (mimeType.includes("ogg")) return "voice.ogg";
  return "voice.webm";
}

export const VOICE_INPUT_MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
};

/**
 * Live-input RMS (from an AnalyserNode time-domain frame) below this counts as
 * silence for the REQ-14 5s hold. Driving the hold from real audio level — not
 * from MediaRecorder `dataavailable` chunks, which fire even during silence.
 */
export const VOICE_INPUT_SILENCE_RMS = 0.01;

/** RMS of a time-domain frame (values in [-1, 1]) from an AnalyserNode. */
export function computeTimeDomainRms(frame: Float32Array): number {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    const value = frame[i] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / frame.length);
}

export function isVoiceInputSilent(frameRms: number, threshold = VOICE_INPUT_SILENCE_RMS): boolean {
  return frameRms < threshold;
}

const WHISPER_SILENCE_HALLUCINATION = /^(you(\s+you)*\.?|thank you\.?|thanks for watching\.?)$/i;

/**
 * Phrases Whisper emits on silent / near-silent clips regardless of clip length
 * (a long clip of room tone still yields these). Bare punctuation counts too.
 */
const WHISPER_PURE_SILENCE_TOKENS =
  /^(\[?\s*(silence|blank[_\s]?audio|inaudible|no speech|music|applause)\s*\]?\.?|[.…]{1,}|·+)$/i;

const WHISPER_CJK_SCRIPT = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

/** Whisper on silence/noise often emits JP/KR outros even when `language=en` is set. */
export function isLikelyWhisperForeignSilenceHallucination(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  if (/ご視聴|ご清聴|字幕|チャンネル|視聴|ありがとうございました/.test(trimmed)) {
    return true;
  }

  const stripped = trimmed.replace(/[\s.,!?;:。、！？\-—…]/g, "");
  if (stripped.length === 0) return true;

  let cjkCount = 0;
  for (const char of stripped) {
    if (WHISPER_CJK_SCRIPT.test(char)) cjkCount += 1;
  }

  return cjkCount / stripped.length >= 0.25;
}

/** Whisper often returns these on near-silent or corrupt clips (common in embedded browsers). */
export function isLikelyWhisperSilenceHallucination(text: string, durationSec: number): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (WHISPER_PURE_SILENCE_TOKENS.test(trimmed)) return true;
  if (isLikelyWhisperForeignSilenceHallucination(trimmed)) return true;
  if (durationSec < 0.6 && WHISPER_SILENCE_HALLUCINATION.test(trimmed)) return true;
  return false;
}

export function shouldRejectVoiceTranscript(text: string, durationSec?: number): boolean {
  if (!text.trim()) return true;
  if (isLikelyWhisperForeignSilenceHallucination(text)) return true;
  if (durationSec === undefined) {
    return isLikelyWhisperSilenceHallucination(text, 0);
  }
  return isLikelyWhisperSilenceHallucination(text, durationSec);
}

export type VoiceRecordingValidation =
  | { ok: true; uploadFilename: string; durationSec: number }
  | { ok: false; reason: "empty" | "undecodable" | "too_quiet" };

export async function validateVoiceRecordingBlob(
  blob: Blob,
  mimeType: string,
): Promise<VoiceRecordingValidation> {
  if (blob.size === 0) return { ok: false, reason: "empty" };

  const decoded = await decodeVoiceBlobToMonoSamples(blob);
  if (!decoded) return { ok: false, reason: "undecodable" };

  const meanRms = measureMeanRmsFromSamples(decoded.samples, decoded.sampleRate);
  if (
    !voiceBlobHasAudibleSpeech(meanRms) ||
    !voiceBlobHasSustainedSpeech(decoded.samples, decoded.sampleRate)
  ) {
    return { ok: false, reason: "too_quiet" };
  }

  return {
    ok: true,
    uploadFilename: voiceRecordingUploadFilename(mimeType),
    durationSec: decoded.durationSec,
  };
}

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

export async function transcribeVoiceBlob(
  audio: Blob,
  options?: { filename?: string; durationSec?: number },
): Promise<VoiceTranscriptionResult> {
  const form = new FormData();
  form.append("file", audio, options?.filename ?? "voice.webm");
  form.append("model", "whisper-1");
  form.append("language", "en");

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

  if (text && shouldRejectVoiceTranscript(text, options?.durationSec)) {
    throw new Error("No speech detected.");
  }

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
