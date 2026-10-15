import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_REALTIME_VOICE,
  REALTIME_VOICES,
  REALTIME_VOICE_STORAGE_KEY,
  isRealtimeVoice,
  readStoredRealtimeVoice,
  realtimeVoiceLabel,
  realtimeVoiceOptions,
  storeRealtimeVoice,
} from "./realtimeVoices";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    data,
  };
}

describe("realtimeVoices", () => {
  it("lists the documented voices with marin as default", () => {
    expect(REALTIME_VOICES).toHaveLength(10);
    expect(DEFAULT_REALTIME_VOICE).toBe("marin");
    expect(isRealtimeVoice("cedar")).toBe(true);
    expect(isRealtimeVoice("nova")).toBe(false);
    expect(isRealtimeVoice(1)).toBe(false);
  });

  it("labels recommended voices", () => {
    expect(realtimeVoiceLabel("marin")).toBe("Marin (recommended)");
    expect(realtimeVoiceLabel("echo")).toBe("Echo");
    expect(realtimeVoiceOptions()[0]).toEqual({ value: "marin", label: "Marin (recommended)" });
  });

  it("reads and stores the choice", () => {
    const storage = memoryStorage();
    expect(readStoredRealtimeVoice(storage)).toBe("marin");
    storeRealtimeVoice("sage", storage);
    expect(storage.data[REALTIME_VOICE_STORAGE_KEY]).toBe("sage");
    expect(readStoredRealtimeVoice(storage)).toBe("sage");
    expect(readStoredRealtimeVoice(memoryStorage({ [REALTIME_VOICE_STORAGE_KEY]: "nova" }))).toBe("marin");
  });

  it("survives blocked or missing storage", () => {
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };
    expect(readStoredRealtimeVoice(throwing)).toBe("marin");
    expect(() => storeRealtimeVoice("ash", throwing)).not.toThrow();
    expect(readStoredRealtimeVoice(null)).toBe("marin");
    expect(() => storeRealtimeVoice("ash", null)).not.toThrow();
  });

  it("uses window.localStorage by default", () => {
    window.localStorage.removeItem(REALTIME_VOICE_STORAGE_KEY);
    storeRealtimeVoice("verse");
    expect(readStoredRealtimeVoice()).toBe("verse");
    window.localStorage.removeItem(REALTIME_VOICE_STORAGE_KEY);
  });

  it("falls back when localStorage access throws", () => {
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readStoredRealtimeVoice()).toBe("marin");
    spy.mockRestore();
  });
});
