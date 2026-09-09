import { userCanAccessPathTier } from "@/lib/paths/pathEnrollmentMatching";
import {
  parsePathModulePrerequisites,
  userMeetsPathModulePrerequisites,
} from "@/lib/paths/pathModulePrerequisites";
import { fetchPathCatalog, isConsumerPathActive, type PathCatalogEntry } from "@/lib/paths/pathsCatalogApi";
import type { TierSlug } from "@/lib/enums/tier";

import { MODULE_ANSWER_FIELDS_BY_SLUG } from "../moduleFieldKeys";
import type { ModuleSlug } from "../moduleSlugs";
import type { ModuleProfileInput } from "../readModuleProfile";

export type NewlyUnlockedPath = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: TierSlug;
  /** True when the path is real but the viewer's current tier does not include it yet. */
  requiresUpgrade: boolean;
};

export type ResolveNewlyUnlockedPathsInput = {
  slug: ModuleSlug;
  profileBefore: ModuleProfileInput;
  profileAfter: ModuleProfileInput;
  /** `isActive` is optional — `fetchPathCatalog()` already filters to active rows. */
  catalog: (PathCatalogEntry & { isActive?: boolean })[];
  userTier: TierSlug;
};

function pathReferencesModule(path: PathCatalogEntry, slug: ModuleSlug): boolean {
  const prerequisites = parsePathModulePrerequisites(path.triggerSignals);
  if (prerequisites.length === 0) return false;

  const moduleFieldKeys = new Set(MODULE_ANSWER_FIELDS_BY_SLUG[slug]);

  return prerequisites.some((prerequisite) => {
    if (prerequisite.kind === "module_complete") return prerequisite.slug === slug;
    return moduleFieldKeys.has(prerequisite.fieldKey);
  });
}

/** Pure — paths newly unlocked by a module completion, given before/after profile snapshots. */
export function resolveNewlyUnlockedPaths(
  input: ResolveNewlyUnlockedPathsInput,
): NewlyUnlockedPath[] {
  const { slug, profileBefore, profileAfter, catalog, userTier } = input;

  const results: NewlyUnlockedPath[] = [];

  for (const path of catalog) {
    if (!isConsumerPathActive(path.isActive)) continue;
    if (!pathReferencesModule(path, slug)) continue;

    const prerequisites = parsePathModulePrerequisites(path.triggerSignals);
    const metBefore = userMeetsPathModulePrerequisites(profileBefore, prerequisites);
    const metAfter = userMeetsPathModulePrerequisites(profileAfter, prerequisites);
    if (metBefore || !metAfter) continue;

    results.push({
      id: path.id,
      slug: path.slug,
      name: path.name,
      description: path.description,
      tier: path.tier,
      requiresUpgrade: !userCanAccessPathTier(userTier, path.tier),
    });
  }

  return results.sort((left, right) => left.name.localeCompare(right.name));
}

export type FetchNewlyUnlockedPathsInput = Omit<ResolveNewlyUnlockedPathsInput, "catalog">;

/** Thin async wrapper — fetches the catalog and delegates to the pure resolver. */
export async function fetchNewlyUnlockedPaths(
  input: FetchNewlyUnlockedPathsInput,
): Promise<NewlyUnlockedPath[]> {
  const catalog = await fetchPathCatalog();
  return resolveNewlyUnlockedPaths({ ...input, catalog });
}
