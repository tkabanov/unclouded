import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { resolveUserEntitlement } from "@/lib/entitlements/userEntitlementHelpers";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionEntitlement = {
  subscribed: boolean;
  tier: TierSlug;
  accountType?: "individual" | "enterprise";
  enterpriseTier?: string | null;
};

export type SubscriptionPlanChangeResult = {
  status: "ok" | "billing_required" | "invalid_plan" | "enterprise_covered" | "error";
  subscribed?: boolean;
  tier?: string | null;
  message?: string;
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

function parsePlanChangeResult(data: unknown): SubscriptionPlanChangeResult {
  if (!data || typeof data !== "object") {
    return { status: "error", message: "Invalid subscription response." };
  }

  const row = data as Record<string, unknown>;
  const status = row.status;
  if (
    status !== "ok" &&
    status !== "billing_required" &&
    status !== "invalid_plan" &&
    status !== "enterprise_covered"
  ) {
    return { status: "error", message: "Unknown subscription response." };
  }

  return {
    status,
    subscribed: row.subscribed === true,
    tier: typeof row.tier === "string" ? row.tier : null,
    message: typeof row.message === "string" ? row.message : undefined,
  };
}

export async function requestSubscriptionPlanChange(
  planId: string,
): Promise<SubscriptionPlanChangeResult> {
  const { data, error } = await supabase.rpc("request_subscription_plan_change", {
    p_plan_id: planId,
  });

  if (error) {
    throw new Error(error.message || "Couldn't update your subscription.");
  }

  return parsePlanChangeResult(data);
}
