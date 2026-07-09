import { describe, expect, it } from "vitest";
import { AI_COACHING_MODE } from "@/lib/enums/coachingMode";
import { resolveAiCoachingModes } from "./assignAiCoachingModes";

const MID_SCORES = {
  stability_score: 3.5,
  alignment_score: 3.5,
  performance_score: 3.5,
  recovery_mode_active: false,
  grief_mode_active: false,
};

const HIGH_COGNITIVE_SLUG = "head_rarely_feels_quiet___constant";

describe("resolveAiCoachingModes (bTIEN)", () => {
  it("action 0: defaults to stabilizer when no branch conditions match", () => {
    expect(resolveAiCoachingModes(MID_SCORES)).toEqual([AI_COACHING_MODE.STABILIZER]);
  });

  it("action 1: alignment below 3.2 sets rebuilder", () => {
    expect(
      resolveAiCoachingModes({ ...MID_SCORES, alignment_score: 3.0 }),
    ).toEqual([AI_COACHING_MODE.REBUILDER]);
  });

  it("action 2: stability below 3.2 overrides rebuilder with stabilizer", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        alignment_score: 3.0,
        stability_score: 3.0,
      }),
    ).toEqual([AI_COACHING_MODE.STABILIZER]);
  });

  it("action 3: performance below 3.2 sets simplifier", () => {
    expect(
      resolveAiCoachingModes({ ...MID_SCORES, performance_score: 3.0 }),
    ).toEqual([AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("action 4: all scores at or above 3.8 sets strategist", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.0,
        alignment_score: 3.8,
        performance_score: 4.2,
      }),
    ).toEqual([AI_COACHING_MODE.STRATEGIST]);
  });

  it("action 5: recovery mode sets protector", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.0,
        alignment_score: 4.0,
        performance_score: 4.0,
        recovery_mode_active: true,
      }),
    ).toEqual([AI_COACHING_MODE.PROTECTOR]);
  });

  it("action 5: grief mode sets protector", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        grief_mode_active: true,
      }),
    ).toEqual([AI_COACHING_MODE.PROTECTOR]);
  });

  it("action 6: high cognitive load appends simplifier", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.STABILIZER, AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("action 6: does not duplicate simplifier when already set by action 3", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        performance_score: 3.0,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("action 6: appends simplifier to strategist when cognitive load is high", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.0,
        alignment_score: 4.0,
        performance_score: 4.0,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.STRATEGIST, AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("action 6: appends simplifier to protector when cognitive load is high", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        recovery_mode_active: true,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.PROTECTOR, AI_COACHING_MODE.SIMPLIFIER]);
  });
});
