export type AccountType = "individual" | "enterprise";
export type EntitlementTier = "free" | "pro" | "premium";

export type UserEntitlementInput = {
  accountType?: string | null;
  enterpriseTier?: string | null;
  subscribed?: boolean | null;
  tier?: string | null;
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

export function resolveUserEntitlement(input: UserEntitlementInput): ResolvedUserEntitlement {
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

  const subscribed = input.subscribed === true;
  const tier =
    normalizeTier(input.tier) ?? (subscribed ? "pro" : "free");

  return {
    accountType,
    tier,
    subscribed,
    bypassBilling: false,
    bypassSessionLimit: subscribed || tier !== "free",
  };
}

export function isFreeTierUser(input: UserEntitlementInput): boolean {
  const entitlement = resolveUserEntitlement(input);
  return entitlement.tier === "free" && !entitlement.bypassSessionLimit;
}
