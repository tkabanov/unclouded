import { describe, expect, it } from "vitest";
import { resolveTrajectoryStatement } from "../../../../../supabase/functions/generate-pup-pdf/resolveTrajectoryStatement.ts";

describe("resolveTrajectoryStatement", () => {
  it("prefers stored AI trajectory text over static trajectoryLanguage", () => {
    const ai =
      "Over the last 90 days, you've transitioned to a Comfortable Plateau — scores dipped, but the story is clearer than the numbers alone.";
    expect(resolveTrajectoryStatement(ai, "navigating_difficulty")).toBe(ai);
  });

  it("falls back to static copy when AI text is missing", () => {
    expect(resolveTrajectoryStatement(null, "navigating_difficulty")).toBe(
      "Some scores shifted down. Hard seasons show up in the data. This is honest information, not failure.",
    );
    expect(resolveTrajectoryStatement("   ", "holding_steady")).toBe(
      "Your scores are holding. Maintenance is underrated — it means you are not losing ground.",
    );
  });

  it("returns null when neither AI text nor known trajectory type is available", () => {
    expect(resolveTrajectoryStatement(undefined, null)).toBeNull();
    expect(resolveTrajectoryStatement("", "unknown_type")).toBeNull();
  });
});
