import { MODULE_ANSWER_FIELDS_BY_SLUG, type ModuleAnswerFieldKey } from "./moduleFieldKeys";
import {
  ALL_MODULE_DEFINITIONS,
  getModuleDefinitionFromRegistry,
  MODULE_DEFINITIONS,
} from "./moduleRegistry";
import type {
  ModuleDefinition,
  ModuleQuestion,
  ModuleValidationResult,
} from "./moduleConfigTypes";
import { resolveSideEffectsForModule } from "./moduleSideEffects";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

export function getModuleDefinition(slug: ModuleSlug): ModuleDefinition {
  return getModuleDefinitionFromRegistry(slug);
}

export function getAllModuleDefinitions(): ModuleDefinition[] {
  return [...ALL_MODULE_DEFINITIONS];
}

export function getModuleQuestions(slug: ModuleSlug): ModuleQuestion[] {
  return [...getModuleDefinition(slug).questions];
}

export function getPersistedQuestions(slug: ModuleSlug): ModuleQuestion[] {
  return getModuleQuestions(slug).filter((question) => question.fieldKey !== null);
}

export function getPresentationCopy(slug: ModuleSlug): string {
  return getModuleDefinition(slug).presentationCopy;
}

export function getModuleAiShortName(slug: ModuleSlug): string {
  return getModuleDefinition(slug).aiShortName;
}

export function getModuleDefaultUnlockDay(slug: ModuleSlug): number {
  return getModuleDefinition(slug).defaultUnlockDay;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isValidAnswerForQuestion(question: ModuleQuestion, value: unknown): boolean {
  const validSlugs = new Set(question.options.map((option) => option.slug));

  switch (question.kind) {
    case "single_select":
    case "numeric_scale":
      return isNonEmptyString(value) && validSlugs.has(value);
    case "multi_select":
      return isNonEmptyStringArray(value) && value.every((slug) => validSlugs.has(slug));
    default: {
      const neverKind: never = question.kind;
      throw new Error(`Unhandled question kind: ${neverKind}`);
    }
  }
}

export function validateModuleAnswers(
  slug: ModuleSlug,
  answers: Record<string, unknown>,
): ModuleValidationResult {
  const persistedQuestions = getPersistedQuestions(slug);
  const missingQuestionIds: string[] = [];
  const invalidQuestionIds: string[] = [];

  for (const question of persistedQuestions) {
    const fieldKey = question.fieldKey;
    if (fieldKey === null) {
      continue;
    }

    const value = answers[question.id] ?? answers[fieldKey];

    if (value === undefined || value === null || value === "") {
      missingQuestionIds.push(question.id);
      continue;
    }

    if (!isValidAnswerForQuestion(question, value)) {
      invalidQuestionIds.push(question.id);
    }
  }

  if (missingQuestionIds.length > 0 || invalidQuestionIds.length > 0) {
    return { ok: false, missingQuestionIds, invalidQuestionIds };
  }

  return { ok: true };
}

export function mapAnswersToProfileFields(
  slug: ModuleSlug,
  answers: Record<string, unknown>,
): Partial<Record<ModuleAnswerFieldKey, unknown>> {
  const mapped: Partial<Record<ModuleAnswerFieldKey, unknown>> = {};

  for (const question of getPersistedQuestions(slug)) {
    const fieldKey = question.fieldKey;
    if (fieldKey === null) {
      continue;
    }

    const value = answers[question.id] ?? answers[fieldKey];
    if (value === undefined) {
      continue;
    }

    if (question.kind === "multi_select") {
      mapped[fieldKey] = value;
    } else {
      mapped[fieldKey] = value;
    }
  }

  return mapped;
}

export function resolveModuleSideEffects(
  slug: ModuleSlug,
  answers: Record<string, unknown>,
) {
  const mappedAnswers = mapAnswersToProfileFields(slug, answers);
  return resolveSideEffectsForModule(slug, mappedAnswers);
}

/** Ensures every persisted field key for a slug appears on at least one question. */
export function validateRegistryFieldCoverage(): void {
  for (const slug of MODULE_SLUGS) {
    const expectedFields = MODULE_ANSWER_FIELDS_BY_SLUG[slug];
    const questionFieldKeys = new Set(
      getPersistedQuestions(slug)
        .map((question) => question.fieldKey)
        .filter((fieldKey): fieldKey is ModuleAnswerFieldKey => fieldKey !== null),
    );

    for (const fieldKey of expectedFields) {
      const coveredByQuestion = questionFieldKeys.has(fieldKey);
      const coveredBySideEffect = definitionSideEffectColumns(slug).has(fieldKey);
      if (!coveredByQuestion && !coveredBySideEffect) {
        throw new Error(`Module "${slug}" missing question or side effect for field "${fieldKey}"`);
      }
    }
  }
}

function definitionSideEffectColumns(slug: ModuleSlug): Set<ModuleAnswerFieldKey> {
  const columns = new Set<ModuleAnswerFieldKey>();
  for (const effect of MODULE_DEFINITIONS[slug].sideEffects) {
    if (effect.type === "set_profile_boolean") {
      columns.add(effect.column);
    }
  }
  return columns;
}

export { MODULE_DEFINITIONS };
