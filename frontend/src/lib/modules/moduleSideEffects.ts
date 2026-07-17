import type { ModuleAnswerFieldKey } from "./moduleFieldKeys";
import type { ModuleSideEffect, ModuleSideEffectResult } from "./moduleConfigTypes";
import type { ModuleSlug } from "./moduleSlugs";
import { getModuleDefinitionFromRegistry } from "./moduleRegistry";

function readAnswerValue(
  answers: Record<string, unknown>,
  fieldKey: ModuleAnswerFieldKey,
): unknown {
  return answers[fieldKey];
}

function matchesWhen(
  answers: Record<string, unknown>,
  when: { fieldKey: ModuleAnswerFieldKey; equals?: string; notEquals?: string; in?: string[] },
): boolean {
  const value = readAnswerValue(answers, when.fieldKey);
  if (typeof value !== "string") {
    return false;
  }
  if (when.equals !== undefined) {
    return value === when.equals;
  }
  if (when.notEquals !== undefined) {
    return value !== when.notEquals;
  }
  if (when.in !== undefined) {
    return when.in.includes(value);
  }
  return false;
}

function applySideEffect(
  effect: ModuleSideEffect,
  answers: Record<string, unknown>,
  result: ModuleSideEffectResult,
): void {
  switch (effect.type) {
    case "set_results_flag":
      if (matchesWhen(answers, effect.when)) {
        result.resultsPatch[effect.flag] = true;
      }
      break;
    case "set_profile_boolean": {
      const value = matchesWhen(answers, effect.when);
      result.profileFields[effect.column] = value;
      break;
    }
    default: {
      const neverEffect: never = effect;
      throw new Error(`Unhandled side effect: ${String(neverEffect)}`);
    }
  }
}

export function resolveSideEffectsForModule(
  slug: ModuleSlug,
  mappedAnswers: Partial<Record<ModuleAnswerFieldKey, unknown>>,
): ModuleSideEffectResult {
  const definition = getModuleDefinitionFromRegistry(slug);
  const result: ModuleSideEffectResult = {
    profileFields: {},
    resultsPatch: {},
  };

  for (const effect of definition.sideEffects) {
    applySideEffect(effect, mappedAnswers as Record<string, unknown>, result);
  }

  return result;
}
