export type ProfileData = {
  firstName?: string;
  roleType?: string;
  primaryPillar?: string;
  results?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
  liveContext?: ChatLiveContext | null;
};

export interface ChatLatestCheckIn {
  date?: string | null;
  pulse?: number | null;
  feeling?: string | null;
  energyStressLevel?: number | null;
  microCommitmentStatus?: string | null;
}

export interface ChatPathReflectionAnswer {
  pathName?: string;
  sessionTitle?: string;
  questionText: string;
  answerText: string;
  answeredAt?: string;
}

/** Live user signals wired from lib fetches (T-003). */
export interface ChatLiveContext {
  latestCheckIn?: ChatLatestCheckIn | null;
  streakDays?: number | null;
  activeMicroCommitment?: string | null;
  sessionCount?: number | null;
  pathReflections?: ChatPathReflectionAnswer[];
}

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
