import { getModuleDefinition } from "./moduleConfigApi";
import type { ModuleSensitivityTier } from "./moduleConfigTypes";
import { getModuleAvailability } from "./moduleScheduler";
import type { ModuleAvailabilityStatus } from "./moduleSchedulerTypes";
import type { ModuleProfileInput } from "./readModuleProfile";
import { MODULE_SLUGS, type ModuleSlug } from "./moduleSlugs";

export type ModuleListItem = {
  slug: ModuleSlug;
  displayTitle: string;
  presentationCopy: string;
  sensitivityTier: ModuleSensitivityTier;
  status: ModuleAvailabilityStatus;
  daysUntilUnlock: number;
  completedAt: string | null;
};

export function formatDaysUntilUnlockLabel(days: number): string {
  if (days === 0) {
    return "Unlocks today";
  }
  if (days === 1) {
    return "Coming in 1 day";
  }
  return `Coming in ${days} days`;
}

export function buildModuleListItems(
  profile: ModuleProfileInput,
  now: Date = new Date(),
): ModuleListItem[] {
  const availability = getModuleAvailability(profile, now);

  return MODULE_SLUGS.map((slug) => {
    const definition = getModuleDefinition(slug);
    const entry = availability[slug];

    return {
      slug,
      displayTitle: definition.displayTitle,
      presentationCopy: definition.presentationCopy,
      sensitivityTier: definition.sensitivityTier,
      status: entry.status,
      daysUntilUnlock: entry.daysUntilUnlock,
      completedAt: entry.completedAt,
    };
  });
}

export function countCompletedModuleItems(items: ModuleListItem[]): number {
  return items.filter((item) => item.status === "completed").length;
}

/** First available module, otherwise the locked module with the fewest days remaining. */
export function getNextActionableModule(items: ModuleListItem[]): ModuleListItem | null {
  const available = items.find(
    (item) => item.status === "available" || item.status === "refresh_available",
  );
  if (available) {
    return available;
  }

  let earliestLocked: ModuleListItem | null = null;
  for (const item of items) {
    if (item.status !== "locked") {
      continue;
    }
    if (!earliestLocked || item.daysUntilUnlock < earliestLocked.daysUntilUnlock) {
      earliestLocked = item;
    }
  }

  return earliestLocked;
}
