import {
  asBooleanText,
  asNumberText,
  asRecord,
  readModulesCompletedCount,
  resolveCompletedModules,
  sanitizePromptField,
} from "./profileHelpers.ts";
import type { ModuleProfileFields, ProfileData } from "./types.ts";

type ModuleAnswerFieldSpec = {
  column: keyof ModuleProfileFields;
  label: string;
  onboardingAlias?: string;
};

type ModuleContextEntry = {
  name: string;
  completeColumn: keyof ModuleProfileFields;
  fields: ModuleAnswerFieldSpec[];
  incompleteProbe: string;
};

const MODULE_CONTEXT_ENTRIES: ModuleContextEntry[] = [
  {
    name: "Identity Lens",
    completeColumn: "moduleIdentityComplete",
    incompleteProbe:
      "When things go wrong, what's the story you tell yourself about why?",
    fields: [
      { column: "identitySelfWorthSource", label: "identity_self_worth_source", onboardingAlias: "identity_self_worth_source" },
      { column: "identityNarrativeType", label: "identity_narrative_type", onboardingAlias: "identity_narrative_type" },
      { column: "identityRoleFusionScore", label: "identity_role_fusion_score", onboardingAlias: "identity_role_fusion_score" },
      { column: "identityPressureOrigin", label: "identity_pressure_origin", onboardingAlias: "identity_pressure_origin" },
    ],
  },
  {
    name: "Relational Blueprint",
    completeColumn: "moduleRelationalComplete",
    incompleteProbe:
      "Tell me about who you have around you right now — who actually shows up for you?",
    fields: [
      { column: "attachmentSignal", label: "attachment_signal", onboardingAlias: "attachment_signal" },
      { column: "conflictPattern", label: "conflict_pattern", onboardingAlias: "conflict_pattern" },
      { column: "supportSeekingCapacity", label: "support_seeking_capacity", onboardingAlias: "support_seeking_capacity" },
      { column: "intimacySafetyLevel", label: "intimacy_safety_level", onboardingAlias: "intimacy_safety_level" },
    ],
  },
  {
    name: "History & Context",
    completeColumn: "moduleHistoryComplete",
    incompleteProbe:
      "Has this pattern shown up for you before, or does it feel like something new?",
    fields: [
      { column: "traumaActivationLevel", label: "trauma_activation_level", onboardingAlias: "trauma_activation_level" },
      { column: "griefLoadLevel", label: "grief_load_level", onboardingAlias: "grief_load_level" },
      { column: "priorSupportType", label: "prior_support_type", onboardingAlias: "prior_support_type" },
      { column: "significantEvents12mo", label: "significant_events_12mo", onboardingAlias: "significant_events_12mo" },
    ],
  },
  {
    name: "Financial Reality",
    completeColumn: "moduleFinancialComplete",
    incompleteProbe:
      "How much of your stress is practical versus emotional right now — is there a money layer to any of this?",
    fields: [
      { column: "financialStabilitySignal", label: "financial_stability_signal", onboardingAlias: "financial_stability_signal" },
      { column: "financialAnxietyLevel", label: "financial_anxiety_level", onboardingAlias: "financial_anxiety_level" },
      { column: "financialAgencyLevel", label: "financial_agency_level", onboardingAlias: "financial_agency_level" },
    ],
  },
  {
    name: "Body's Story",
    completeColumn: "moduleBodyComplete",
    incompleteProbe:
      "How is your body holding all of this — what physical signals are you getting?",
    fields: [
      { column: "sleepQualitySignal", label: "sleep_quality_signal", onboardingAlias: "sleep_quality_signal" },
      { column: "hormonalContextFlag", label: "hormonal_context_flag", onboardingAlias: "hormonal_context_flag" },
      { column: "hormonalContextType", label: "hormonal_context_type", onboardingAlias: "hormonal_context_type" },
      { column: "chronicPainFlag", label: "chronic_pain_flag", onboardingAlias: "chronic_pain_flag" },
      { column: "bodyRelationship", label: "body_relationship", onboardingAlias: "body_relationship" },
      { column: "substancePatternSignal", label: "substance_pattern_signal", onboardingAlias: "substance_pattern_signal" },
    ],
  },
  {
    name: "What Holds You",
    completeColumn: "moduleMeaningComplete",
    incompleteProbe:
      "What do you reach for when the usual things aren't working? What actually helps?",
    fields: [
      { column: "purposeClarity", label: "purpose_clarity", onboardingAlias: "purpose_clarity" },
      { column: "spiritualFrameworkPresent", label: "spiritual_framework_present", onboardingAlias: "spiritual_framework_present" },
      { column: "spiritualFrameworkType", label: "spiritual_framework_type", onboardingAlias: "spiritual_framework_type" },
      { column: "belongingLevel", label: "belonging_level", onboardingAlias: "belonging_level" },
      { column: "pressureReach", label: "pressure_reach", onboardingAlias: "pressure_reach" },
    ],
  },
];

function isModuleComplete(profile: ProfileData, entry: ModuleContextEntry): boolean {
  return profile.moduleProfile?.[entry.completeColumn] === true;
}

function readFieldValue(
  profile: ProfileData,
  field: ModuleAnswerFieldSpec,
): unknown {
  const moduleProfile = profile.moduleProfile;
  const columnValue = moduleProfile?.[field.column];
  if (columnValue !== null && columnValue !== undefined) {
    return columnValue;
  }

  if (!field.onboardingAlias) return null;
  const onboardingData = asRecord(profile.onboardingData);
  return onboardingData[field.onboardingAlias] ?? null;
}

function formatFieldValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return asBooleanText(value);
  if (typeof value === "number") return asNumberText(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? sanitizePromptField(trimmed, 120) : null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => (typeof item === "string" ? sanitizePromptField(item, 80) : null))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    try {
      return sanitizePromptField(JSON.stringify(value), 200);
    } catch {
      return null;
    }
  }
  return null;
}

/** Append module answer fields for completed modules only (Build Brief §11 / Prompt Library §10). */
export function buildModuleProfileDataLines(profile: ProfileData): string[] {
  const lines: string[] = [];

  for (const entry of MODULE_CONTEXT_ENTRIES) {
    if (!isModuleComplete(profile, entry)) continue;

    const fieldLines: string[] = [];
    for (const field of entry.fields) {
      const formatted = formatFieldValue(readFieldValue(profile, field));
      if (formatted) {
        fieldLines.push(`${field.label}=${formatted}`);
      }
    }

    if (fieldLines.length > 0) {
      lines.push(`${entry.name} (complete): ${fieldLines.join("; ")}`);
    } else {
      lines.push(`${entry.name} (complete): no answer fields recorded`);
    }
  }

  return lines;
}

/** Per-module incomplete probes — Build Brief §11 «What Gidget Knows It Doesn't Know». */
export function buildModuleIncompleteProbes(profile: ProfileData): string | null {
  const incomplete = MODULE_CONTEXT_ENTRIES.filter((entry) => !isModuleComplete(profile, entry));
  if (incomplete.length === 0) return null;

  const lines = incomplete.map(
    (entry) => `- ${entry.name} incomplete: probe "${entry.incompleteProbe}"`,
  );
  return `MODULE INCOMPLETE — probe when relevant:\n${lines.join("\n")}`;
}

export function readLastCompletedModuleName(profile: ProfileData): string | null {
  const onboardingData = asRecord(profile.onboardingData);
  const raw =
    onboardingData.last_completed_module_name ??
    onboardingData.lastCompletedModuleName;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return sanitizePromptField(raw, 80);
}

export function readLastCompletedModuleAt(profile: ProfileData): Date | null {
  const onboardingData = asRecord(profile.onboardingData);
  const raw =
    onboardingData.last_completed_module_at ??
    onboardingData.lastCompletedModuleAt;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isRecentModuleCompletion(
  profile: ProfileData,
  withinDays = 7,
  now: Date = new Date(),
): boolean {
  const completedAt = readLastCompletedModuleAt(profile);
  if (!completedAt) return false;
  const diffMs = now.getTime() - completedAt.getTime();
  if (diffMs < 0) return false;
  return diffMs <= withinDays * 24 * 60 * 60 * 1000;
}

export function resolveCompletedModuleNames(profile: ProfileData): string[] {
  const onboardingData = asRecord(profile.onboardingData);
  const moduleCount = readModulesCompletedCount(onboardingData, profile.moduleProfile);
  return resolveCompletedModules(onboardingData, moduleCount, profile.moduleProfile).names;
}
