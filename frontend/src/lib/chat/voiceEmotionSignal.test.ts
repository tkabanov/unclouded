import { describe, expect, it } from "vitest";
import {
  analyzeVoiceEmotionFromSamples,
  VOICE_EMOTION_CV_THRESHOLD,
  VOICE_EMOTION_MIN_SPEECH_RMS,
} from "./voiceEmotionSignal";

const SAMPLE_RATE = 16000;

function sineWave(frequency: number, amplitude: number, durationSec: number): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return samples;
}

function mergeSamples(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

describe("voiceEmotionSignal", () => {
  it("does not flag steady low-amplitude audio as emotional", () => {
    const steady = sineWave(220, 0.004, 1);
    const result = analyzeVoiceEmotionFromSamples(steady, SAMPLE_RATE);
    expect(result.emotionDetected).toBe(false);
  });

  it("flags highly dynamic amplitude as emotional vocal signal", () => {
    const dynamic = mergeSamples([
      sineWave(220, 0.05, 0.25),
      sineWave(220, 0.01, 0.25),
      sineWave(220, 0.06, 0.25),
      sineWave(220, 0.012, 0.25),
    ]);
    const result = analyzeVoiceEmotionFromSamples(dynamic, SAMPLE_RATE);
    expect(result.emotionDetected).toBe(true);
    expect(result.strength).toBeGreaterThan(0);
  });

  it("exports stable REQ-14 thresholds", () => {
    expect(VOICE_EMOTION_MIN_SPEECH_RMS).toBeGreaterThan(0);
    expect(VOICE_EMOTION_CV_THRESHOLD).toBeGreaterThan(0);
  });
});
