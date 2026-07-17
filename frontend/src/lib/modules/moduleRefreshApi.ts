import { supabase } from "@/integrations/supabase/client";

import {
  buildLifeEventModuleRefreshPatch,
  buildUserInitiatedRefreshPatch,
  listCompletedModuleSlugs,
  type LifeEventType,
} from "./moduleRefresh";
import type { ModuleProfileInput } from "./readModuleProfile";
import { loadModuleProfileForCompletion } from "./completeModule";
import type { ModuleSlug } from "./moduleSlugs";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function persistModuleSchedulesPatch(
  userId: string,
  profile: ModuleProfileInput,
  moduleSchedules: ModuleProfileInput["moduleSchedules"],
  onboardingDataPatch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      moduleSchedules: moduleSchedules as never,
      onboardingData: {
        ...asRecord(profile.onboardingData),
        ...onboardingDataPatch,
      } as never,
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function offerUserModuleRefresh(
  userId: string,
  slugs: readonly ModuleSlug[],
): Promise<ModuleSlug[]> {
  const profile = await loadModuleProfileForCompletion(userId);
  const patch = buildUserInitiatedRefreshPatch(profile, slugs);
  if (patch.refreshOfferedSlugs.length === 0) return [];

  await persistModuleSchedulesPatch(
    userId,
    profile,
    patch.moduleSchedules,
    patch.onboardingDataPatch,
  );

  return patch.refreshOfferedSlugs;
}

export async function offerAllCompletedModuleRefresh(userId: string): Promise<ModuleSlug[]> {
  const profile = await loadModuleProfileForCompletion(userId);
  return offerUserModuleRefresh(userId, listCompletedModuleSlugs(profile));
}

export async function submitLifeEventModuleRefresh(
  userId: string,
  eventType: LifeEventType,
): Promise<{ refreshOfferedSlugs: ModuleSlug[]; acceleratedSlugs: ModuleSlug[] }> {
  const profile = await loadModuleProfileForCompletion(userId);
  const patch = buildLifeEventModuleRefreshPatch(profile, eventType);

  await persistModuleSchedulesPatch(
    userId,
    profile,
    patch.moduleSchedules,
    patch.onboardingDataPatch,
  );

  return {
    refreshOfferedSlugs: patch.refreshOfferedSlugs,
    acceleratedSlugs: patch.acceleratedSlugs,
  };
}
