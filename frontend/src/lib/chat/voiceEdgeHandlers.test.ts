import { describe, expect, it } from "vitest";
import {
  KOTA_TTS_VOICE,
  resolveTtsVoice,
  resolveVoiceRoute,
} from "../../../../supabase/functions/chat/voice/voiceEdgeHandlers.ts";

describe("voiceEdgeHandlers", () => {
  it("resolves voice routes from query params", () => {
    expect(resolveVoiceRoute(new Request("https://example.com/functions/v1/chat?voice=transcribe"))).toBe(
      "transcribe",
    );
    expect(resolveVoiceRoute(new Request("https://example.com/functions/v1/chat?voice=tts"))).toBe("tts");
    expect(resolveVoiceRoute(new Request("https://example.com/functions/v1/chat"))).toBeNull();
  });

  it("defaults TTS voice to Nova and validates allowed voices", () => {
    expect(resolveTtsVoice(undefined)).toBe(KOTA_TTS_VOICE);
    expect(resolveTtsVoice("nova")).toBe("nova");
    expect(resolveTtsVoice("alloy")).toBe("alloy");
    expect(resolveTtsVoice("invalid")).toBe("nova");
  });
});
