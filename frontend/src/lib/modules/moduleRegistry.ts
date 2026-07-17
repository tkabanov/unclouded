import { bodyModule } from "./definitions/bodyModule";
import { financialModule } from "./definitions/financialModule";
import { historyModule } from "./definitions/historyModule";
import { identityModule } from "./definitions/identityModule";
import { meaningModule } from "./definitions/meaningModule";
import { relationalModule } from "./definitions/relationalModule";
import type { ModuleDefinition } from "./moduleConfigTypes";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

/**
 * Ordered module definitions — order matches MODULE_SLUGS / profileHelpers MODULE_ORDER:
 * Identity Lens → Relational Blueprint → History & Context → Financial Reality → Body's Story → What Holds You
 */
export const MODULE_DEFINITIONS: Record<ModuleSlug, ModuleDefinition> = {
  identity: identityModule,
  relational: relationalModule,
  history: historyModule,
  financial: financialModule,
  body: bodyModule,
  meaning: meaningModule,
};

export const ALL_MODULE_DEFINITIONS: readonly ModuleDefinition[] = MODULE_SLUGS.map(
  (slug) => MODULE_DEFINITIONS[slug],
);

export const MODULE_AI_SHORT_NAMES: Record<ModuleSlug, string> = Object.fromEntries(
  MODULE_SLUGS.map((slug) => [slug, MODULE_DEFINITIONS[slug].aiShortName]),
) as Record<ModuleSlug, string>;

export const MODULE_PRESENTATION_COPY: Record<ModuleSlug, string> = Object.fromEntries(
  MODULE_SLUGS.map((slug) => [slug, MODULE_DEFINITIONS[slug].presentationCopy]),
) as Record<ModuleSlug, string>;

export const MODULE_DEFAULT_UNLOCK_DAYS: Record<ModuleSlug, number> = Object.fromEntries(
  MODULE_SLUGS.map((slug) => [slug, MODULE_DEFINITIONS[slug].defaultUnlockDay]),
) as Record<ModuleSlug, number>;

export function getModuleDefinitionFromRegistry(slug: ModuleSlug): ModuleDefinition {
  return MODULE_DEFINITIONS[slug];
}

export function assertModuleRegistryComplete(slug: ModuleSlug): void {
  const _exhaustive: Record<ModuleSlug, true> = {
    identity: true,
    relational: true,
    history: true,
    financial: true,
    body: true,
    meaning: true,
  };
  if (!_exhaustive[slug]) {
    const neverSlug: never = slug;
    throw new Error(`Unknown module slug: ${neverSlug}`);
  }
}
