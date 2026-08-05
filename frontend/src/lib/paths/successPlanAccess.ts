/**
 * Success Plan access helpers (OVR-038).
 *
 * Self-serve: Pro/Premium + active Success Plan add-on.
 * HR assign: enrollment source = hr_assign (allowed for Free seats).
 */
import { TIER, TIER_ORDER, type TierSlug } from "@/lib/enums/tier";

export const SUCCESS_PLAN_SUB_MODE = "success_plan";

export function isSuccessPlanSubMode(subMode: string | null | undefined): boolean {
  return subMode?.trim().toLowerCase() === SUCCESS_PLAN_SUB_MODE;
}

export function isSuccessPlanPath(input: {
  subMode?: string | null;
  triggerSignals?: string | null;
}): boolean {
  if (isSuccessPlanSubMode(input.subMode)) return true;
  const signals = input.triggerSignals?.toLowerCase() ?? "";
  return signals.includes("path_type:success_plan");
}

export type SuccessPlanAccessInput = {
  userTier: TierSlug;
  hasSuccessPlanAddon: boolean;
  hasHrAssignment: boolean;
};

export type SuccessPlanAccessResult =
  | { allowed: true; reason: "hr_assign" | "addon" }
  | {
      allowed: false;
      reason: "upgrade_required" | "purchase_required";
    };

export function resolveSuccessPlanAccess(
  input: SuccessPlanAccessInput,
): SuccessPlanAccessResult {
  if (input.hasHrAssignment) {
    return { allowed: true, reason: "hr_assign" };
  }

  const paid =
    TIER_ORDER.indexOf(input.userTier) >= TIER_ORDER.indexOf(TIER.PRO);

  if (!paid) {
    return { allowed: false, reason: "upgrade_required" };
  }

  if (input.hasSuccessPlanAddon) {
    return { allowed: true, reason: "addon" };
  }

  return { allowed: false, reason: "purchase_required" };
}

export function userCanAccessPathClient(input: {
  isSuccessPlan: boolean;
  userTier: TierSlug;
  pathTier: TierSlug;
  hasSuccessPlanAddon: boolean;
  hasHrAssignment: boolean;
}): boolean {
  if (!input.isSuccessPlan) {
    return TIER_ORDER.indexOf(input.userTier) >= TIER_ORDER.indexOf(input.pathTier);
  }
  return resolveSuccessPlanAccess({
    userTier: input.userTier,
    hasSuccessPlanAddon: input.hasSuccessPlanAddon,
    hasHrAssignment: input.hasHrAssignment,
  }).allowed;
}
