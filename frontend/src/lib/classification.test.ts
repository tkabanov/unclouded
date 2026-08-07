import { describe, expect, it } from "vitest";

import {
  classifications,
  computeResults,
  computeClassification,
  resolveClassificationCopy,
  resolveRecommendedPathNames,
  STANDING_RESULTS_DISCLAIMER,
} from "./classification";

describe("Results Screen Copy classifications", () => {
  it("defines all 7 classifications with required copy fields", () => {
    const keys = Object.keys(classifications);
    expect(keys).toHaveLength(7);

    for (const key of keys) {
      const entry = classifications[key];
      expect(entry.key).toBe(key);
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.tagline.trim().length).toBeGreaterThan(0);
      expect(entry.tradeoff.trim().length).toBeGreaterThan(0);
      expect(entry.whatThisMeans.trim().length).toBeGreaterThan(0);
      expect(entry.focusAreas).toHaveLength(3);
      for (const area of entry.focusAreas) {
        expect(area.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("resolveClassificationCopy prefers live map over stale persisted fields", () => {
    const resolved = resolveClassificationCopy({
      key: "capacity_erosion",
      name: "Capacity Erosion",
      tagline: "stale",
      tradeoff: "stale",
      whatThisMeans: "stale",
      focusAreas: ["old"],
      description: "old description",
    });

    expect(resolved?.tagline).toBe(classifications.capacity_erosion.tagline);
    expect(resolved?.tradeoff).toBe(classifications.capacity_erosion.tradeoff);
    expect(resolved?.whatThisMeans).toBe(classifications.capacity_erosion.whatThisMeans);
    expect(resolved?.focusAreas).toEqual(classifications.capacity_erosion.focusAreas);
  });

  it("computeResults uses static classification tradeoff", () => {
    const results = computeResults(
      { stability_score: 2.5 },
      { performance_score: 4.0 },
      { alignment_score: 3.5 },
      3,
      {
        cognitive_load_signal: "mind_feels_clear_most_of_the_time",
        relational_load_signal: "relationships_feel_mostly_supportive",
        environmental_load_signal: "life_feels_mostly_manageable",
        financial_load_signal: "financial_situation_feels_stable",
      },
      { nervous_system_state: "regulated", energy_level_signal: "strong" },
      { pressure_response_pattern: "push_through" },
      { recovery_mode_active: false, grief_mode_active: false, selected_flags: [] },
    );

    expect(results.tradeoff_statement).toBe(results.classification.tradeoff);
    expect(results.classification.tagline.trim().length).toBeGreaterThan(0);
    expect(results.classification.whatThisMeans.trim().length).toBeGreaterThan(0);
  });

  it("RES-SURF-001 scores map to high_output_hidden_instability (not capacity_erosion)", () => {
    // stability 2.8 / performance 3.6 / alignment 3.0 — Bubble bTHzg wrongly chose capacity_erosion
    expect(
      computeClassification(2.8, 3.6, 3.0, "Cognitive Overload + Regulated Nervous System").key,
    ).toBe("high_output_hidden_instability");
  });

  it("capacity_erosion still wins when stability < 3.0 and System Overload", () => {
    expect(computeClassification(2.8, 3.6, 3.0, "System Overload").key).toBe("capacity_erosion");
  });

  it("resolveRecommendedPathNames fills from dashboard config when engine returns fewer than 2", () => {
    const names = resolveRecommendedPathNames(
      ["Stress Regulation Foundations"],
      classifications.capacity_erosion,
      {
        recovery_mode_active: false,
        grief_mode_active: false,
        trauma_informed_mode: false,
      },
      2,
    );

    expect(names).toHaveLength(2);
    expect(names[0]).toBe("Stress Regulation Foundations");
    expect(names[1]).toBe("Sleep & Recovery Basics");
  });

  it("exports the standing results disclaimer", () => {
    expect(STANDING_RESULTS_DISCLAIMER).toContain("988");
    expect(STANDING_RESULTS_DISCLAIMER).toContain("not therapy");
  });
});
