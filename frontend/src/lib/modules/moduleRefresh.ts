import type { ResultsData } from "@/lib/classification";
import { computeScoreDeltas, type ScoreDelta } from "@/lib/reassessment";

import type { ModuleScheduleEntry, ModuleSchedules, ModuleRefreshReason } from "./moduleScheduleTypes";
import { isModuleComplete, readModuleSchedules, type ModuleProfileInput } from "./readModuleProfile";
import { getModuleAvailability } from "./moduleScheduler";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

export const LIFE_EVENT_TYPES = [
  "job_or_role_change",
  "relationship_change",
  "health_change",
  "loss_or_grief",
  "other",
] as const;

export type LifeEventType = (typeof LIFE_EVENT_TYPES)[number];

const SCORE_DROP_THRESHOLD = 0.8;

const SCORE_DIMENSION_TO_MODULE: Record<string, ModuleSlug> = {
  stability_score: "history",
  performance_score: "identity",
  alignment_score: "meaning",
  orientation_score: "financial",
};

const LIFE_EVENT_TO_MODULES: Record<LifeEventType, readonly ModuleSlug[]> = {
  job_or_role_change: ["identity", "financial"],
  relationship_change: ["relational"],
  health_change: ["body"],
  loss_or_grief: ["history", "meaning"],
  other: ["identity"],
};

export type ModuleRefreshPatch = {
  moduleSchedules: ModuleSchedules;
  onboardingDataPatch: Record<string, unknown>;
  refreshOfferedSlugs: ModuleSlug[];
  acceleratedSlugs: ModuleSlug[];
};

function cloneSchedules(schedules: ModuleSchedules): ModuleSchedules {
  return { ...schedules };
}

function ensureScheduleEntry(
  schedules: ModuleSchedules,
  slug: ModuleSlug,
  nowIso: string,
): ModuleScheduleEntry {
  const existing = schedules[slug];
  return (
    existing ?? {
      scheduledAt: nowIso,
      unlockedAt: null,
      completedAt: null,
    }
  );
}

export function offerModuleRefresh(
  schedules: ModuleSchedules,
  slugs: readonly ModuleSlug[],
  reason: ModuleRefreshReason,
  now: Date,
): ModuleSchedules {
  const nowIso = now.toISOString();
  const next = cloneSchedules(schedules);

  for (const slug of slugs) {
    const entry = ensureScheduleEntry(next, slug, nowIso);
    next[slug] = {
      ...entry,
      refreshOfferedAt: nowIso,
      refreshReason: reason,
    };
  }

  return next;
}

export function accelerateModuleUnlock(
  schedules: ModuleSchedules,
  slugs: readonly ModuleSlug[],
  now: Date,
): ModuleSchedules {
  const nowIso = now.toISOString();
  const next = cloneSchedules(schedules);

  for (const slug of slugs) {
    const entry = ensureScheduleEntry(next, slug, nowIso);
    next[slug] = {
      ...entry,
      scheduledAt: nowIso,
      unlockedAt: nowIso,
    };
  }

  return next;
}

export function clearModuleRefreshOffer(
  schedules: ModuleSchedules,
  slug: ModuleSlug,
): ModuleSchedules {
  const next = cloneSchedules(schedules);
  const entry = next[slug];
  if (!entry) return next;

  next[slug] = {
    ...entry,
    refreshOfferedAt: null,
    refreshReason: null,
  };
  return next;
}

export function computeSignificantShiftDeltas(
  first: ResultsData,
  second: ResultsData,
): ScoreDelta[] {
  return computeScoreDeltas(first, second).filter(
    (delta) => Math.abs(delta.delta) >= SCORE_DROP_THRESHOLD,
  );
}

export function hasSignificantShift(first: ResultsData, second: ResultsData): boolean {
  return computeSignificantShiftDeltas(first, second).length > 0;
}

export function mapScoreDropToModuleSlugs(deltas: ScoreDelta[]): ModuleSlug[] {
  const slugs = new Set<ModuleSlug>();

  for (const delta of deltas) {
    if (delta.delta > -SCORE_DROP_THRESHOLD) continue;
    const slug = SCORE_DIMENSION_TO_MODULE[delta.key];
    if (slug) slugs.add(slug);
  }

  return [...slugs];
}

export function mapLifeEventToModuleSlugs(eventType: LifeEventType): ModuleSlug[] {
  return [...LIFE_EVENT_TO_MODULES[eventType]];
}

export function listCompletedModuleSlugs(profile: ModuleProfileInput): ModuleSlug[] {
  return MODULE_SLUGS.filter((slug) => isModuleComplete(profile, slug));
}

export function listLockedModuleSlugs(
  profile: ModuleProfileInput,
  now: Date = new Date(),
): ModuleSlug[] {
  const availability = getModuleAvailability(profile, now);
  return MODULE_SLUGS.filter((slug) => availability[slug].status === "locked");
}

export function buildReassessmentModuleRefreshPatch(
  profile: ModuleProfileInput,
  firstResults: ResultsData,
  secondResults: ResultsData,
  now: Date = new Date(),
): ModuleRefreshPatch {
  let schedules = readModuleSchedules(profile);
  const completedSlugs = listCompletedModuleSlugs(profile);
  const lockedSlugs = listLockedModuleSlugs(profile, now);

  schedules = offerModuleRefresh(schedules, completedSlugs, "reassessment_90d", now);
  schedules = accelerateModuleUnlock(schedules, lockedSlugs, now);

  const significantDeltas = computeSignificantShiftDeltas(firstResults, secondResults);
  const scoreDropSlugs = mapScoreDropToModuleSlugs(significantDeltas);
  if (scoreDropSlugs.length > 0) {
    schedules = accelerateModuleUnlock(schedules, scoreDropSlugs, now);
    schedules = offerModuleRefresh(schedules, scoreDropSlugs, "score_drop", now);
  }

  const refreshOfferedSlugs = [
    ...new Set<ModuleSlug>([...completedSlugs, ...scoreDropSlugs]),
  ];

  return {
    moduleSchedules: schedules,
    onboardingDataPatch: {
      significant_shift_flag: significantDeltas.length > 0 ? "yes" : "no",
    },
    refreshOfferedSlugs,
    acceleratedSlugs: [...new Set<ModuleSlug>([...lockedSlugs, ...scoreDropSlugs])],
  };
}

export function buildLifeEventModuleRefreshPatch(
  profile: ModuleProfileInput,
  eventType: LifeEventType,
  now: Date = new Date(),
): ModuleRefreshPatch {
  let schedules = readModuleSchedules(profile);
  const slugs = mapLifeEventToModuleSlugs(eventType);
  const completedSlugs = slugs.filter((slug) => isModuleComplete(profile, slug));
  const lockedSlugs = slugs.filter((slug) => !isModuleComplete(profile, slug));

  if (completedSlugs.length > 0) {
    schedules = offerModuleRefresh(schedules, completedSlugs, "life_event", now);
  }
  if (lockedSlugs.length > 0) {
    schedules = accelerateModuleUnlock(schedules, lockedSlugs, now);
  }

  return {
    moduleSchedules: schedules,
    onboardingDataPatch: {
      last_life_event_type: eventType,
      last_life_event_at: now.toISOString(),
    },
    refreshOfferedSlugs: completedSlugs,
    acceleratedSlugs: lockedSlugs,
  };
}

export function buildUserInitiatedRefreshPatch(
  profile: ModuleProfileInput,
  slugs: readonly ModuleSlug[],
  now: Date = new Date(),
): ModuleRefreshPatch {
  const completedSlugs = slugs.filter((slug) => isModuleComplete(profile, slug));
  const schedules = offerModuleRefresh(
    readModuleSchedules(profile),
    completedSlugs,
    "user_initiated",
    now,
  );

  return {
    moduleSchedules: schedules,
    onboardingDataPatch: {},
    refreshOfferedSlugs: completedSlugs,
    acceleratedSlugs: [],
  };
}
