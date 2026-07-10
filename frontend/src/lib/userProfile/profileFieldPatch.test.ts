import { describe, expect, it } from "vitest";

/** Test helper mirroring profileFieldPatch sync map. */
const ONBOARDING_TO_PROFILE_COLUMN: Record<string, string> = {
  stabilityScore: "stabilityScore",
  alignmentScore: "alignmentScore",
  performanceScore: "performanceScore",
  orientationScore: "orientationScore",
  orientation_score1_number: "orientationScore",
  classification: "classification",
  pressureProfile: "pressureProfile",
  behavioralFingerprint: "behavioralFingerprint",
  aiConfidenceLevel: "aiConfidenceLevel",
};

function profileColumnsFromOnboardingPatch(
  onboardingPatch: Record<string, unknown>,
): Record<string, unknown> {
  const profilePatch: Record<string, unknown> = {};
  for (const [onboardingKey, profileKey] of Object.entries(ONBOARDING_TO_PROFILE_COLUMN)) {
    if (onboardingKey in onboardingPatch) {
      profilePatch[profileKey] = onboardingPatch[onboardingKey];
    }
  }
  return profilePatch;
}

describe("profileColumnsFromOnboardingPatch", () => {
  it("mirrors score and classification fields onto profile columns", () => {
    expect(
      profileColumnsFromOnboardingPatch({
        stabilityScore: 3.2,
        alignmentScore: 2.2,
        classification: "bTHys",
        pressureProfile: "Cognitive Overload + Regulated Nervous System",
      }),
    ).toEqual({
      stabilityScore: 3.2,
      alignmentScore: 2.2,
      classification: "bTHys",
      pressureProfile: "Cognitive Overload + Regulated Nervous System",
    });
  });

  it("maps legacy orientation_score1_number to orientationScore column", () => {
    expect(
      profileColumnsFromOnboardingPatch({
        orientation_score1_number: 3,
      }),
    ).toEqual({
      orientationScore: 3,
    });
  });
});
