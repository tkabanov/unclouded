import {
  MODULE_ANSWER_FIELD_COLUMNS,
  MODULE_FIELD_ONBOARDING_ALIASES,
  type ModuleAnswerFieldKey,
} from "./moduleFieldKeys";
import type { ModuleProfileInput } from "./readModuleProfile";

export type ModuleAnswerFieldValue = string | number | boolean | string[] | null;

/**
 * Reads a module answer field from a profile, preferring the typed column and
 * falling back to the `onboardingData` snake_case alias. Shared by path
 * prerequisite gating (`pathModulePrerequisites.ts`) and results resolution
 * (`resolveModuleResults.ts`) so both read the exact same fallback order.
 */
export function readModuleProfileFieldValue(
  profile: ModuleProfileInput,
  fieldKey: ModuleAnswerFieldKey,
): ModuleAnswerFieldValue {
  const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
  const columnValue = profile[column as keyof ModuleProfileInput];
  if (columnValue !== null && columnValue !== undefined) {
    if (Array.isArray(columnValue)) {
      return columnValue.filter((item): item is string => typeof item === "string");
    }
    return columnValue as string | number | boolean;
  }

  const alias = MODULE_FIELD_ONBOARDING_ALIASES[fieldKey];
  if (!alias) return null;

  const onboardingData =
    profile.onboardingData && typeof profile.onboardingData === "object"
      ? profile.onboardingData
      : null;
  if (!onboardingData) return null;

  const raw = onboardingData[alias];
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  return null;
}
