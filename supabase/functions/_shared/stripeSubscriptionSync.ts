/**
 * Persist Stripe subscription state into `userSubscription` (service_role RPC).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

import {
  describeStripePrice,
  isoFromUnixSeconds,
  subscriptionBillingPeriod,
  type PlanPriceRow,
} from "./stripeBilling.ts";
import { foundingDiscountEndsAt } from "./foundingMember.ts";
import {
  statusFromStripe,
  type BillingInterval,
} from "./subscriptionLifecycle.ts";

function intervalFromSubscription(
  subscription: Stripe.Subscription,
  prices: PlanPriceRow[],
): BillingInterval {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const described = describeStripePrice(prices, priceId);
  if (described) return described.interval;
  return subscription.items.data[0]?.price?.recurring?.interval === "year" ? "year" : "month";
}

export async function syncStripeSubscriptionForUser(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  userId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const described = describeStripePrice(prices, priceId);
  const interval = intervalFromSubscription(subscription, prices);
  const status = statusFromStripe(subscription.status, subscription.cancel_at_period_end === true);
  const planTier = status === "inactive" ? "free" : (described?.tier ?? "pro");
  const { periodStart, periodEnd } = subscriptionBillingPeriod(subscription);

  const { error } = await service.rpc("billing_sync_stripe_subscription", {
    p_user_id: userId,
    p_plan_tier: planTier,
    p_status: status,
    p_billing_interval: status === "inactive" ? null : interval,
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_cancel_at_period_end: subscription.cancel_at_period_end === true,
    p_stripe_customer_id: customerId ?? null,
    p_stripe_subscription_id: subscription.id,
    p_stripe_price_id: priceId,
  });
  if (error) throw new Error(`billing_sync_stripe_subscription: ${error.message}`);

  if (described?.isFoundingRate) {
    const startedAt =
      isoFromUnixSeconds(subscription.start_date) ?? new Date().toISOString();
    const { data: foundingResult, error: foundingError } = await service.rpc(
      "billing_start_founding_member",
      {
        p_user_id: userId,
        p_started_at: startedAt,
      },
    );
    if (foundingError) throw new Error(`billing_start_founding_member: ${foundingError.message}`);
    const foundingStatus =
      foundingResult && typeof foundingResult === "object" && "status" in foundingResult
        ? String((foundingResult as { status?: unknown }).status ?? "")
        : "";
    if (foundingStatus === "forfeited") {
      console.warn(
        `stripe-sync: founding rate on Stripe for ${userId} but discount was forfeited — not re-enrolling`,
      );
    } else if (foundingStatus === "campaign_full") {
      console.warn(`stripe-sync: founding campaign full while syncing ${userId}`);
    } else {
      console.log(
        `stripe-sync: founding member ${userId} discount ends ${foundingDiscountEndsAt(startedAt)}`,
      );
    }
  }
}
