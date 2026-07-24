import { describe, expect, it, vi } from "vitest";
import {
  computeTimeDomainRms,
  createVoiceSilenceWatcher,
  isLikelyWhisperSilenceHallucination,
  isVoiceInputSilent,
  playVoiceCloseRitualSilence,
  resolveVoiceRecordingMimeType,
  VOICE_CLOSE_SILENCE_MS,
  VOICE_INPUT_SILENCE_RMS,
  VOICE_SILENCE_HOLD_MS,
} from "./voiceSessionApi";

describe("voiceSessionApi", () => {
  it("does not fire silence hold until threshold is reached", () => {
    const onHold = vi.fn();
    const watcher = createVoiceSilenceWatcher(onHold, 1000);

    watcher.noteSilenceTick(400);
    watcher.noteSilenceTick(400);
    expect(onHold).not.toHaveBeenCalled();

    watcher.noteSilenceTick(400);
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it("resets silence accumulation after sound", () => {
    const onHold = vi.fn();
    const watcher = createVoiceSilenceWatcher(onHold, 500);

    watcher.noteSilenceTick(400);
    watcher.noteSound();
    watcher.noteSilenceTick(400);
    expect(onHold).not.toHaveBeenCalled();
  });

  it("uses the REQ-14 five-second hold default", () => {
    expect(VOICE_SILENCE_HOLD_MS).toBe(5000);
  });

  it("uses a 2–3 second close ritual silence default (Block 3.36)", () => {
    expect(VOICE_CLOSE_SILENCE_MS).toBeGreaterThanOrEqual(2000);
    expect(VOICE_CLOSE_SILENCE_MS).toBeLessThanOrEqual(3000);
  });

  it("playVoiceCloseRitualSilence resolves after the configured delay", async () => {
    vi.useFakeTimers();
    const promise = playVoiceCloseRitualSilence(1000);
    vi.advanceTimersByTime(999);
    await Promise.resolve();
    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    vi.advanceTimersByTime(1);
    await promise;
    expect(settled).toBe(true);
    vi.useRealTimers();
  });

  it("flags common Whisper silence hallucinations on short clips", () => {
    expect(isLikelyWhisperSilenceHallucination("you", 0.2)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("you you", 0.3)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("you", 1)).toBe(false);
    expect(isLikelyWhisperSilenceHallucination("I feel overwhelmed", 0.2)).toBe(false);
  });

  it("flags pure-silence tokens regardless of clip length", () => {
    // Long silent clip (e.g. 15s of room tone) still gets rejected.
    expect(isLikelyWhisperSilenceHallucination("Silence.", 15)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("[BLANK_AUDIO]", 12)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("[silence]", 8)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("...", 20)).toBe(true);
    expect(isLikelyWhisperSilenceHallucination("", 20)).toBe(true);
    // A real sentence of the same length is never a hallucination.
    expect(isLikelyWhisperSilenceHallucination("I sat in silence for a while", 15)).toBe(false);
  });

  it("computeTimeDomainRms measures frame energy", () => {
    expect(computeTimeDomainRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
    expect(computeTimeDomainRms(new Float32Array([]))).toBe(0);
    expect(computeTimeDomainRms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
  });

  it("isVoiceInputSilent uses the input silence RMS threshold", () => {
    expect(isVoiceInputSilent(0)).toBe(true);
    expect(isVoiceInputSilent(VOICE_INPUT_SILENCE_RMS - 0.001)).toBe(true);
    expect(isVoiceInputSilent(VOICE_INPUT_SILENCE_RMS + 0.05)).toBe(false);
  });

  it("resolveVoiceRecordingMimeType prefers explicit opus webm when supported", () => {
    const original = globalThis.MediaRecorder;
    globalThis.MediaRecorder = class {
      static isTypeSupported(type: string) {
        return type === "audio/webm;codecs=opus" || type === "audio/webm";
      }
    } as unknown as typeof MediaRecorder;
    expect(resolveVoiceRecordingMimeType()).toBe("audio/webm;codecs=opus");
    globalThis.MediaRecorder = original;
  });
});
