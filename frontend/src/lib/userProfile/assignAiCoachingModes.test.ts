import { describe, expect, it } from "vitest";
import { AI_COACHING_MODE } from "@/lib/enums/coachingMode";
import { CLASSIFICATION_OS } from "./classifyUser";
import { resolveAiCoachingModes } from "./assignAiCoachingModes";

describe("resolveAiCoachingModes", () => {
  it("prioritizes Protector when pressure profile is System Overload", () => {
    const modes = resolveAiCoachingModes({
      classification_os: CLASSIFICATION_OS.OPTIMIZATION_READY,
      pressure_profile_text: "System Overload",
      behavioral_fingerprint_text: "steady execution",
    });

    expect(modes[0]).toBe(AI_COACHING_MODE.PROTECTOR);
    expect(modes).toContain(AI_COACHING_MODE.STRATEGIST);
  });

  it("prioritizes Stabilizer when behavioral fingerprint mentions overwhelm", () => {
    const modes = resolveAiCoachingModes({
      classification_os: CLASSIFICATION_OS.PERFORMANCE_STAGNATION,
      pressure_profile_text: "Moderate Load",
      behavioral_fingerprint_text: "Signs of overwhelm under sustained load",
    });

    expect(modes[0]).toBe(AI_COACHING_MODE.STABILIZER);
    expect(modes).toContain(AI_COACHING_MODE.STRATEGIST);
  });

  it("falls back to Simplifier when classification is unknown", () => {
    const modes = resolveAiCoachingModes({
      classification_os: null,
      pressure_profile_text: "Manageable Load",
      behavioral_fingerprint_text: "balanced",
    });

    expect(modes).toEqual([
      AI_COACHING_MODE.STABILIZER,
      AI_COACHING_MODE.SIMPLIFIER,
    ]);
  });
});
