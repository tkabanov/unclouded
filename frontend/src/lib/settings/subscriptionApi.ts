import { PLANS, PREMIUM_CONTACT_EMAIL, type Plan, type PlanId } from "@/lib/plans";
import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { supabase } from "@/integrations/supabase/client";
import {
  getCurrentTierLabel as getEntitlementTierLabel,
  loadSubscriptionEntitlement,
  requestSubscriptionPlanChange,
  resolveCurrentTier as resolveEntitlementTier,
  type SubscriptionEntitlement,
  type SubscriptionPlanChangeResult,
} from "@/lib/settings/subscriptionEntitlementApi";

export type SubscriptionPlanRow = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  badge?: string;
  features: string[];
  cta: Plan["cta"];
};

/** Map prototype PLANS to subscription tab row shape (fallback when no DB table). */
function plansFromCatalog(): SubscriptionPlanRow[] {
  return PLANS.map((plan) => ({ ...plan }));
}

/**
 * Load subscription plans — prefers future `subscription_plan` rows when present,
 * otherwise falls back to static PLANS catalog aligned with ENUM-04 tier_os.
 */
export async function loadSubscriptionPlans(): Promise<SubscriptionPlanRow[]> {
  const { data, error } = await supabase.from("subscriptionPlan").select("*");

  if (error) {
    throw new Error("Couldn't load subscription plans from database.");
  }

  if (!data?.length) {
    return plansFromCatalog();
  }

  return data.map((row) => {
    const record = row as Record<string, unknown>;
    const name = String(record.name ?? record.name ?? "");
    const priceNumber = record.price ?? record.price;
    const price =
      typeof priceNumber === "number"
        ? priceNumber === 0
          ? "$0"
          : `$${priceNumber}`
        : String(priceNumber ?? "");
    const featuresRaw = record.features ?? record.features;
    const features =
      typeof featuresRaw === "string"
        ? featuresRaw.split("\n").map((line) => line.trim()).filter(Boolean)
        : Array.isArray(featuresRaw)
          ? featuresRaw.map(String)
          : [];

    const slug = (record.tierSlug ?? record.id ?? name).toString().toLowerCase() as PlanId;
    const catalog = PLANS.find((plan) => plan.id === slug);

    return {
      id: catalog?.id ?? (slug as PlanId),
      name: name || catalog?.name || slug,
      price: price || catalog?.price || "",
      period: catalog?.period ?? "/month",
      tagline: String(record.description ?? record.description ?? catalog?.tagline ?? ""),
      badge: catalog?.badge,
      features: features.length ? features : (catalog?.features ?? []),
      cta: catalog?.cta ?? "current",
    };
  });
}

export function resolveCurrentTier(subscribed: boolean, tier?: string | null): TierSlug {
  const normalized = (tier ?? "").toLowerCase();
  if (normalized === "pro" || normalized === "premium" || normalized === "free") {
    return normalized;
  }
  return subscribed ? "pro" : "free";
}

export function resolveCurrentTierFromEntitlement(
  entitlement: SubscriptionEntitlement,
): TierSlug {
  return resolveEntitlementTier(entitlement);
}

export function getCurrentTierLabel(subscribed: boolean, tier?: string | null): string {
  return getTierSubscriptionLabel(resolveCurrentTier(subscribed, tier));
}

export function getCurrentTierLabelFromEntitlement(
  entitlement: SubscriptionEntitlement,
): string {
  return getEntitlementTierLabel(entitlement);
}

export async function selectSubscriptionPlan(planId: PlanId): Promise<SubscriptionPlanChangeResult> {
  if (planId === "premium") {
    throw new Error("Premium requires a coaching match request.");
  }

  return requestSubscriptionPlanChange(planId);
}

export { loadSubscriptionEntitlement };

export type BillingPortalResult = {
  status?: string;
  message?: string;
  url?: string;
  portal_url?: string;
};

export type BillingInvoice = {
  id: string;
  amount: string;
  date: string;
};

function parseBillingPortalResult(data: unknown): BillingPortalResult {
  if (!data || typeof data !== "object") {
    throw new Error("Billing portal returned an invalid response.");
  }
  return data as BillingPortalResult;
}

function parseBillingInvoices(data: unknown): BillingInvoice[] {
  if (!Array.isArray(data)) {
    throw new Error("Invoice history returned an invalid response.");
  }

  return data.map((row, index) => {
    if (!row || typeof row !== "object") {
      throw new Error(`Invoice row ${index + 1} is invalid.`);
    }
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id ?? ""),
      amount: String(record.amount ?? ""),
      date: String(record.date ?? ""),
    };
  });
}

export async function requestBillingPortal(): Promise<BillingPortalResult> {
  const { data, error } = await supabase.rpc("open_billing_portal");
  if (error) {
    throw new Error("Billing portal is not connected yet.");
  }
  return parseBillingPortalResult(data);
}

export async function requestInvoices(): Promise<BillingInvoice[]> {
  const { data, error } = await supabase.rpc("list_billing_invoices");
  if (error) {
    throw new Error("Invoice history is not available yet.");
  }
  return parseBillingInvoices(data);
}

export { PREMIUM_CONTACT_EMAIL };
