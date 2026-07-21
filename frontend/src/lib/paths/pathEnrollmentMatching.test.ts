import { describe, expect, it } from "vitest";
import {
  parsePathFlagRequirement,
  pathMatchesOnboardingEnrollment,
  pathVisibleInLibrary,
  selectOnboardingEnrollmentPaths,
  userCanAccessPathTier,
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

  it("rejects identity-gated paths when Identity Lens is incomplete", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        {
          ...BUILDING_MOMENTUM_PATH,
          triggerSignals:
            "enrollment:onboarding; flag:None — all users matching classification; prerequisite:module:identity",
        },
        { ...BASE_CONTEXT, moduleProfile: { moduleIdentityComplete: false } },
      ),
    ).toBe(false);
  });

  it("allows identity-gated paths when Identity Lens is complete", () => {
    expect(
      pathMatchesOnboardingEnrollment(
        {
          ...BUILDING_MOMENTUM_PATH,
          triggerSignals:
            "enrollment:onboarding; flag:None — all users matching classification; prerequisite:module:identity",
        },
        { ...BASE_CONTEXT, moduleProfile: { moduleIdentityComplete: true } },
      ),
    ).toBe(true);
  });
});

describe("parsePathFlagRequirement", () => {
  it("detects mandatory recovery and grief triggers from seeded paths", () => {
    expect(
      parsePathFlagRequirement(
        "enrollment:onboarding; flag:recovery_mode_active = yes — MANDATORY",
      ),
    ).toEqual({ kind: "recovery_required" });
    expect(
      parsePathFlagRequirement("enrollment:onboarding; flag:Requires grief_mode_active = yes"),
    ).toEqual({ kind: "grief_required" });
  });

  it("does not treat recommended grief paths as mandatory", () => {
    expect(
      parsePathFlagRequirement(
        "enrollment:onboarding; flag:Recommended with grief_mode_active = yes",
      ),
    ).toEqual({ kind: "none" });
  });

  it("detects Unsent Letter OR-flag trigger from seed migration", () => {
    expect(
      parsePathFlagRequirement(
        "flag:grief_mode_active; flag:recovery_mode_active; flag:transition_flag",
      ),
    ).toEqual({ kind: "grief_or_recovery_or_transition" });
  });
});

describe("pathVisibleInLibrary", () => {
  const RECOVERY_PATH = {
    triggerSignals: "enrollment:onboarding; flag:recovery_mode_active = yes — MANDATORY",
  };
  const GRIEF_PATH = {
    triggerSignals: "enrollment:onboarding; flag:Requires grief_mode_active = yes",
  };
  const OPEN_PATH = {
    triggerSignals: "enrollment:onboarding; flag:None — all users matching classification",
  };
  const UNSENT_LETTER_PATH: PathEnrollmentCandidate = {
    id: "c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b",
    name: "The Unsent Letter",
    tier: TIER.FREE,
    pillar: "emotional",
    classifications:
      "Capacity Erosion,Alignment Fracture,High Output Hidden Instability",
    triggerSignals: "flag:grief_mode_active; flag:recovery_mode_active; flag:transition_flag",
  };

  it("hides flag-gated paths when the user flag is inactive", () => {
    expect(
      pathVisibleInLibrary(RECOVERY_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: false,
      }),
    ).toBe(false);
    expect(
      pathVisibleInLibrary(GRIEF_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: false,
      }),
    ).toBe(false);
  });

  it("shows flag-gated paths when the matching flag is active", () => {
    expect(
      pathVisibleInLibrary(RECOVERY_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: true,
        griefModeActive: false,
      }),
    ).toBe(true);
    expect(
      pathVisibleInLibrary(GRIEF_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: true,
      }),
    ).toBe(true);
  });

  it("always shows paths without mandatory flag requirements", () => {
    expect(
      pathVisibleInLibrary(OPEN_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: false,
      }),
    ).toBe(true);
  });

  it("shows Unsent Letter when any grief, recovery, or transition flag is active", () => {
    expect(
      pathVisibleInLibrary(UNSENT_LETTER_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: false,
        transitionFlagActive: true,
      }),
    ).toBe(true);
    expect(
      pathVisibleInLibrary(UNSENT_LETTER_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: false,
        transitionFlagActive: false,
      }),
    ).toBe(false);
  });
});

describe("Unsent Letter enrollment (REQ-15)", () => {
  const UNSENT_LETTER_PATH: PathEnrollmentCandidate = {
    id: "c8e1f0a2-4b3d-5e6f-9a0b-1c2d3e4f5a6b",
    name: "The Unsent Letter",
    tier: TIER.FREE,
    pillar: "emotional",
    classifications:
      "Capacity Erosion,Alignment Fracture,High Output Hidden Instability",
    triggerSignals: "flag:grief_mode_active; flag:recovery_mode_active; flag:transition_flag",
  };

  it("allows free-tier users with grief flag to enroll (no Pro gate)", () => {
    expect(userCanAccessPathTier(TIER.FREE, UNSENT_LETTER_PATH.tier)).toBe(true);
    expect(
      pathVisibleInLibrary(UNSENT_LETTER_PATH, {
        userTier: TIER.FREE,
        recoveryModeActive: false,
        griefModeActive: true,
        transitionFlagActive: false,
      }),
    ).toBe(true);
  });

  it("is visible and tier-accessible for free users when grief flag is active", () => {
    const libraryContext = {
      userTier: TIER.FREE,
      recoveryModeActive: false,
      griefModeActive: true,
      transitionFlagActive: false,
    };
    expect(pathVisibleInLibrary(UNSENT_LETTER_PATH, libraryContext)).toBe(true);
    expect(UNSENT_LETTER_PATH.tier).toBe(TIER.FREE);
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
