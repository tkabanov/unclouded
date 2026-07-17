import type { ModuleSlug } from "./moduleSlugs";

export type ModuleAvailabilityStatus =
  | "locked"
  | "available"
  | "completed"
  | "refresh_available";

export type ModuleSchedulerInput = {
  stabilityScores: Record<string, number>;
  performanceScores: Record<string, number>;
  alignmentScores: Record<string, number>;
  loadSignals: Record<string, string>;
  stateSignals: Record<string, string>;
  behavioralPatterns: Record<string, string>;
  healthFlags: { grief_mode_active: boolean };
};

export type ModuleAvailabilityEntry = {
  slug: ModuleSlug;
  status: ModuleAvailabilityStatus;
  daysUntilUnlock: number;
  scheduledAt: string;
  unlockedAt: string | null;
  completedAt: string | null;
};

export type OnboardingModulePreview = {
  slug: ModuleSlug;
  displayTitle: string;
  daysUntilUnlock: number;
};

export type ModuleAvailabilityMap = Record<ModuleSlug, ModuleAvailabilityEntry>;
