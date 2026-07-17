import type { ModuleAnswerFieldKey } from "./moduleFieldKeys";
import type { ModuleCompleteFlagColumns, ModuleSlug } from "./moduleSlugs";

export type ModuleSensitivityTier = "standard" | "high";

export type ModuleQuestionKind = "single_select" | "multi_select" | "numeric_scale";

export type ModuleQuestionOption = {
  slug: string;
  label: string;
};

export type ModuleQuestion = {
  id: string;
  prompt: string;
  kind: ModuleQuestionKind;
  /** null = UI-only (Build Brief Field: —), not persisted on atomic submit */
  fieldKey: ModuleAnswerFieldKey | null;
  options: readonly ModuleQuestionOption[];
};

export type ModuleProfileBooleanColumn = "spiritualFrameworkPresent" | "hormonalContextFlag";

export type ModuleSideEffect =
  | {
      type: "set_results_flag";
      flag: "trauma_informed_mode";
      when: { fieldKey: ModuleAnswerFieldKey; equals: string };
    }
  | {
      type: "set_profile_boolean";
      column: ModuleProfileBooleanColumn;
      when: { fieldKey: ModuleAnswerFieldKey; notEquals?: string; in?: string[] };
    };

export type ModuleDefinition = {
  slug: ModuleSlug;
  displayTitle: string;
  aiShortName: string;
  headline: string;
  sub: string;
  tone?: string;
  sensitivityTier: ModuleSensitivityTier;
  presentationCopy: string;
  defaultUnlockDay: number;
  completeFlagColumn: keyof ModuleCompleteFlagColumns;
  onboardingCompleteFlag: string;
  estimatedMinutes: number;
  questions: readonly ModuleQuestion[];
  sideEffects: readonly ModuleSideEffect[];
};

export type ModuleValidationResult =
  | { ok: true }
  | { ok: false; missingQuestionIds: string[]; invalidQuestionIds: string[] };

export type ModuleSideEffectResult = {
  profileFields: Partial<Record<ModuleAnswerFieldKey, unknown>>;
  resultsPatch: Record<string, unknown>;
};
