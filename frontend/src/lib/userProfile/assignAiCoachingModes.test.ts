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

describe("resolveAiCoachingModes (FINAL Layer 4)", () => {
  it("assigns builder when stability is 3.2–4.0", () => {
    expect(resolveAiCoachingModes(MID_SCORES)).toEqual([AI_COACHING_MODE.BUILDER]);
  });

  it("assigns rebuilder when stability is below 2.5", () => {
    expect(
      resolveAiCoachingModes({ ...MID_SCORES, stability_score: 2.4 }),
    ).toEqual([AI_COACHING_MODE.REBUILDER]);
  });

  it("assigns stabilizer when stability is 2.5–3.2", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 3.0,
      }),
    ).toEqual([AI_COACHING_MODE.STABILIZER]);
  });

  it("does not set simplifier as primary from low performance", () => {
    expect(
      resolveAiCoachingModes({ ...MID_SCORES, performance_score: 2.8 }),
    ).toEqual([AI_COACHING_MODE.BUILDER]);
  });

  it("assigns optimizer when stability and performance are both above 4.0", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.1,
        alignment_score: 4.0,
        performance_score: 4.1,
      }),
    ).toEqual([AI_COACHING_MODE.OPTIMIZER]);
  });

  it("assigns builder at stability 4.0 even with high performance (optimizer needs >4.0)", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.0,
        performance_score: 4.2,
      }),
    ).toEqual([AI_COACHING_MODE.BUILDER]);
  });

  it("STRATEGIST alias resolves to builder", () => {
    expect(AI_COACHING_MODE.STRATEGIST).toBe(AI_COACHING_MODE.BUILDER);
  });

  it("recovery mode stacks protector on primary", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.1,
        alignment_score: 4.0,
        performance_score: 4.1,
        recovery_mode_active: true,
      }),
    ).toEqual([AI_COACHING_MODE.OPTIMIZER, AI_COACHING_MODE.PROTECTOR]);
  });

  it("grief mode stacks protector on primary", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        grief_mode_active: true,
      }),
    ).toEqual([AI_COACHING_MODE.BUILDER, AI_COACHING_MODE.PROTECTOR]);
  });

  it("high cognitive load appends simplifier overlay", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.BUILDER, AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("appends simplifier to optimizer when cognitive load is high", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        stability_score: 4.1,
        alignment_score: 4.0,
        performance_score: 4.1,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([AI_COACHING_MODE.OPTIMIZER, AI_COACHING_MODE.SIMPLIFIER]);
  });

  it("appends simplifier to protector overlay when cognitive load is high", () => {
    expect(
      resolveAiCoachingModes({
        ...MID_SCORES,
        recovery_mode_active: true,
        cognitive_load_signal_slug: HIGH_COGNITIVE_SLUG,
      }),
    ).toEqual([
      AI_COACHING_MODE.BUILDER,
      AI_COACHING_MODE.PROTECTOR,
      AI_COACHING_MODE.SIMPLIFIER,
    ]);
  });
});
