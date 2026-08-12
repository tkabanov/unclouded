/**
 * Stripe wiring shared by the subscription edge functions.
 *
 * Price IDs live in `subscriptionPlanPrice` rather than in env vars so the
 * Founding Member rate and yearly rates can be managed without a redeploy.
 * Amounts shown to the user always come from Stripe — never computed in the app.
 */
import Stripe from "npm:stripe@17.7.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  appOrigin,
  canonicalAppOrigin,
  resolveRequestAppOrigin,
} from "./appOrigin.ts";
import {
  type BillingInterval,
  type PaidTier,
  type SubscriptionTier,
} from "./subscriptionLifecycle.ts";

export type PlanPriceRow = {
  tierSlug: PaidTier;
  billingInterval: BillingInterval;
  stripePriceId: string | null;
  amountCents: number | null;
  currency: string;
  isFoundingRate: boolean;
  isActive: boolean;
};

export { appOrigin, canonicalAppOrigin, resolveRequestAppOrigin };

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-01-27.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return stripeSingleton;
}

export function getServiceClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function loadPlanPrices(client: SupabaseClient): Promise<PlanPriceRow[]> {
  const { data, error } = await client
    .from("subscriptionPlanPrice")
    .select(
      'tierSlug, billingInterval, stripePriceId, amountCents, currency, isFoundingRate, isActive',
    );

  if (error) throw new Error(`Couldn't load plan prices: ${error.message}`);
  return (data ?? []) as PlanPriceRow[];
}

/**
 * Resolve the price a user should be charged. Founding Members keep the
 * discounted Pro rate until their discount ends; everyone else gets the
 * standard rate for the tier and interval.
 */
export function selectPlanPrice(
  prices: PlanPriceRow[],
  tier: PaidTier,
  interval: BillingInterval,
  useFoundingRate: boolean,
): PlanPriceRow | null {
  const candidates = prices.filter(
    (price) =>
      price.tierSlug === tier &&
      price.billingInterval === interval &&
      price.isActive &&
      !!price.stripePriceId,
  );

  if (useFoundingRate) {
    const founding = candidates.find((price) => price.isFoundingRate);
    if (founding) return founding;
  }

  return candidates.find((price) => !price.isFoundingRate) ?? null;
}

export type SubscriptionRow = {
  userId: string;
  planTier: SubscriptionTier;
  status: string;
  billingInterval: BillingInterval | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledDowngradeTier: string | null;
  scheduledDowngradeEffectiveAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  isFoundingMember: boolean;
  foundingDiscountEndsAt: string | null;
  foundingDiscountForfeitedAt: string | null;
  gracePeriodEndsAt: string | null;
};

const SUBSCRIPTION_COLUMNS =
  'userId, planTier, status, billingInterval, currentPeriodStart, currentPeriodEnd, ' +
  'cancelAtPeriodEnd, scheduledDowngradeTier, scheduledDowngradeEffectiveAt, ' +
  'stripeCustomerId, stripeSubscriptionId, stripePriceId, isFoundingMember, ' +
  'foundingDiscountEndsAt, foundingDiscountForfeitedAt, gracePeriodEndsAt';

export async function loadSubscriptionRow(
  client: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await client
    .from("userSubscription")
    .select(SUBSCRIPTION_COLUMNS)
    .eq("userId", userId)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load subscription: ${error.message}`);
  return (data as SubscriptionRow | null) ?? null;
}

export type BillingProfile = {
  id: string;
  email: string | null;
  accountType: string | null;
  signupPlan: string | null;
};

export async function loadBillingProfile(
  client: SupabaseClient,
  userId: string,
): Promise<BillingProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id, email, accountType, signupPlan")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load profile: ${error.message}`);
  return (data as BillingProfile | null) ?? null;
}

/** Reuse the stored Stripe customer, otherwise create and persist one. */
export async function ensureStripeCustomer(
  service: SupabaseClient,
  profile: BillingProfile,
  existingCustomerId: string | null,
): Promise<string> {
  const stripe = getStripe();

  // Stale IDs happen when STRIPE_SECRET_KEY points at a different Stripe
  // account than the one that created the stored customer (local QA / key swap).
  if (existingCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(existingCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        return existingCustomerId;
      }
    } catch (err) {
      console.warn(
        `Stored Stripe customer ${existingCustomerId} missing; creating a replacement`,
        err,
      );
    }
  }

  const customer = await stripe.customers.create({
    email: profile.email ?? undefined,
    metadata: { userId: profile.id },
  });

  const { error } = await service.rpc("billing_attach_stripe_customer", {
    p_user_id: profile.id,
    p_stripe_customer_id: customer.id,
  });
  if (error) throw new Error(`Couldn't attach Stripe customer: ${error.message}`);

  return customer.id;
}

/** Map a Stripe price back onto our tier + interval. */
export function describeStripePrice(
  prices: PlanPriceRow[],
  stripePriceId: string | null | undefined,
): { tier: PaidTier; interval: BillingInterval; isFoundingRate: boolean } | null {
  if (!stripePriceId) return null;
  const match = prices.find((price) => price.stripePriceId === stripePriceId);
  if (!match) return null;
  return {
    tier: match.tierSlug,
    interval: match.billingInterval,
    isFoundingRate: match.isFoundingRate,
  };
}

export function isoFromUnixSeconds(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Billing period bounds on the Stripe Subscription object moved onto
 * subscription items in newer API versions — read both so sync never writes NULL.
 */
export function subscriptionBillingPeriod(subscription: Stripe.Subscription): {
  periodStart: string | null;
  periodEnd: string | null;
} {
  const item = subscription.items.data[0];
  const itemPeriod = item as Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  };
  const startSeconds =
    subscription.current_period_start ?? itemPeriod?.current_period_start;
  const endSeconds = subscription.current_period_end ?? itemPeriod?.current_period_end;

  return {
    periodStart: isoFromUnixSeconds(startSeconds),
    periodEnd: isoFromUnixSeconds(endSeconds),
  };
}
