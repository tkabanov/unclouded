import { classifications, getDashboardConfig } from "@/lib/classification";

import {
  buildModuleListItems,
  getNextActionableModule,
  type ModuleListItem,
} from "./moduleListState";
import { MODULE_AI_SHORT_NAMES } from "./moduleRegistry";
import type { ModuleProfileInput } from "./readModuleProfile";
import { MODULE_DISPLAY_TITLES, MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

const SECTION_LABEL = "Know Yourself Deeper";

const LABEL_TO_SLUG = new Map<string, ModuleSlug>(
  MODULE_SLUGS.flatMap((slug) => [
    [MODULE_AI_SHORT_NAMES[slug], slug],
    [MODULE_DISPLAY_TITLES[slug], slug],
  ] as const),
);

function earliestLocked(items: ModuleListItem[]): ModuleListItem | null {
  let best: ModuleListItem | null = null;

  for (const item of items) {
    if (item.status !== "locked") {
      continue;
    }
    if (!best || item.daysUntilUnlock < best.daysUntilUnlock) {
      best = item;
    }
  }

  return best;
}

export function resolveModuleSurfaceLabelsToSlugs(labels: string[]): ModuleSlug[] {
  const slugs: ModuleSlug[] = [];
  const seen = new Set<ModuleSlug>();

  for (const label of labels) {
    if (label === SECTION_LABEL) {
      continue;
    }

    const slug = LABEL_TO_SLUG.get(label);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }

  return slugs;
}

export function selectDashboardModuleItem(
  items: ModuleListItem[],
  preferredLabels: string[],
): ModuleListItem | null {
  const incomplete = items.filter((item) => item.status !== "completed");
  if (incomplete.length === 0) {
    return null;
  }

  const preferredSlugs = resolveModuleSurfaceLabelsToSlugs(preferredLabels);
  const preferredItems =
    preferredSlugs.length > 0
      ? incomplete.filter((item) => preferredSlugs.includes(item.slug))
      : [];

  const availablePreferred = preferredItems.find(
    (item) => item.status === "available" || item.status === "refresh_available",
  );
  if (availablePreferred) {
    return availablePreferred;
  }

  const availableGlobal = incomplete.find(
    (item) => item.status === "available" || item.status === "refresh_available",
  );
  if (availableGlobal) {
    return availableGlobal;
  }

  if (preferredItems.length > 0) {
    const lockedPreferred = earliestLocked(preferredItems);
    if (lockedPreferred) {
      return lockedPreferred;
    }
  }

  return getNextActionableModule(items);
}

export function resolveDashboardModulePreview(input: {
  profile: ModuleProfileInput;
  classificationKey: string | null;
  healthFlags: {
    recovery_mode_active: boolean;
    grief_mode_active: boolean;
    trauma_informed_mode: boolean;
  };
  now?: Date;
}): ModuleListItem | null {
  const items = buildModuleListItems(input.profile, input.now ?? new Date());
  const classificationKey = input.classificationKey ?? "capacity_erosion";
  const classification =
    classifications[classificationKey] ?? classifications.capacity_erosion;
  const { modulesToSurface } = getDashboardConfig(classification, input.healthFlags);

  return selectDashboardModuleItem(items, modulesToSurface);
}
