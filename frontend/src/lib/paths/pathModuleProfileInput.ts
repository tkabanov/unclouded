import type { UserProfile } from "@/lib/userProfile";
import type { ModuleProfileInput } from "@/lib/modules/readModuleProfile";

/** Map loaded user profile into module gate evaluation input. */
export function toModuleProfileInput(
  profile: UserProfile | null | undefined,
): ModuleProfileInput {
  if (!profile) return {};

  return {
    modulesCompletedCount: profile.modulesCompletedCount,
    moduleIdentityComplete: profile.moduleIdentityComplete,
    moduleRelationalComplete: profile.moduleRelationalComplete,
    moduleHistoryComplete: profile.moduleHistoryComplete,
    moduleFinancialComplete: profile.moduleFinancialComplete,
    moduleBodyComplete: profile.moduleBodyComplete,
    moduleMeaningComplete: profile.moduleMeaningComplete,
    onboardingData: profile.onboardingData,
  };
}
