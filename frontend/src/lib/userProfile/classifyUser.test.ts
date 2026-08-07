import { describe, expect, it } from "vitest";

import { computeClassification } from "@/lib/classification";
import {
  CLASSIFICATION_OS,
  resolveClassification,
} from "./classifyUser";

describe("resolveClassification (persist pipeline)", () => {
  it("matches Step 12 for RES-SURF-001 scores 2.8 / 3.6 / 3.0", () => {
    const pressure = "Cognitive Overload + Regulated Nervous System";
    const step12 = computeClassification(2.8, 3.6, 3.0, pressure);
    const persisted = resolveClassification({
      stability_score: 2.8,
      performance_score: 3.6,
      alignment_score: 3.0,
      orientation_score: 3,
      pressure_profile: pressure,
    });

    expect(step12.key).toBe("high_output_hidden_instability");
    expect(persisted.classification.key).toBe(step12.key);
    expect(persisted.classification_os).toBe(
      CLASSIFICATION_OS.HIGH_OUTPUT_HIDDEN_INSTABILITY,
    );
  });

  it("does not require performance >= 4 for High Output (Bubble bTHzg override)", () => {
    const persisted = resolveClassification({
      stability_score: 2.8,
      performance_score: 3.5,
      alignment_score: 3.0,
      orientation_score: 3,
      pressure_profile: "",
    });
    expect(persisted.classification.key).toBe("high_output_hidden_instability");
  });
});
