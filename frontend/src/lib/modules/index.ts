export {
  getAllModuleDefinitions,
  getModuleAiShortName,
  getModuleDefaultUnlockDay,
  getModuleDefinition,
  getModuleQuestions,
  getPersistedQuestions,
  getPresentationCopy,
  mapAnswersToProfileFields,
  MODULE_DEFINITIONS,
  resolveModuleSideEffects,
  validateModuleAnswers,
  validateRegistryFieldCoverage,
} from "./moduleConfigApi";

export {
  ALL_MODULE_DEFINITIONS,
  getModuleDefinitionFromRegistry,
  MODULE_DEFINITIONS as MODULE_REGISTRY,
} from "./moduleRegistry";

export type {
  ModuleDefinition,
  ModuleQuestion,
  ModuleQuestionKind,
  ModuleQuestionOption,
  ModuleSensitivityTier,
  ModuleSideEffect,
  ModuleSideEffectResult,
  ModuleValidationResult,
} from "./moduleConfigTypes";

export {
  MODULE_ANSWER_FIELD_COLUMNS,
  MODULE_ANSWER_FIELDS_BY_SLUG,
  MODULE_COMPLETE_ONBOARDING_TO_COLUMN,
  MODULE_FIELD_ONBOARDING_ALIASES,
  type ModuleAnswerFieldColumn,
  type ModuleAnswerFieldKey,
} from "./moduleFieldKeys";

export {
  isModuleSlug,
  MODULE_COMPLETE_FLAG_COLUMNS,
  MODULE_DISPLAY_TITLES,
  MODULE_SLUGS,
  type ModuleCompleteFlagColumns,
  type ModuleSlug,
} from "./moduleSlugs";

export {
  MODULE_AI_SHORT_NAMES,
  MODULE_DEFAULT_UNLOCK_DAYS,
  MODULE_PRESENTATION_COPY,
} from "./moduleRegistry";

export {
  isModuleComplete,
  isModuleFieldPopulated,
  readModuleCompleteFlags,
  readModulesCompletedCount,
  readModuleSchedules,
  type ModuleProfileInput,
  type ModuleProfileRow,
} from "./readModuleProfile";

export type { ModuleScheduleEntry, ModuleSchedules } from "./moduleScheduleTypes";

export {
  addCalendarDays,
  buildModuleSchedules,
  calendarDaysUntil,
  computeOnboardingModulePreview,
  daysUntilUnlockForSchedule,
  getModuleAvailability,
  getOnboardingModulePreview,
  toModuleSchedulerInput,
} from "./moduleScheduler";

export type { OnboardingModuleScheduleResult } from "./moduleScheduler";

export {
  buildModuleListItems,
  countCompletedModuleItems,
  formatDaysUntilUnlockLabel,
  getNextActionableModule,
  type ModuleListItem,
} from "./moduleListState";

export {
  resolveDashboardModulePreview,
  resolveModuleSurfaceLabelsToSlugs,
  selectDashboardModuleItem,
} from "./dashboardModulePreview";

export { MODULE_PREVIEW_TIE_ORDER, resolveUnlockDay, resolveAllUnlockDays } from "./moduleAcceleratedTriggers";

export {
  buildModuleCompletionPatch,
  coerceModuleFieldForDb,
  toProfileUpdatePayload,
} from "./moduleProfilePatch";

export {
  completeModule,
  loadModuleProfileForCompletion,
  ModuleAlreadyCompleteError,
  ModuleLockedError,
  ModuleValidationFailedError,
  type CompleteModuleResult,
} from "./completeModule";

export type {
  ModuleAvailabilityEntry,
  ModuleAvailabilityMap,
  ModuleAvailabilityStatus,
  ModuleSchedulerInput,
  OnboardingModulePreview,
} from "./moduleSchedulerTypes";
