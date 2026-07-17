/** Canonical deep-dive module slugs (deep-dive-modules-spec.md section 2). */
export const MODULE_SLUGS = [
  "identity",
  "relational",
  "history",
  "financial",
  "body",
  "meaning",
] as const;

export type ModuleSlug = (typeof MODULE_SLUGS)[number];

export const MODULE_DISPLAY_TITLES: Record<ModuleSlug, string> = {
  identity: "The Identity Lens",
  relational: "Your Relational Blueprint",
  history: "Your History & Context",
  financial: "Financial Reality",
  body: "Your Body's Story",
  meaning: "What Holds You",
};

export const MODULE_COMPLETE_FLAG_COLUMNS: Record<ModuleSlug, keyof ModuleCompleteFlagColumns> = {
  identity: "moduleIdentityComplete",
  relational: "moduleRelationalComplete",
  history: "moduleHistoryComplete",
  financial: "moduleFinancialComplete",
  body: "moduleBodyComplete",
  meaning: "moduleMeaningComplete",
};

/** Profile columns for module completion booleans. */
export type ModuleCompleteFlagColumns = {
  moduleIdentityComplete: boolean;
  moduleRelationalComplete: boolean;
  moduleHistoryComplete: boolean;
  moduleFinancialComplete: boolean;
  moduleBodyComplete: boolean;
  moduleMeaningComplete: boolean;
};

export function isModuleSlug(value: string): value is ModuleSlug {
  return (MODULE_SLUGS as readonly string[]).includes(value);
}
