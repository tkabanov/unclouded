import type { Database } from "@/integrations/supabase/types";

import {
  MODULE_ANSWER_FIELD_COLUMNS,
  type ModuleAnswerFieldKey,
} from "./moduleFieldKeys";
import {
  MODULE_COMPLETE_FLAG_COLUMNS,
  MODULE_SLUGS,
  type ModuleCompleteFlagColumns,
  type ModuleSlug,
} from "./moduleSlugs";
import {
  EMPTY_MODULE_SCHEDULES,
  parseModuleSchedules,
  type ModuleSchedules,
} from "./moduleScheduleTypes";

export type ModuleProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "modulesCompletedCount"
  | "moduleIdentityComplete"
  | "moduleRelationalComplete"
  | "moduleHistoryComplete"
  | "moduleFinancialComplete"
  | "moduleBodyComplete"
  | "moduleMeaningComplete"
  | "moduleSchedules"
  | keyof typeof MODULE_ANSWER_FIELD_COLUMNS
>;

export type ModuleProfileInput = Partial<ModuleProfileRow> & {
  onboardingData?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readJsonCount(onboardingData: Record<string, unknown>): number | null {
  const raw =
    onboardingData.modules_completed_count_number ??
    onboardingData.modules_completed_count;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return null;
}

export function readModulesCompletedCount(profile: ModuleProfileInput): number {
  if (typeof profile.modulesCompletedCount === "number") {
    return Math.max(0, Math.floor(profile.modulesCompletedCount));
  }
  const fromJson = readJsonCount(asRecord(profile.onboardingData));
  return fromJson ?? 0;
}

const ONBOARDING_FLAG_BY_COLUMN: Record<keyof ModuleCompleteFlagColumns, string[]> = {
  moduleIdentityComplete: ["module_identity_complete", "module_identity_complete_boolean"],
  moduleRelationalComplete: ["module_relational_complete", "module_relational_complete_boolean"],
  moduleHistoryComplete: ["module_history_complete", "module_history_complete_boolean"],
  moduleFinancialComplete: ["module_financial_complete", "module_financial_complete_boolean"],
  moduleBodyComplete: ["module_body_complete", "module_body_complete_boolean"],
  moduleMeaningComplete: [
    "module_meaning_complete",
    "module_meaning_complete_boolean",
    "module_holds_you_complete",
  ],
};

export function readModuleCompleteFlags(
  profile: ModuleProfileInput,
): ModuleCompleteFlagColumns {
  const onboardingData = asRecord(profile.onboardingData);
  const flags = {} as ModuleCompleteFlagColumns;

  for (const slug of MODULE_SLUGS) {
    const column = MODULE_COMPLETE_FLAG_COLUMNS[slug];
    const columnValue = profile[column];
    if (typeof columnValue === "boolean") {
      flags[column] = columnValue;
      continue;
    }
    const jsonKeys = ONBOARDING_FLAG_BY_COLUMN[column];
    flags[column] = jsonKeys.some((key) => onboardingData[key] === true);
  }

  return flags;
}

export function readModuleSchedules(profile: ModuleProfileInput): ModuleSchedules {
  if (profile.moduleSchedules !== undefined && profile.moduleSchedules !== null) {
    return parseModuleSchedules(profile.moduleSchedules);
  }
  return EMPTY_MODULE_SCHEDULES;
}

export function isModuleComplete(profile: ModuleProfileInput, slug: ModuleSlug): boolean {
  const column = MODULE_COMPLETE_FLAG_COLUMNS[slug];
  return readModuleCompleteFlags(profile)[column];
}

export function isModuleFieldPopulated(
  profile: ModuleProfileInput,
  fieldKey: ModuleAnswerFieldKey,
): boolean {
  const column = MODULE_ANSWER_FIELD_COLUMNS[fieldKey];
  const value = profile[column as keyof ModuleProfileInput];
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
