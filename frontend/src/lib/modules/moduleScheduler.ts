import { getModuleDefinition } from "./moduleConfigApi";
import { MODULE_DEFAULT_UNLOCK_DAYS } from "./moduleRegistry";
import { MODULE_PREVIEW_TIE_ORDER, resolveUnlockDay } from "./moduleAcceleratedTriggers";
import type { ModuleProfileInput } from "./readModuleProfile";
import { isModuleComplete, readModuleSchedules } from "./readModuleProfile";
import type { ModuleScheduleEntry, ModuleSchedules } from "./moduleScheduleTypes";
import type {
  ModuleAvailabilityEntry,
  ModuleAvailabilityMap,
  ModuleAvailabilityStatus,
  ModuleSchedulerInput,
  OnboardingModulePreview,
} from "./moduleSchedulerTypes";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

export function toModuleSchedulerInput(input: {
  stabilityScores: Record<string, number>;
  performanceScores: Record<string, number>;
  alignmentScores: Record<string, number>;
  loadSignals: Record<string, string>;
  stateSignals: Record<string, string>;
  behavioralPatterns: Record<string, string>;
  healthFlags: { grief_mode_active: boolean };
}): ModuleSchedulerInput {
  return {
    stabilityScores: input.stabilityScores,
    performanceScores: input.performanceScores,
    alignmentScores: input.alignmentScores,
    loadSignals: input.loadSignals,
    stateSignals: input.stateSignals,
    behavioralPatterns: input.behavioralPatterns,
    healthFlags: { grief_mode_active: input.healthFlags.grief_mode_active },
  };
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = startOfUtcDay(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function calendarDaysUntil(from: Date, to: Date): number {
  const diffMs = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

export function buildModuleSchedules(
  input: ModuleSchedulerInput,
  anchorDate: Date,
): ModuleSchedules {
  const schedules: ModuleSchedules = {};

  for (const slug of MODULE_SLUGS) {
    const unlockDay = resolveUnlockDay(slug, input);
    schedules[slug] = {
      scheduledAt: addCalendarDays(anchorDate, unlockDay).toISOString(),
      unlockedAt: null,
      completedAt: null,
    };
  }

  return schedules;
}

export function daysUntilUnlockForSchedule(
  scheduledAt: string,
  anchorDate: Date,
  now: Date = anchorDate,
): number {
  const scheduled = new Date(scheduledAt);
  if (now.getTime() >= scheduled.getTime()) {
    return 0;
  }
  return calendarDaysUntil(now, scheduled);
}

export type OnboardingModuleScheduleResult = {
  schedules: ModuleSchedules;
  preview: OnboardingModulePreview;
};

/** Shared onboarding preview pipeline — Results UI and completeOnboarding persist. */
export function computeOnboardingModulePreview(
  input: Parameters<typeof toModuleSchedulerInput>[0],
  anchorDate: Date,
  now: Date = anchorDate,
): OnboardingModuleScheduleResult {
  const schedulerInput = toModuleSchedulerInput(input);
  const schedules = buildModuleSchedules(schedulerInput, anchorDate);
  const preview = getOnboardingModulePreview(schedules, anchorDate, now);
  return { schedules, preview };
}

export function getOnboardingModulePreview(
  schedules: ModuleSchedules,
  anchorDate: Date,
  now: Date = anchorDate,
): OnboardingModulePreview {
  let bestSlug: ModuleSlug = "body";
  let bestDays = Number.POSITIVE_INFINITY;

  for (const slug of MODULE_PREVIEW_TIE_ORDER) {
    const entry = schedules[slug];
    if (!entry) continue;
    const days = daysUntilUnlockForSchedule(entry.scheduledAt, anchorDate, now);
    if (days < bestDays) {
      bestDays = days;
      bestSlug = slug;
    }
  }

  return {
    slug: bestSlug,
    displayTitle: getModuleDefinition(bestSlug).displayTitle,
    daysUntilUnlock: bestDays === Number.POSITIVE_INFINITY ? 5 : bestDays,
  };
}

function resolveAvailabilityStatus(
  profile: ModuleProfileInput,
  slug: ModuleSlug,
  entry: ModuleScheduleEntry | undefined,
  scheduledAt: string,
  now: Date,
): ModuleAvailabilityStatus {
  if (isModuleComplete(profile, slug)) {
    if (entry?.refreshOfferedAt) {
      return "refresh_available";
    }
    return "completed";
  }
  if (now.getTime() >= new Date(scheduledAt).getTime()) {
    return "available";
  }
  return "locked";
}

export function getModuleAvailability(
  profile: ModuleProfileInput,
  now: Date,
): ModuleAvailabilityMap {
  const schedules = readModuleSchedules(profile);
  const availability = {} as ModuleAvailabilityMap;

  for (const slug of MODULE_SLUGS) {
    const entry = schedules[slug];
    const scheduledAt =
      entry?.scheduledAt ?? addCalendarDays(now, MODULE_DEFAULT_UNLOCK_DAYS[slug]).toISOString();
    const status = entry
      ? resolveAvailabilityStatus(profile, slug, entry, scheduledAt, now)
      : isModuleComplete(profile, slug)
        ? "completed"
        : "locked";

    const daysUntilUnlock =
      status === "completed" ||
      status === "available" ||
      status === "refresh_available"
        ? 0
        : calendarDaysUntil(now, new Date(scheduledAt));

    availability[slug] = {
      slug,
      status,
      daysUntilUnlock,
      scheduledAt,
      unlockedAt:
        status === "completed" ||
        status === "available" ||
        status === "refresh_available"
          ? entry?.unlockedAt ?? scheduledAt
          : null,
      completedAt: entry?.completedAt ?? null,
    };
  }

  return availability;
}
