import { PLANS, PREMIUM_CONTACT_EMAIL, type Plan, type PlanId } from "@/lib/plans";
import { getTierSubscriptionLabel, type TierSlug } from "@/lib/enums/subscription";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.from("subscription_plan").select("*");

  if (error || !data?.length) {
    return plansFromCatalog();
  }

  return data.map((row) => {
    const record = row as Record<string, unknown>;
    const name = String(record.name_text ?? record.name ?? "");
    const priceNumber = record.price_number ?? record.price;
    const price =
      typeof priceNumber === "number"
        ? priceNumber === 0
          ? "$0"
          : `$${priceNumber}`
        : String(priceNumber ?? "");
    const featuresRaw = record.features_text ?? record.features;
    const features =
      typeof featuresRaw === "string"
        ? featuresRaw.split("\n").map((line) => line.trim()).filter(Boolean)
        : Array.isArray(featuresRaw)
          ? featuresRaw.map(String)
          : [];

    const slug = (record.tier_slug ?? record.id ?? name).toString().toLowerCase() as PlanId;
    const catalog = PLANS.find((plan) => plan.id === slug);

    return {
      id: catalog?.id ?? (slug as PlanId),
      name: name || catalog?.name || slug,
      price: price || catalog?.price || "",
      period: catalog?.period ?? "/month",
      tagline: String(record.description_text ?? record.description ?? catalog?.tagline ?? ""),
      badge: catalog?.badge,
      features: features.length ? features : (catalog?.features ?? []),
      cta: catalog?.cta ?? "current",
    };
  });
}

export function resolveCurrentTier(subscribed: boolean): TierSlug {
  return subscribed ? "pro" : "free";
}

export function getCurrentTierLabel(subscribed: boolean): string {
  return getTierSubscriptionLabel(resolveCurrentTier(subscribed));
}

export async function selectSubscriptionPlan(
  userId: string,
  planId: PlanId,
): Promise<void> {
  if (planId === "premium") {
    throw new Error("Premium requires a coaching match request.");
  }

  const subscribed = planId === "pro";
  const { error } = await supabase
    .from("profiles")
    .update({ subscribed })
    .eq("id", userId);

  if (error) throw error;
}

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
