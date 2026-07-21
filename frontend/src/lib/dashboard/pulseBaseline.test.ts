import { describe, expect, it } from "vitest";
import {
  assessPulseBaselineUpdate,
  compute14DayPulseBaseline,
  detectSignificantPulseDrop,
  excludePersistedCheckIn,
} from "../../../../supabase/functions/chat/pulseBaseline.ts";

const day = (offset: number, mood: number) => ({
  date: new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString(),
  mood,
});

describe("detectSignificantPulseDrop", () => {
  it("flags when new mood is exactly 3 points below baseline", () => {
    expect(detectSignificantPulseDrop(4, 7)).toBe(true);
  });

  it("does not flag when drop is less than 3 points", () => {
    expect(detectSignificantPulseDrop(5, 7)).toBe(false);
  });
});

describe("assessPulseBaselineUpdate (REQ-05)", () => {
  it("compares against prior baseline, not the average that includes the new mood", () => {
    const priorMoods = [day(1, 7), day(2, 7)];
    const assessment = assessPulseBaselineUpdate(priorMoods, 4, new Date().toISOString());

    expect(assessment.baselineBeforeCheckIn).toBe(7);
    expect(assessment.significantPulseDrop).toBe(true);
    expect(assessment.pulseBaseline).toBe(6);
  });

  it("detects a 3-point drop on a full 14-day stable history", () => {
    const priorMoods = Array.from({ length: 14 }, (_, index) => day(index + 1, 7));
    const assessment = assessPulseBaselineUpdate(priorMoods, 4, new Date().toISOString());

    expect(assessment.baselineBeforeCheckIn).toBe(7);
    expect(assessment.significantPulseDrop).toBe(true);
    expect(compute14DayPulseBaseline([...priorMoods, { date: new Date().toISOString(), mood: 4 }])).toBe(
      assessment.pulseBaseline,
    );
  });

  it("would miss the drop if the new mood were included in the comparison baseline", () => {
    const priorMoods = [day(1, 7), day(2, 7)];
    const pollutedBaseline = compute14DayPulseBaseline([
      ...priorMoods,
      { date: new Date().toISOString(), mood: 4 },
    ]);

    expect(detectSignificantPulseDrop(4, pollutedBaseline)).toBe(false);
    expect(assessPulseBaselineUpdate(priorMoods, 4, new Date().toISOString()).significantPulseDrop).toBe(
      true,
    );
  });
});

describe("excludePersistedCheckIn", () => {
  it("removes one same-day entry with matching mood", () => {
    const checkInDate = "2026-07-20T12:00:00.000Z";
    const moods = [
      { date: checkInDate, mood: 4 },
      { date: "2026-07-19T12:00:00.000Z", mood: 7 },
    ];

    expect(excludePersistedCheckIn(moods, 4, checkInDate)).toEqual([
      { date: "2026-07-19T12:00:00.000Z", mood: 7 },
    ]);
  });
});
