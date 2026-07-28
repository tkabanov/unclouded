/**
 * Tier resolution helpers shared across the app.
 *
 * The subscription screen itself reads `@/lib/subscription/subscriptionApi`,
 * which loads the full state machine. These helpers exist for the many feature
 * gates that only need the effective tier from an already-loaded profile.
 */
import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { resolveUserEntitlement } from "@/lib/entitlements/userEntitlementHelpers";
import type { EffectiveTierInput } from "@/lib/subscription/subscriptionState";
import {
  getCurrentTierLabel as getEntitlementTierLabel,
  loadSubscriptionEntitlement,
  resolveCurrentTier as resolveEntitlementTier,
  type SubscriptionEntitlement,
} from "@/lib/settings/subscriptionEntitlementApi";

export function resolveCurrentTier(
  subscribed: boolean,
  tier?: string | null,
  accountType?: string | null,
  enterpriseTier?: string | null,
  subscription?: EffectiveTierInput | null,
): TierSlug {
  return resolveUserEntitlement({ subscribed, tier, accountType, enterpriseTier, subscription })
    .tier;
}

export function resolveCurrentTierFromEntitlement(
  entitlement: SubscriptionEntitlement,
): TierSlug {
  return resolveEntitlementTier(entitlement);
}

export function getCurrentTierLabel(
  subscribed: boolean,
  tier?: string | null,
  accountType?: string | null,
  enterpriseTier?: string | null,
): string {
  return getTierSubscriptionLabel(
    resolveCurrentTier(subscribed, tier, accountType, enterpriseTier),
  );
}

export function getCurrentTierLabelFromEntitlement(
  entitlement: SubscriptionEntitlement,
): string {
  return getEntitlementTierLabel(entitlement);
}

export { loadSubscriptionEntitlement };
