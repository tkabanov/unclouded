import { describe, expect, it } from "vitest";
import { resolvePressureProfile } from "./buildPressureProfile";

describe("resolvePressureProfile", () => {
  it("treats regulated state as low severity alongside grounded signals", () => {
    const profile = resolvePressureProfile(
      {
        cognitive_load_signal: "manageable",
        relational_load_signal: "manageable",
        environmental_load_signal: "manageable",
        financial_load_signal: "manageable",
      },
      {
        nervous_system_state: "regulated",
        energy_state: "strong",
      },
    );

    expect(profile).toBe("Manageable Load");
  });

  it("returns System Overload when load and state signals are severe", () => {
    const profile = resolvePressureProfile(
      {
        cognitive_load_signal: "overwhelming",
        relational_load_signal: "severe",
        environmental_load_signal: "crisis",
        financial_load_signal: "critical",
      },
      {
        nervous_system_state: "shut_down",
        energy_state: "low",
      },
    );

    expect(profile).toBe("System Overload");
  });

  it("returns Elevated Pressure for mixed moderate-to-heavy signals", () => {
    const profile = resolvePressureProfile(
      {
        cognitive_load_signal: "heavy",
        relational_load_signal: "significant",
        environmental_load_signal: "moderate",
        financial_load_signal: "stressed",
      },
      {
        nervous_system_state: "wired",
        energy_state: "low",
      },
    );

    expect(profile).toBe("Elevated Pressure");
  });
});
