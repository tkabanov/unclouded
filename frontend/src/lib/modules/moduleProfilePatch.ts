import type { AiConfidenceLevelSlug } from "@/lib/enums/coachingMode";
import { computeAiConfidenceLevel } from "@/lib/userProfile/resolveAiConfidenceLevel";

import { getModuleDefinition } from "./moduleConfigApi";
import type { ModuleSideEffectResult } from "./moduleConfigTypes";
import {
  MODULE_ANSWER_FIELD_COLUMNS,
  MODULE_FIELD_ONBOARDING_ALIASES,
  type ModuleAnswerFieldKey,
} from "./moduleFieldKeys";
import type { ModuleProfileInput } from "./readModuleProfile";
import { readModuleSchedules, readModulesCompletedCount } from "./readModuleProfile";
import { clearModuleRefreshOffer } from "./moduleRefresh";
import type { ModuleScheduleEntry, ModuleSchedules } from "./moduleScheduleTypes";
import type { ModuleSlug } from "./moduleSlugs";

export type ModuleCompletionPatchInput = {
  slug: ModuleSlug;
  mappedAnswers: Partial<Record<ModuleAnswerFieldKey, unknown>>;
  sideEffects: ModuleSideEffectResult;
  profile: ModuleProfileInput;
  completedAt: string;
};

export type ModuleCompletionPatch = {
  profileColumns: Record<string, unknown>;
  onboardingData: Record<string, unknown>;
  results: Record<string, unknown> | null;
  moduleSchedules: ModuleSchedules;
  modulesCompletedCount: number;
  aiConfidenceLevel: AiConfidenceLevelSlug;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Raw slug preserved in onboardingData; typed column may differ. */
export function coerceModuleFieldForDb(
  fieldKey: ModuleAnswerFieldKey,
  rawValue: unknown,
): unknown {
  if (fieldKey === "identityRoleFusionScore") {
    if (typeof rawValue === "number") return rawValue;
    if (typeof rawValue === "string" && rawValue.trim()) {
      const parsed = Number.parseInt(rawValue, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  if (fieldKey === "chronicPainFlag") {
    if (typeof rawValue === "boolean") return rawValue;
    if (typeof rawValue === "string") {
      return rawValue !== "no";
    }
    return null;
  }

  if (fieldKey === "hormonalContextFlag" || fieldKey === "spiritualFrameworkPresent") {
    if (typeof rawValue === "boolean") return rawValue;
    return null;
  }

  return rawValue;
}

function mergeOnboardingFieldAliases(
  onboardingPatch: Record<string, unknown>,
  fieldKey: ModuleAnswerFieldKey,
  rawValue: unknown,
): void {
  const alias = MODULE_FIELD_ONBOARDING_ALIASES[fieldKey];
  if (alias) {
    onboardingPatch[alias] = rawValue;
  }
}

function mergeTraumaInformedResults(
  existingResults: Record<string, unknown>,
  sideEffects: ModuleSideEffectResult,
): Record<string, unknown> {
  const merged = { ...existingResults };
  const existingTrauma = merged.trauma_informed_mode === true;
  const newTrauma = sideEffects.resultsPatch.trauma_informed_mode === true;
  if (existingTrauma || newTrauma) {
    merged.trauma_informed_mode = true;
  }
  return merged;
}

function buildUpdatedSchedule(
  slug: ModuleSlug,
  profile: ModuleProfileInput,
  completedAt: string,
): ModuleSchedules {
  const schedules = { ...readModuleSchedules(profile) };
  const existing = schedules[slug];
  const entry: ModuleScheduleEntry = {
    scheduledAt: existing?.scheduledAt ?? completedAt,
    unlockedAt: existing?.unlockedAt ?? existing?.scheduledAt ?? completedAt,
    completedAt,
  };
  schedules[slug] = entry;
  return schedules;
}

export function buildModuleCompletionPatch(input: ModuleCompletionPatchInput): ModuleCompletionPatch {
  const { slug, mappedAnswers, sideEffects, profile, completedAt } = input;
  const definition = getModuleDefinition(slug);
  const previousCount = readModulesCompletedCount(profile);
  const newCount = previousCount + 1;
  const aiConfidenceLevel = computeAiConfidenceLevel(newCount);

  const profileColumns: Record<string, unknown> = {
    [definition.completeFlagColumn]: true,
    modulesCompletedCount: newCount,
    aiConfidenceLevel,
  };

  const onboardingData: Record<string, unknown> = {
    [definition.onboardingCompleteFlag]: true,
    modules_completed_count_number: newCount,
    modules_completed_count: newCount,
    aiConfidenceLevel,
    last_completed_module_slug: slug,
    last_completed_module_name: definition.aiShortName,
    last_completed_module_at: completedAt,
  };

  for (const [fieldKey, rawValue] of Object.entries(mappedAnswers) as [
    ModuleAnswerFieldKey,
    unknown,
  ][]) {
    const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
    profileColumns[column] = coerceModuleFieldForDb(fieldKey, rawValue);
    mergeOnboardingFieldAliases(onboardingData, fieldKey, rawValue);
  }

  for (const [fieldKey, value] of Object.entries(sideEffects.profileFields) as [
    ModuleAnswerFieldKey,
    unknown,
  ][]) {
    const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
    profileColumns[column] = coerceModuleFieldForDb(fieldKey, value);
    mergeOnboardingFieldAliases(onboardingData, fieldKey, value);
  }

  const existingOnboarding = asRecord(profile.onboardingData);
  const existingResults = asRecord(profile.results);

  const moduleSchedules = buildUpdatedSchedule(slug, profile, completedAt);
  const results = mergeTraumaInformedResults(existingResults, sideEffects);

  return {
    profileColumns,
    onboardingData: {
      ...existingOnboarding,
      ...onboardingData,
    },
    results: Object.keys(results).length > 0 ? results : null,
    moduleSchedules,
    modulesCompletedCount: newCount,
    aiConfidenceLevel,
  };
}

export type ModuleRefreshPatchInput = {
  slug: ModuleSlug;
  mappedAnswers: Partial<Record<ModuleAnswerFieldKey, unknown>>;
  sideEffects: ModuleSideEffectResult;
  profile: ModuleProfileInput;
  completedAt: string;
};

export type ModuleRefreshPatchResult = {
  profileColumns: Record<string, unknown>;
  onboardingData: Record<string, unknown>;
  results: Record<string, unknown> | null;
  moduleSchedules: ModuleSchedules;
};

function buildRefreshedSchedule(
  slug: ModuleSlug,
  profile: ModuleProfileInput,
  completedAt: string,
): ModuleSchedules {
  const schedules = clearModuleRefreshOffer(readModuleSchedules(profile), slug);
  const existing = schedules[slug];
  schedules[slug] = {
    scheduledAt: existing?.scheduledAt ?? completedAt,
    unlockedAt: existing?.unlockedAt ?? existing?.scheduledAt ?? completedAt,
    completedAt,
    unlockNotifiedAt: existing?.unlockNotifiedAt ?? null,
    unlockResentAt: existing?.unlockResentAt ?? null,
    refreshOfferedAt: null,
    refreshReason: null,
  };
  return schedules;
}

export function buildModuleRefreshPatch(
  input: ModuleRefreshPatchInput,
): ModuleRefreshPatchResult {
  const { slug, mappedAnswers, sideEffects, profile, completedAt } = input;
  const definition = getModuleDefinition(slug);
  const existingOnboarding = asRecord(profile.onboardingData);
  const existingResults = asRecord(profile.results);

  const profileColumns: Record<string, unknown> = {};
  const onboardingData: Record<string, unknown> = {
    last_refreshed_module_slug: slug,
    last_refreshed_module_name: definition.aiShortName,
    last_refreshed_module_at: completedAt,
  };

  for (const [fieldKey, rawValue] of Object.entries(mappedAnswers) as [
    ModuleAnswerFieldKey,
    unknown,
  ][]) {
    const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
    profileColumns[column] = coerceModuleFieldForDb(fieldKey, rawValue);
    mergeOnboardingFieldAliases(onboardingData, fieldKey, rawValue);
  }

  for (const [fieldKey, value] of Object.entries(sideEffects.profileFields) as [
    ModuleAnswerFieldKey,
    unknown,
  ][]) {
    const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
    profileColumns[column] = coerceModuleFieldForDb(fieldKey, value);
    mergeOnboardingFieldAliases(onboardingData, fieldKey, value);
  }

  const moduleSchedules = buildRefreshedSchedule(slug, profile, completedAt);
  const results = mergeTraumaInformedResults(existingResults, sideEffects);

  return {
    profileColumns,
    onboardingData: {
      ...existingOnboarding,
      ...onboardingData,
    },
    results: Object.keys(results).length > 0 ? results : null,
    moduleSchedules,
  };
}

export function toRefreshProfileUpdatePayload(
  patch: ModuleRefreshPatchResult,
  profile: ModuleProfileInput,
): Record<string, unknown> {
  return {
    ...patch.profileColumns,
    onboardingData: patch.onboardingData,
    moduleSchedules: patch.moduleSchedules,
    ...(patch.results ? { results: patch.results } : {}),
    modulesCompletedCount: readModulesCompletedCount(profile),
  };
}

export function toProfileUpdatePayload(patch: ModuleCompletionPatch): Record<string, unknown> {
  return {
    ...patch.profileColumns,
    onboardingData: patch.onboardingData,
    moduleSchedules: patch.moduleSchedules,
    ...(patch.results ? { results: patch.results } : {}),
  };
}
