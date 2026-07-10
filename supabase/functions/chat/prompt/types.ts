export type ProfileData = {
  firstName?: string;
  roleType?: string;
  primaryPillar?: string;
  results?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
};

export type CoachingModeSlug =
  | "protector"
  | "stabilizer"
  | "simplifier"
  | "rebuilder"
  | "strategist";

export type ResolvedCoachingModes = {
  /** Primary mode after Protector replacement (never last-wins list). */
  primary: CoachingModeSlug;
  /** Overlay modes stacked on primary (e.g. Simplifier). */
  overlays: CoachingModeSlug[];
  /** All active modes in assembly order: primary then overlays. */
  active: CoachingModeSlug[];
};

export type AiConfidenceLevel =
  | "exploratory"
  | "exploratory+"
  | "guided"
  | "direct";
