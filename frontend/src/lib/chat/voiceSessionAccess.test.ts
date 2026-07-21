import { describe, expect, it } from "vitest";
import {
  isDepletedForVoiceSessionCta,
  VOICE_SESSION_ROUTE,
} from "./voiceSessionAccess";

describe("voiceSessionAccess", () => {
  it("detects depleted energy or nervous system for voice CTA", () => {
    expect(
      isDepletedForVoiceSessionCta({
        stateSignals: { energy_level_signal: "depleted" },
      }),
    ).toBe(true);
    expect(
      isDepletedForVoiceSessionCta({
        stateSignals: { nervous_system_state: "shut_down" },
      }),
    ).toBe(true);
    expect(
      isDepletedForVoiceSessionCta({
        stateSignals: { energy_level_signal: "strong" },
      }),
    ).toBe(false);
  });

  it("exposes the voice session route", () => {
    expect(VOICE_SESSION_ROUTE).toBe("/coaching/voice");
  });
});
