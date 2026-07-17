import { supabase } from "@/integrations/supabase/client";
import type { AiConfidenceLevelSlug } from "@/lib/enums/coachingMode";
import { computeAiConfidenceLevel } from "@/lib/userProfile/resolveAiConfidenceLevel";

import {
  mapAnswersToProfileFields,
  validateModuleAnswers,
} from "./moduleConfigApi";
import type { ModuleValidationResult } from "./moduleConfigTypes";
import {
  buildModuleCompletionPatch,
  buildModuleRefreshPatch,
  toProfileUpdatePayload,
  toRefreshProfileUpdatePayload,
} from "./moduleProfilePatch";
import type { ModuleProfileInput } from "./readModuleProfile";
import { isModuleComplete, readModulesCompletedCount } from "./readModuleProfile";
import { resolveSideEffectsForModule } from "./moduleSideEffects";
import { getModuleAvailability } from "./moduleScheduler";
import { isModuleSlug, type ModuleSlug } from "./moduleSlugs";

export class ModuleAlreadyCompleteError extends Error {
  readonly slug: ModuleSlug;

  constructor(slug: ModuleSlug) {
    super(`Module "${slug}" is already complete`);
    this.name = "ModuleAlreadyCompleteError";
    this.slug = slug;
  }
}

export class ModuleLockedError extends Error {
  readonly slug: ModuleSlug;
  readonly daysUntilUnlock: number;

  constructor(slug: ModuleSlug, daysUntilUnlock: number) {
    super(`Module "${slug}" is locked for ${daysUntilUnlock} more day(s)`);
    this.name = "ModuleLockedError";
    this.slug = slug;
    this.daysUntilUnlock = daysUntilUnlock;
  }
}

export class ModuleValidationFailedError extends Error {
  readonly slug: ModuleSlug;
  readonly validation: Extract<ModuleValidationResult, { ok: false }>;

  constructor(slug: ModuleSlug, validation: Extract<ModuleValidationResult, { ok: false }>) {
    super(`Module "${slug}" answers failed validation`);
    this.name = "ModuleValidationFailedError";
    this.slug = slug;
    this.validation = validation;
  }
}

export class ModuleRefreshNotAvailableError extends Error {
  readonly slug: ModuleSlug;

  constructor(slug: ModuleSlug) {
    super(`Module "${slug}" is not available for refresh`);
    this.name = "ModuleRefreshNotAvailableError";
    this.slug = slug;
  }
}

export type CompleteModuleOptions = {
  mode?: "initial" | "refresh";
  now?: Date;
};

export type CompleteModuleResult = {
  slug: ModuleSlug;
  modulesCompletedCount: number;
  aiConfidenceLevel: AiConfidenceLevelSlug;
};

const MODULE_PROFILE_SELECT = [
  "modulesCompletedCount",
  "moduleIdentityComplete",
  "moduleRelationalComplete",
  "moduleHistoryComplete",
  "moduleFinancialComplete",
  "moduleBodyComplete",
  "moduleMeaningComplete",
  "moduleSchedules",
  "onboardingData",
  "results",
  "aiConfidenceLevel",
  "identitySelfWorthSource",
  "identityNarrativeType",
  "identityRoleFusionScore",
  "identityPressureOrigin",
  "attachmentSignal",
  "conflictPattern",
  "supportSeekingCapacity",
  "intimacySafetyLevel",
  "traumaActivationLevel",
  "griefLoadLevel",
  "priorSupportType",
  "significantEvents12mo",
  "financialStabilitySignal",
  "financialAnxietyLevel",
  "financialAgencyLevel",
  "sleepQualitySignal",
  "hormonalContextFlag",
  "hormonalContextType",
  "chronicPainFlag",
  "bodyRelationship",
  "substancePatternSignal",
  "purposeClarity",
  "spiritualFrameworkPresent",
  "spiritualFrameworkType",
  "belongingLevel",
  "pressureReach",
].join(", ");

export async function loadModuleProfileForCompletion(userId: string): Promise<ModuleProfileInput> {
  const { data, error } = await supabase
    .from("profiles")
    .select(MODULE_PROFILE_SELECT)
    .eq("id", userId)
    .single();

  if (error) throw error;
  return (data ?? {}) as ModuleProfileInput;
}

/**
 * Atomic deep-dive module completion — writes answer fields, flags, count, schedule, AI confidence.
 * Separate from paths `incrementModulesCompletedCount` (Bubble path parity).
 */
export async function completeModule(
  userId: string,
  slug: string,
  answers: Record<string, unknown>,
  options: CompleteModuleOptions = {},
): Promise<CompleteModuleResult> {
  const now = options.now ?? new Date();
  const mode = options.mode ?? "initial";

  if (!isModuleSlug(slug)) {
    throw new Error(`Invalid module slug: ${slug}`);
  }

  const profile = await loadModuleProfileForCompletion(userId);
  const availability = getModuleAvailability(profile, now);

  if (mode === "refresh") {
    if (availability[slug].status !== "refresh_available") {
      throw new ModuleRefreshNotAvailableError(slug);
    }
  } else {
    if (isModuleComplete(profile, slug)) {
      throw new ModuleAlreadyCompleteError(slug);
    }

    if (availability[slug].status === "locked") {
      throw new ModuleLockedError(slug, availability[slug].daysUntilUnlock);
    }
  }

  const validation = validateModuleAnswers(slug, answers);
  if (!validation.ok) {
    throw new ModuleValidationFailedError(slug, validation);
  }

  const mappedAnswers = mapAnswersToProfileFields(slug, answers);
  const sideEffects = resolveSideEffectsForModule(slug, mappedAnswers);
  const completedAt = now.toISOString();

  if (mode === "refresh") {
    const refreshPatch = buildModuleRefreshPatch({
      slug,
      mappedAnswers,
      sideEffects,
      profile,
      completedAt,
    });

    const { error } = await supabase
      .from("profiles")
      .update(toRefreshProfileUpdatePayload(refreshPatch, profile) as never)
      .eq("id", userId);

    if (error) throw error;

    return {
      slug,
      modulesCompletedCount: readModulesCompletedCount(profile),
      aiConfidenceLevel: computeAiConfidenceLevel(readModulesCompletedCount(profile)),
    };
  }

  const patch = buildModuleCompletionPatch({
    slug,
    mappedAnswers,
    sideEffects,
    profile,
    completedAt,
  });

  const { error } = await supabase
    .from("profiles")
    .update(toProfileUpdatePayload(patch) as never)
    .eq("id", userId);

  if (error) throw error;

  if (patch.modulesCompletedCount === 1) {
    void supabase.functions.invoke("notification-milestone", {
      body: { milestone: "first_module_complete" },
    });
  }

  return {
    slug,
    modulesCompletedCount: patch.modulesCompletedCount,
    aiConfidenceLevel: patch.aiConfidenceLevel,
  };
}
