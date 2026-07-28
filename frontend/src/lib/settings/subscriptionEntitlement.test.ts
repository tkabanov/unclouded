import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getCurrentTierLabel,
  resolveCurrentTier,
} from "@/lib/settings/subscriptionApi";
import {
  getCurrentTierLabel as getEntitlementLabel,
  resolveCurrentTier as resolveEntitlementTier,
  type SubscriptionEntitlement,
} from "@/lib/settings/subscriptionEntitlementApi";

const MIGRATIONS = resolve(import.meta.dirname, "../../../../supabase/migrations");

function migration(name: string): string {
  return readFileSync(resolve(MIGRATIONS, name), "utf8");
}

describe("subscription entitlement migration security contract", () => {
  const sql = migration("20260710140000_protect_subscription_entitlement.sql");

  it("blocks direct client updates to subscribed and tier via trigger", () => {
    expect(sql).toMatch(/profiles_protect_entitlement_columns/);
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE ON public\.profiles/);
    expect(sql).toMatch(/NEW\.subscribed := OLD\.subscribed/);
    expect(sql).toMatch(/NEW\.tier := OLD\.tier/);
    expect(sql).toMatch(/REVOKE UPDATE \(subscribed, tier\) ON public\.profiles FROM authenticated/);
  });

  it("forces safe defaults on owner INSERT without billing sync", () => {
    expect(sql).toMatch(/IF TG_OP = 'INSERT' THEN/);
    expect(sql).toMatch(/NEW\.subscribed := false/);
    expect(sql).toMatch(/NEW\.tier := 'free'/);
    expect(sql).toMatch(/subscribed IS NOT TRUE/);
  });
});

describe("pre-Stripe billing stubs are retired", () => {
  const rpcs = migration("20260727110000_billing_subscription_rpcs.sql");
  const enforcement = migration("20260727140000_paid_feature_server_enforcement.sql");

  it("drops the demo plan-change, portal, and invoice RPCs", () => {
    expect(rpcs).toMatch(/DROP FUNCTION IF EXISTS public\.request_subscription_plan_change\(text\);/);
    expect(rpcs).toMatch(/DROP FUNCTION IF EXISTS public\.open_billing_portal\(\);/);
    expect(rpcs).toMatch(/DROP FUNCTION IF EXISTS public\.list_billing_invoices\(\);/);
  });

  it("drops the entitlement writer that bypassed the subscription state machine", () => {
    expect(enforcement).toMatch(
      /DROP FUNCTION IF EXISTS public\.billing_webhook_set_entitlement\(uuid, boolean, text\);/,
    );
  });

  it("writes entitlement only from the Stripe sync path, as service_role", () => {
    expect(rpcs).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.billing_sync_stripe_subscription\([\s\S]*?\) TO service_role;/,
    );
  });
});

describe("resolveCurrentTier", () => {
  it("prefers a named paid tier over the subscribed flag", () => {
    expect(resolveCurrentTier(false, "pro")).toBe("pro");
    expect(resolveCurrentTier(false, "premium")).toBe("premium");
  });

  it("treats a legacy subscribed row without a paid tier as Pro", () => {
    // Parity with the `effective_user_tier` SQL fallback for profiles that
    // predate `userSubscription`.
    expect(resolveCurrentTier(true, "free")).toBe("pro");
    expect(resolveCurrentTier(true, null)).toBe("pro");
    expect(resolveCurrentTier(false, null)).toBe("free");
  });

  it("uses enterprise tier when accountType is enterprise", () => {
    expect(resolveCurrentTier(false, "free", "enterprise", "premium")).toBe("premium");
  });

  it("prefers the subscription record over the cached columns", () => {
    const expiredCancellation = {
      planTier: "premium",
      status: "scheduledToCancel",
      currentPeriodEnd: new Date(Date.now() - 60_000).toISOString(),
    };

    expect(resolveCurrentTier(true, "premium", "individual", null, expiredCancellation)).toBe(
      "free",
    );
  });
});

describe("subscriptionEntitlement helpers", () => {
  it("labels tier from entitlement record", () => {
    const entitlement: SubscriptionEntitlement = { subscribed: true, tier: "pro" };
    expect(resolveEntitlementTier(entitlement)).toBe("pro");
    expect(getEntitlementLabel(entitlement)).toBe(getCurrentTierLabel(true, "pro"));
  });
});
