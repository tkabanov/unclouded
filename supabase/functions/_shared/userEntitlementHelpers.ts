/**
 * Effective entitlement resolution for edge functions.
 *
 * Mirrors `frontend/src/lib/entitlements/userEntitlementHelpers.ts`.
 * `profiles.subscribed` / `profiles.tier` are a denormalized cache of the
 * `userSubscription` state machine; when the caller has the subscription record
 * itself, that wins because it stays correct even if the lifecycle cron has not
 * yet transitioned a row whose scheduled date just elapsed.
 */
import {
  resolveEffectiveTier,
  type SubscriptionStateRow,
} from "./subscriptionLifecycle.ts";

export type AccountType = "individual" | "enterprise";
export type EntitlementTier = "free" | "pro" | "premium";

export type UserEntitlementInput = {
  accountType?: string | null;
  enterpriseTier?: string | null;
  subscribed?: boolean | null;
  tier?: string | null;
  /** Authoritative subscription state when available. */
  subscription?: SubscriptionStateRow | null;
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
  const entitlement = resolveUserEntitlement(input);
  return entitlement.tier === "free" && !entitlement.bypassSessionLimit;
}
