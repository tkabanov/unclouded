/**
 * REQ-14 / Block 3.36 — lightweight vocal emotion signal from audio dynamics.
 * Pure analysis helpers are testable without Web Audio.
 */

export type VoiceEmotionAnalysis = {
  emotionDetected: boolean;
  /** Normalized 0–1 strength when detected. */
  strength?: number;
};

/** Minimum RMS mean to treat the clip as speech (not silence/noise). */
export const VOICE_EMOTION_MIN_SPEECH_RMS = 0.008;

/** Coefficient-of-variation threshold for elevated vocal dynamics. */
export const VOICE_EMOTION_CV_THRESHOLD = 0.55;

function rmsWindow(samples: Float32Array, start: number, end: number): number {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) {
    const sample = samples[i] ?? 0;
    sum += sample * sample;
  }
  return Math.sqrt(sum / (end - start));
}

/** Analyze mono PCM samples for elevated emotional vocal signal. */
export function analyzeVoiceEmotionFromSamples(
  samples: Float32Array,
  sampleRate: number,
  windowMs = 50,
): VoiceEmotionAnalysis {
  if (samples.length === 0 || sampleRate <= 0) {
    return { emotionDetected: false };
  }

  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const rmsValues: number[] = [];

  for (let i = 0; i < samples.length; i += windowSize) {
    rmsValues.push(rmsWindow(samples, i, Math.min(i + windowSize, samples.length)));
  }

  if (rmsValues.length < 4) {
    return { emotionDetected: false };
  }

  const mean = rmsValues.reduce((acc, value) => acc + value, 0) / rmsValues.length;
  if (mean < VOICE_EMOTION_MIN_SPEECH_RMS) {
    return { emotionDetected: false };
  }

  const variance =
    rmsValues.reduce((acc, value) => acc + (value - mean) ** 2, 0) / rmsValues.length;
  const cv = Math.sqrt(variance) / mean;

  if (cv < VOICE_EMOTION_CV_THRESHOLD) {
    return { emotionDetected: false };
  }

  return {
    emotionDetected: true,
    strength: Math.min(1, cv / 1.2),
  };
}

/** Decode a recorded voice blob and detect vocal emotion (browser only). */
export async function detectVoiceEmotionFromBlob(blob: Blob): Promise<VoiceEmotionAnalysis> {
  if (typeof AudioContext === "undefined" || blob.size === 0) {
    return { emotionDetected: false };
  }

  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    return analyzeVoiceEmotionFromSamples(channelData, audioBuffer.sampleRate);
  } catch {
    return { emotionDetected: false };
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}
