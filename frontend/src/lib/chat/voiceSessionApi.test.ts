import { describe, expect, it, vi } from "vitest";
import {
  createVoiceSilenceWatcher,
  playVoiceCloseRitualSilence,
  VOICE_CLOSE_SILENCE_MS,
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
});
