import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { resolveUserEntitlement } from "@/lib/entitlements/userEntitlementHelpers";
import { supabase } from "@/integrations/supabase/client";
import type { EffectiveTierInput } from "@/lib/subscription/subscriptionState";

export type SubscriptionEntitlement = {
  subscribed: boolean;
  tier: TierSlug;
  accountType?: "individual" | "enterprise";
  enterpriseTier?: string | null;
  subscription?: EffectiveTierInput | null;
};

type UntypedSupabase = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

type UserSubscriptionRow = {
  planTier?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  scheduledDowngradeTier?: string | null;
  scheduledDowngradeEffectiveAt?: string | null;
  gracePeriodEndsAt?: string | null;
};

function mapSubscriptionRow(row: UserSubscriptionRow | null): EffectiveTierInput | null {
  if (!row) return null;
  return {
    planTier: row.planTier ?? null,
    status: row.status ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    scheduledDowngradeTier: row.scheduledDowngradeTier ?? null,
    scheduledDowngradeEffectiveAt: row.scheduledDowngradeEffectiveAt ?? null,
    gracePeriodEndsAt: row.gracePeriodEndsAt ?? null,
  };
}

export async function loadSubscriptionEntitlement(
  userId: string,
): Promise<SubscriptionEntitlement> {
  const client = supabase as unknown as UntypedSupabase;
  const [profileResult, subscriptionResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscribed, tier, accountType, enterpriseTier")
      .eq("id", userId)
      .maybeSingle(),
    client
      .from("userSubscription")
      .select(
        "planTier, status, currentPeriodEnd, scheduledDowngradeTier, scheduledDowngradeEffectiveAt, gracePeriodEndsAt",
      )
      .eq("userId", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;

  const subscription = mapSubscriptionRow(
    subscriptionResult.data as UserSubscriptionRow | null,
  );

  const resolved = resolveUserEntitlement({
    subscribed: profileResult.data?.subscribed,
    tier: profileResult.data?.tier,
    accountType: profileResult.data?.accountType,
    enterpriseTier: profileResult.data?.enterpriseTier,
    subscription,
  });

  return {
    subscribed: resolved.subscribed,
    tier: resolved.tier,
    accountType: resolved.accountType,
    enterpriseTier: profileResult.data?.enterpriseTier ?? null,
    subscription,
  };
}

export function resolveCurrentTier(entitlement: SubscriptionEntitlement): TierSlug {
  return resolveUserEntitlement(entitlement).tier;
}

export function getCurrentTierLabel(entitlement: SubscriptionEntitlement): string {
  return getTierSubscriptionLabel(resolveCurrentTier(entitlement));
}
