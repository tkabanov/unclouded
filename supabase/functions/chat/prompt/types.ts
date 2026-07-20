export type AboutYouProfileData = {
  ageRange?: string | null;
  careerStage?: string | null;
  genderIdentity?: string | null;
  employmentStatus?: string | null;
  industry?: string | null;
  companySize?: string | null;
  workEnvironment?: string | null;
  managesATeam?: boolean | null;
  relationshipStatus?: string | null;
  parentingStatus?: string | null;
  chronicHealthCondition?: string | null;
  physicalActivityLevel?: string | null;
  stateRegion?: string | null;
  timeZone?: string | null;
};

export type ModuleProfileFields = {
  modulesCompletedCount?: number | null;
  moduleIdentityComplete?: boolean | null;
  moduleRelationalComplete?: boolean | null;
  moduleHistoryComplete?: boolean | null;
  moduleFinancialComplete?: boolean | null;
  moduleBodyComplete?: boolean | null;
  moduleMeaningComplete?: boolean | null;
  moduleSchedules?: Record<string, unknown> | null;
  identitySelfWorthSource?: string | null;
  identityNarrativeType?: string | null;
  identityRoleFusionScore?: number | null;
  identityPressureOrigin?: string | null;
  attachmentSignal?: string | null;
  conflictPattern?: string | null;
  supportSeekingCapacity?: string | null;
  intimacySafetyLevel?: string | null;
  traumaActivationLevel?: string | null;
  griefLoadLevel?: string | null;
  priorSupportType?: string | null;
  significantEvents12mo?: unknown;
  financialStabilitySignal?: string | null;
  financialAnxietyLevel?: string | null;
  financialAgencyLevel?: string | null;
  sleepQualitySignal?: string | null;
  hormonalContextFlag?: boolean | null;
  hormonalContextType?: string | null;
  chronicPainFlag?: boolean | null;
  bodyRelationship?: string | null;
  substancePatternSignal?: string | null;
  purposeClarity?: string | null;
  spiritualFrameworkPresent?: boolean | null;
  spiritualFrameworkType?: string | null;
  belongingLevel?: string | null;
  pressureReach?: string | null;
};

export type ProfileData = {
  firstName?: string;
  roleType?: string;
  primaryPillar?: string;
  tier?: string | null;
  subscribed?: boolean | null;
  results?: Record<string, unknown> | null;
  onboardingData?: Record<string, unknown> | null;
  liveContext?: ChatLiveContext | null;
  aboutYou?: AboutYouProfileData | null;
  moduleProfile?: ModuleProfileFields | null;
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

export interface ChatActivePathProgress {
  pathName: string;
  pathSubMode?: string | null;
  status: string;
  completedSessionsCount: number;
  totalSessionsCount: number | null;
  currentSessionTitle: string | null;
  nextSessionTitle: string | null;
  hasActivePaths: boolean;
}

export interface ChatReassessmentContext {
  trajectoryType?: string | null;
  reflectionQ1?: string | null;
  reflectionQ2?: string | null;
  reflectionQ3?: string | null;
  reflectionQ4?: string | null;
  pathAdaptiveQ?: string | null;
  pathAdaptiveAnswer?: string | null;
  assessmentDate?: string | null;
}

/** Live user signals wired from lib fetches (T-003). */
export interface ChatLiveContext {
  latestCheckIn?: ChatLatestCheckIn | null;
  streakDays?: number | null;
  activeMicroCommitment?: string | null;
  /** Path micro-commitments the user marked complete (most recent first). */
  completedMicroCommitments?: string[];
  sessionCount?: number | null;
  pathReflections?: ChatPathReflectionAnswer[];
  activePathProgress?: ChatActivePathProgress | null;
  latestReassessment?: ChatReassessmentContext | null;
  /** Layer 10 addendum — session delivery medium. */
  sessionType?: "text" | "voice" | "quick_checkin" | null;
  /** Block 3.36 — latest voice utterance carried elevated vocal emotion signal. */
  voiceEmotionDetected?: boolean | null;
  /** Layer 10 addendum — days since last completed session. */
  daysSinceLastSession?: number | null;
  /** Layer 10 addendum — prior session had Level 2+ crisis. */
  hasPriorCrisisSession?: boolean | null;
  /** Layer 10 addendum — check-in pulse dropped ≥3 from baseline. */
  significantPulseDrop?: boolean | null;
  /** Current session exchange count for pacing (Layer 13). */
  exchangeCount?: number | null;
  /** Compressed longitudinal memory facts block (≤200 tokens target). */
  memoryFactsBlock?: string | null;
  /** REQ-12 — older session summaries replaced by arc summary in Layer 10. */
  sessionMemoryCompressed?: boolean | null;
  /** Mid-cycle state check trigger (significant life event). */
  significantLifeEventFlag?: boolean | null;
}

export type CoachingModeSlug =
  | "protector"
  | "stabilizer"
  | "simplifier"
  | "rebuilder"
  | "builder"
  | "optimizer";

export type ResolvedCoachingModes = {
  /** Primary mode after Protector replacement (never last-wins list). */
  primary: CoachingModeSlug;
  /** Overlay modes stacked on primary (e.g. Simplifier). */
  overlays: CoachingModeSlug[];
  /** All active modes in assembly order: primary then overlays. */
  active: CoachingModeSlug[];
};

/** exploratory+ kept for compat; mapped to guided prompt text. */
export type AiConfidenceLevel =
  | "exploratory"
  | "exploratory+"
  | "guided"
  | "direct";
