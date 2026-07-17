import { TIER, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";
import type { ModuleProfileInput } from "@/lib/modules/readModuleProfile";
import {
  parsePathModulePrerequisites,
  userMeetsPathModulePrerequisites,
} from "@/lib/paths/pathModulePrerequisites";

export interface PathEnrollmentCandidate {
  id: string;
  name: string;
  tier: TierSlug;
  pillar: string;
  classifications: string;
  triggerSignals: string;
}

export interface OnboardingEnrollmentContext {
  primaryPillar: string;
  classificationName: string;
  recoveryModeActive: boolean;
  griefModeActive: boolean;
  userTier: TierSlug;
  moduleProfile?: ModuleProfileInput;
}

const ONBOARDING_ENROLLMENT_TOKEN = "enrollment:onboarding";

function isTierSlug(value: string | undefined | null): value is TierSlug {
  return value === TIER.FREE || value === TIER.PRO || value === TIER.PREMIUM;
}

function tierPriority(tier: TierSlug): number {
  return TIER_ORDER.indexOf(tier);
}

export function userCanAccessPathTier(userTier: TierSlug, pathTier: TierSlug): boolean {
  return tierPriority(userTier) >= tierPriority(pathTier);
}

export function pathHasOnboardingEnrollmentTrigger(triggerSignals: string | null | undefined): boolean {
  return (triggerSignals ?? "").toLowerCase().includes(ONBOARDING_ENROLLMENT_TOKEN);
}

export function pathMatchesClassification(
  pathClassifications: string,
  classificationName: string,
): boolean {
  const normalized = pathClassifications.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("any classification") || normalized.includes("all classifications")) {
    return true;
  }
  return normalized.includes(classificationName.trim().toLowerCase());
}

export type PathFlagRequirement =
  | { kind: "none" }
  | { kind: "recovery_required" }
  | { kind: "grief_required" }
  /** REQ-15 Unsent Letter — visible when grief OR recovery OR transition is active. */
  | { kind: "grief_or_recovery_or_transition" };

export function parsePathFlagRequirement(
  triggerSignals: string | null | undefined,
): PathFlagRequirement {
  const normalized = (triggerSignals ?? "").toLowerCase();

  if (
    normalized.includes("recovery_mode_active") &&
    (normalized.includes("mandatory") || normalized.includes("requires"))
  ) {
    return { kind: "recovery_required" };
  }

  if (
    normalized.includes("grief_mode_active") &&
    (normalized.includes("mandatory") || normalized.includes("requires grief"))
  ) {
    return { kind: "grief_required" };
  }

  // Directed writing / Unsent Letter: any of the three flags unlocks visibility.
  if (
    normalized.includes("grief_mode_active") &&
    normalized.includes("recovery_mode_active") &&
    normalized.includes("transition_flag")
  ) {
    return { kind: "grief_or_recovery_or_transition" };
  }

  return { kind: "none" };
}

export function userMeetsPathFlagRequirement(
  requirement: PathFlagRequirement,
  context: Pick<OnboardingEnrollmentContext, "recoveryModeActive" | "griefModeActive"> & {
    transitionFlagActive?: boolean;
  },
): boolean {
  switch (requirement.kind) {
    case "none":
      return true;
    case "recovery_required":
      return context.recoveryModeActive;
    case "grief_required":
      return context.griefModeActive;
    case "grief_or_recovery_or_transition":
      return (
        context.recoveryModeActive ||
        context.griefModeActive ||
        context.transitionFlagActive === true
      );
    default: {
      const exhaustive: never = requirement;
      return exhaustive;
    }
  }
}

function classificationSpecificity(pathClassifications: string): number {
  const normalized = pathClassifications.trim().toLowerCase();
  if (normalized.includes("any classification") || normalized.includes("all classifications")) {
    return 0;
  }
  return 1;
}

export function pathMatchesOnboardingEnrollment(
  path: PathEnrollmentCandidate,
  context: OnboardingEnrollmentContext,
): boolean {
  if (!pathHasOnboardingEnrollmentTrigger(path.triggerSignals)) return false;
  if (!isTierSlug(path.tier) || !userCanAccessPathTier(context.userTier, path.tier)) {
    return false;
  }
  if (path.pillar.trim().toLowerCase() !== context.primaryPillar.trim().toLowerCase()) {
    return false;
  }
  if (!pathMatchesClassification(path.classifications, context.classificationName)) {
    return false;
  }

  const flagRequirement = parsePathFlagRequirement(path.triggerSignals);
  if (!userMeetsPathFlagRequirement(flagRequirement, context)) {
    return false;
  }

  const modulePrerequisites = parsePathModulePrerequisites(path.triggerSignals);
  if (modulePrerequisites.length === 0) return true;

  return userMeetsPathModulePrerequisites(context.moduleProfile ?? {}, modulePrerequisites);
}

export interface LibraryBrowseContext {
  userTier: TierSlug;
  recoveryModeActive: boolean;
  griefModeActive: boolean;
  transitionFlagActive?: boolean;
}

/** Hide flag-gated paths the user cannot access (e.g. recovery-only paths). */
export function pathVisibleInLibrary(
  path: Pick<PathEnrollmentCandidate, "triggerSignals">,
  context: LibraryBrowseContext,
): boolean {
  const flagRequirement = parsePathFlagRequirement(path.triggerSignals);
  return userMeetsPathFlagRequirement(flagRequirement, context);
}

export function selectOnboardingEnrollmentPaths(
  paths: PathEnrollmentCandidate[],
  context: OnboardingEnrollmentContext,
): PathEnrollmentCandidate[] {
  return paths
    .filter((path) => pathMatchesOnboardingEnrollment(path, context))
    .sort((left, right) => {
      const specificityDelta =
        classificationSpecificity(right.classifications) -
        classificationSpecificity(left.classifications);
      if (specificityDelta !== 0) return specificityDelta;

      const tierDelta = tierPriority(left.tier) - tierPriority(right.tier);
      if (tierDelta !== 0) return tierDelta;

      return left.name.localeCompare(right.name);
    });
}
