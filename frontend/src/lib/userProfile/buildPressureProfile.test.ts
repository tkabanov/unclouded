import { describe, expect, it } from "vitest";
import { STATE_NERVOUS_SYSTEM } from "@/lib/enums/wellnessState";
import { resolvePressureProfile } from "./buildPressureProfile";

describe("resolvePressureProfile (bTIAw)", () => {
  it("branch 0: joins high-intensity load texts with nervous system display", () => {
    const profile = resolvePressureProfile(
      [
        "head_rarely_feels_quiet___constant",
        "relationships_feel_mostly_supportive",
        "life_feels_mostly_manageable",
        "financial_stress_is_significant_daily_presence",
      ],
      STATE_NERVOUS_SYSTEM.WIRED,
    );

    expect(profile).toBe(
      "Cognitive Overload + Financial Stress + Wired Nervous System",
    );
  });

  it("branch 0: includes all high signals in field order", () => {
    const profile = resolvePressureProfile(
      [
        "head_rarely_feels_quiet___constant",
        "significant_conflict_or_strain_in_key_relationships",
        "overwhelmed_by_practical_demands",
        "financial_stress_is_significant_daily_presence",
      ],
      STATE_NERVOUS_SYSTEM.DEPLETED,
    );

    expect(profile).toBe(
      "Cognitive Overload + Relational Strain + Logistical Overwhelm + Financial Stress + Depleted Nervous System",
    );
  });

  it("branch 1: low external load with wired nervous system", () => {
    const profile = resolvePressureProfile(
      [
        "mind_feels_clear_most_of_the_time",
        "relationships_feel_mostly_supportive",
        "life_feels_mostly_manageable",
        "financial_situation_feels_stable",
      ],
      STATE_NERVOUS_SYSTEM.WIRED,
    );

    expect(profile).toBe(
      "Low External Load / Wired Nervous System — investigate in session",
    );
  });

  it("branch 2: low pressure default for non-wired nervous system", () => {
    const profile = resolvePressureProfile(
      [
        "some_noise_but_manageable",
        "some_friction_but_manageable",
        "stretched_but_coping",
        "some_financial_worry_but_not_consuming",
      ],
      STATE_NERVOUS_SYSTEM.REGULATED,
    );

    expect(profile).toBe("Low Pressure / Regulated Nervous System");
  });

  it("branch 2: shut down nervous system with no high load", () => {
    const profile = resolvePressureProfile(
      [
        "mind_feels_clear_most_of_the_time",
        "relationships_feel_mostly_supportive",
        "life_feels_mostly_manageable",
        "financial_situation_feels_stable",
      ],
      STATE_NERVOUS_SYSTEM.SHUT_DOWN,
    );

    expect(profile).toBe("Low Pressure / Shut Down Nervous System");
  });
});
