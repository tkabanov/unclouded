/**
 * Effective entitlement resolution.
 *
 * `profiles.subscribed` / `profiles.tier` are a denormalized cache kept in sync
 * with `userSubscription` by trigger, so they normally already hold the
 * effective tier. When the caller has the subscription record itself, that wins:
 * it stays correct even if the lifecycle cron has not yet transitioned a row
 * whose scheduled cancellation or grace period has just elapsed.
 */
import {
  resolveEffectiveTier,
  type EffectiveTierInput,
} from "@/lib/subscription/subscriptionState";

export type AccountType = "individual" | "enterprise";
export type EntitlementTier = "free" | "pro" | "premium";

export type UserEntitlementInput = {
  accountType?: string | null;
  enterpriseTier?: string | null;
  subscribed?: boolean | null;
  tier?: string | null;
  /** Authoritative subscription state when available. */
  subscription?: EffectiveTierInput | null;
};

export type ResolvedUserEntitlement = {
  accountType: AccountType;
  tier: EntitlementTier;
  subscribed: boolean;
  bypassBilling: boolean;
  bypassSessionLimit: boolean;
};

function normalizeTier(value: string | null | undefined): EntitlementTier | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "free" || normalized === "pro" || normalized === "premium") {
    return normalized;
  }
  return null;
}

/**
 * Fallback for callers without the subscription record, in parity with the
 * `effective_user_tier` SQL fallback: a named paid tier wins, otherwise a legacy
 * `subscribed` row counts as Pro.
 */
function cachedTier(input: UserEntitlementInput): EntitlementTier {
  const tier = normalizeTier(input.tier);
  if (tier === "pro" || tier === "premium") return tier;
  return input.subscribed === true ? "pro" : "free";
}

export function resolveUserEntitlement(
  input: UserEntitlementInput,
  nowMs = Date.now(),
): ResolvedUserEntitlement {
  const accountType: AccountType =
    input.accountType?.trim().toLowerCase() === "enterprise" ? "enterprise" : "individual";

  // Enterprise access comes from the workplace contract, not from Stripe.
  if (accountType === "enterprise") {
    const tier = normalizeTier(input.enterpriseTier) ?? "pro";
    return {
      accountType,
      tier,
      subscribed: true,
      bypassBilling: true,
      bypassSessionLimit: true,
    };
  }

  const tier = input.subscription
    ? resolveEffectiveTier(input.subscription, nowMs)
    : cachedTier(input);

  const subscribed = tier !== "free";

  return {
    accountType,
    tier,
    subscribed,
    bypassBilling: false,
    bypassSessionLimit: subscribed,
  };
}

export function isFreeTierUser(input: UserEntitlementInput): boolean {
  return !resolveUserEntitlement(input).bypassSessionLimit;
}
