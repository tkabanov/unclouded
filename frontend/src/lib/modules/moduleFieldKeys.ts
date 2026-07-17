import type { ModuleSlug } from "./moduleSlugs";

export const MODULE_ANSWER_FIELD_COLUMNS = {
  identitySelfWorthSource: "identitySelfWorthSource",
  identityNarrativeType: "identityNarrativeType",
  identityRoleFusionScore: "identityRoleFusionScore",
  identityPressureOrigin: "identityPressureOrigin",
  attachmentSignal: "attachmentSignal",
  conflictPattern: "conflictPattern",
  supportSeekingCapacity: "supportSeekingCapacity",
  intimacySafetyLevel: "intimacySafetyLevel",
  traumaActivationLevel: "traumaActivationLevel",
  griefLoadLevel: "griefLoadLevel",
  priorSupportType: "priorSupportType",
  significantEvents12mo: "significantEvents12mo",
  financialStabilitySignal: "financialStabilitySignal",
  financialAnxietyLevel: "financialAnxietyLevel",
  financialAgencyLevel: "financialAgencyLevel",
  sleepQualitySignal: "sleepQualitySignal",
  hormonalContextFlag: "hormonalContextFlag",
  hormonalContextType: "hormonalContextType",
  chronicPainFlag: "chronicPainFlag",
  bodyRelationship: "bodyRelationship",
  substancePatternSignal: "substancePatternSignal",
  purposeClarity: "purposeClarity",
  spiritualFrameworkPresent: "spiritualFrameworkPresent",
  spiritualFrameworkType: "spiritualFrameworkType",
  belongingLevel: "belongingLevel",
  pressureReach: "pressureReach",
} as const;

export type ModuleAnswerFieldKey = keyof typeof MODULE_ANSWER_FIELD_COLUMNS;

export type ModuleAnswerFieldColumn =
  (typeof MODULE_ANSWER_FIELD_COLUMNS)[ModuleAnswerFieldKey];

export const MODULE_ANSWER_FIELDS_BY_SLUG: Record<ModuleSlug, ModuleAnswerFieldKey[]> = {
  identity: ["identitySelfWorthSource", "identityNarrativeType", "identityRoleFusionScore", "identityPressureOrigin"],
  relational: ["attachmentSignal", "conflictPattern", "supportSeekingCapacity", "intimacySafetyLevel"],
  history: ["traumaActivationLevel", "griefLoadLevel", "priorSupportType", "significantEvents12mo"],
  financial: ["financialStabilitySignal", "financialAnxietyLevel", "financialAgencyLevel"],
  body: ["sleepQualitySignal", "hormonalContextFlag", "hormonalContextType", "chronicPainFlag", "bodyRelationship", "substancePatternSignal"],
  meaning: ["purposeClarity", "spiritualFrameworkPresent", "spiritualFrameworkType", "belongingLevel", "pressureReach"],
};

export const MODULE_FIELD_ONBOARDING_ALIASES: Partial<Record<ModuleAnswerFieldKey, string>> = {
  identitySelfWorthSource: "identity_self_worth_source",
  identityNarrativeType: "identity_narrative_type",
  identityRoleFusionScore: "identity_role_fusion_score",
  identityPressureOrigin: "identity_pressure_origin",
  attachmentSignal: "attachment_signal",
  conflictPattern: "conflict_pattern",
  supportSeekingCapacity: "support_seeking_capacity",
  intimacySafetyLevel: "intimacy_safety_level",
  traumaActivationLevel: "trauma_activation_level",
  griefLoadLevel: "grief_load_level",
  priorSupportType: "prior_support_type",
  significantEvents12mo: "significant_events_12mo",
  financialStabilitySignal: "financial_stability_signal",
  financialAnxietyLevel: "financial_anxiety_level",
  financialAgencyLevel: "financial_agency_level",
  sleepQualitySignal: "sleep_quality_signal",
  hormonalContextFlag: "hormonal_context_flag",
  hormonalContextType: "hormonal_context_type",
  chronicPainFlag: "chronic_pain_flag",
  bodyRelationship: "body_relationship",
  substancePatternSignal: "substance_pattern_signal",
  purposeClarity: "purpose_clarity",
  spiritualFrameworkPresent: "spiritual_framework_present",
  spiritualFrameworkType: "spiritual_framework_type",
  belongingLevel: "belonging_level",
  pressureReach: "pressure_reach",
};

export const MODULE_COMPLETE_ONBOARDING_TO_COLUMN: Record<string, string> = {
  module_identity_complete: "moduleIdentityComplete",
  module_relational_complete: "moduleRelationalComplete",
  module_history_complete: "moduleHistoryComplete",
  module_financial_complete: "moduleFinancialComplete",
  module_body_complete: "moduleBodyComplete",
  module_meaning_complete: "moduleMeaningComplete",
  modules_completed_count: "modulesCompletedCount",
  modules_completed_count_number: "modulesCompletedCount",
};
