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

const MIGRATION_PATH = resolve(
  import.meta.dirname,
  "../../../../supabase/migrations/20260710140000_protect_subscription_entitlement.sql",
);

describe("subscription entitlement migration security contract", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

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

  it("routes plan changes through request_subscription_plan_change for authenticated users", () => {
    expect(sql).toMatch(/request_subscription_plan_change\(p_plan_id text\)/);
    expect(sql).toMatch(/auth\.uid\(\)/);
    expect(sql).toMatch(/billing_required/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.request_subscription_plan_change\(text\)/);
    expect(sql).toMatch(/TO authenticated/);
  });

  it("exposes billing_webhook_set_entitlement to service_role only", () => {
    expect(sql).toMatch(/billing_webhook_set_entitlement\(/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.billing_webhook_set_entitlement\(uuid, boolean, text\)/);
    expect(sql).toMatch(/TO service_role/);
  });
});

describe("resolveCurrentTier", () => {
  it("prefers explicit profile tier over subscribed flag", () => {
    expect(resolveCurrentTier(false, "pro")).toBe("pro");
    expect(resolveCurrentTier(true, "free")).toBe("free");
  });

  it("falls back to subscribed boolean when tier is missing", () => {
    expect(resolveCurrentTier(true, null)).toBe("pro");
    expect(resolveCurrentTier(false, null)).toBe("free");
  });
});

describe("subscriptionEntitlement helpers", () => {
  it("labels tier from entitlement record", () => {
    const entitlement: SubscriptionEntitlement = { subscribed: true, tier: "pro" };
    expect(resolveEntitlementTier(entitlement)).toBe("pro");
    expect(getEntitlementLabel(entitlement)).toBe(getCurrentTierLabel(true, "pro"));
  });
});

function parsePlanChangeResult(data: unknown) {
  if (!data || typeof data !== "object") return { status: "error" };
  return data as Record<string, unknown>;
}

describe("request_subscription_plan_change contract", () => {
  it("documents honest upgrade stub without self-elevation", () => {
    const proAttempt = parsePlanChangeResult({
      status: "billing_required",
      subscribed: false,
      tier: "free",
      message: "Checkout is not connected yet. Connect Stripe billing to upgrade your plan.",
    });
    expect(proAttempt.status).toBe("billing_required");
    expect(proAttempt.subscribed).toBe(false);
  });

  it("allows downgrade to free through server RPC", () => {
    const downgrade = parsePlanChangeResult({
      status: "ok",
      subscribed: false,
      tier: "free",
      message: "Moved to the Free plan.",
    });
    expect(downgrade.status).toBe("ok");
    expect(downgrade.tier).toBe("free");
  });
});
