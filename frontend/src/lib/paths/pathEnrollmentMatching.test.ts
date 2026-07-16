import { describe, expect, it } from "vitest";
import {
  pathMatchesOnboardingEnrollment,
  selectOnboardingEnrollmentPaths,
  type OnboardingEnrollmentContext,
  type PathEnrollmentCandidate,
} from "./pathEnrollmentMatching";
import { TIER } from "@/lib/enums/tier";

const BASE_CONTEXT: OnboardingEnrollmentContext = {
  primaryPillar: "professional",
  classificationName: "Building Momentum",
  recoveryModeActive: false,
  griefModeActive: false,
  userTier: TIER.FREE,
};

const BUILDING_MOMENTUM_PATH: PathEnrollmentCandidate = {
  id: "14d5a7db-6c76-5fda-9d37-a4817e91c622",
  name: "Building Professional Momentum",
  tier: TIER.FREE,
  pillar: "professional",
  classifications: "Performance Stagnation · Building Momentum",
  triggerSignals: "enrollment:onboarding; flag:None — all users matching classification",
};

describe("pathMatchesOnboardingEnrollment", () => {
  it("matches classification and pillar for onboarding-triggered free paths", () => {
    expect(pathMatchesOnboardingEnrollment(BUILDING_MOMENTUM_PATH, BASE_CONTEXT)).toBe(true);
  });

  it("rejects paths from another pillar", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        { ...BUILDING_MOMENTUM_PATH, pillar: "emotional" },
        BASE_CONTEXT,
      ),
    ).toBe(false);
  });

  it("rejects recovery-required paths when recovery flag is inactive", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        {
          ...BUILDING_MOMENTUM_PATH,
          name: "Recovery Roadmap",
          pillar: "health",
          classifications: "All classifications — this path matches any classification",
          triggerSignals: "enrollment:onboarding; flag:recovery_mode_active = yes — MANDATORY",
        },
        { ...BASE_CONTEXT, primaryPillar: "health" },
      ),
    ).toBe(false);
  });

  it("allows recovery-required paths when recovery flag is active", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        {
          ...BUILDING_MOMENTUM_PATH,
          name: "Recovery Roadmap",
          pillar: "health",
          classifications: "All classifications — this path matches any classification",
          triggerSignals: "enrollment:onboarding; flag:recovery_mode_active = yes — MANDATORY",
        },
        { ...BASE_CONTEXT, primaryPillar: "health", recoveryModeActive: true },
      ),
    ).toBe(true);
  });

  it("rejects pro paths for free-tier users", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        { ...BUILDING_MOMENTUM_PATH, tier: TIER.PRO },
        BASE_CONTEXT,
      ),
    ).toBe(false);
  });
});

describe("selectOnboardingEnrollmentPaths", () => {
  it("prefers classification-specific paths over any-classification paths", () => {
    const selected = selectOnboardingEnrollmentPaths(
      [
        {
          ...BUILDING_MOMENTUM_PATH,
          name: "Generic Professional Path",
          classifications: "Any classification",
        },
        BUILDING_MOMENTUM_PATH,
      ],
      BASE_CONTEXT,
    );

    expect(selected.map((path) => path.name)).toEqual([
      "Building Professional Momentum",
      "Generic Professional Path",
    ]);
  });
});
