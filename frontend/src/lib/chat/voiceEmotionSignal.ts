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

function collectWindowedMeanRms(samples: Float32Array, sampleRate: number, windowMs = 50): number {
  if (samples.length === 0 || sampleRate <= 0) return 0;

  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  const rmsValues: number[] = [];

  for (let i = 0; i < samples.length; i += windowSize) {
    rmsValues.push(rmsWindow(samples, i, Math.min(i + windowSize, samples.length)));
  }

  if (rmsValues.length === 0) return 0;
  return rmsValues.reduce((acc, value) => acc + value, 0) / rmsValues.length;
}

/** Mean RMS of a decoded clip — used to reject silent recordings before Whisper. */
export function measureMeanRmsFromSamples(samples: Float32Array, sampleRate: number): number {
  return collectWindowedMeanRms(samples, sampleRate);
}

export async function decodeVoiceBlobToMonoSamples(
  blob: Blob,
): Promise<{ samples: Float32Array; sampleRate: number; durationSec: number } | null> {
  if (typeof AudioContext === "undefined" || blob.size === 0) {
    return null;
  }

  const audioContext = new AudioContext();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return {
      samples: audioBuffer.getChannelData(0),
      sampleRate: audioBuffer.sampleRate,
      durationSec: audioBuffer.duration,
    };
  } catch {
    return null;
  } finally {
    await audioContext.close().catch(() => undefined);
  }
}

export async function measureVoiceBlobMeanRms(blob: Blob): Promise<number | null> {
  const decoded = await decodeVoiceBlobToMonoSamples(blob);
  if (!decoded) return null;
  return measureMeanRmsFromSamples(decoded.samples, decoded.sampleRate);
}

export function voiceBlobHasAudibleSpeech(
  meanRms: number,
  minRms = VOICE_EMOTION_MIN_SPEECH_RMS,
): boolean {
  return meanRms >= minRms;
}

/** Share of analysis windows whose RMS meets the speech floor (0–1). */
export function measureSpeechActiveWindowRatio(
  samples: Float32Array,
  sampleRate: number,
  windowMs = 50,
  minRms = VOICE_EMOTION_MIN_SPEECH_RMS,
): number {
  if (samples.length === 0 || sampleRate <= 0) return 0;

  const windowSize = Math.max(1, Math.floor((sampleRate * windowMs) / 1000));
  let active = 0;
  let total = 0;

  for (let i = 0; i < samples.length; i += windowSize) {
    total += 1;
    const rms = rmsWindow(samples, i, Math.min(i + windowSize, samples.length));
    if (rms >= minRms) active += 1;
  }

  return total === 0 ? 0 : active / total;
}

/** Room tone can lift mean RMS slightly; sustained speech spans more windows. */
export const VOICE_MIN_SPEECH_ACTIVE_RATIO = 0.04;

export function voiceBlobHasSustainedSpeech(
  samples: Float32Array,
  sampleRate: number,
  minActiveRatio = VOICE_MIN_SPEECH_ACTIVE_RATIO,
): boolean {
  return measureSpeechActiveWindowRatio(samples, sampleRate) >= minActiveRatio;
}

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

  const mean = collectWindowedMeanRms(samples, sampleRate, windowMs);
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
  const decoded = await decodeVoiceBlobToMonoSamples(blob);
  if (!decoded) {
    return { emotionDetected: false };
  }
  return analyzeVoiceEmotionFromSamples(decoded.samples, decoded.sampleRate);
}
