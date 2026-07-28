import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { resolveUserEntitlement } from "@/lib/entitlements/userEntitlementHelpers";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionEntitlement = {
  subscribed: boolean;
  tier: TierSlug;
  accountType?: "individual" | "enterprise";
  enterpriseTier?: string | null;
};

export async function loadSubscriptionEntitlement(
  userId: string,
): Promise<SubscriptionEntitlement> {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscribed, tier, accountType, enterpriseTier")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const resolved = resolveUserEntitlement({
    subscribed: data?.subscribed,
    tier: data?.tier,
    accountType: data?.accountType,
    enterpriseTier: data?.enterpriseTier,
  });

  return {
    subscribed: resolved.subscribed,
    tier: resolved.tier,
    accountType: resolved.accountType,
    enterpriseTier: data?.enterpriseTier ?? null,
  };
}

export function resolveCurrentTier(entitlement: SubscriptionEntitlement): TierSlug {
  return resolveUserEntitlement(entitlement).tier;
}

export function getCurrentTierLabel(entitlement: SubscriptionEntitlement): string {
  return getTierSubscriptionLabel(resolveCurrentTier(entitlement));
}
