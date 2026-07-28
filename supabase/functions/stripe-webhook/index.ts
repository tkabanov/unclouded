/**
 * Stripe webhook — the only authority that activates paid access and grants
 * Premium credits.
 *
 * POST /functions/v1/stripe-webhook  (no JWT; verified by Stripe signature)
 *
 * Idempotency is layered:
 *  - `stripeWebhookEvent` rejects a replayed `event.id`;
 *  - the credit ledger has a unique index per (user, invoice) accrual, so even a
 *    concurrent duplicate delivery cannot grant two credits.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

import {
  getServiceClient,
  getStripe,
  json,
  loadPlanPrices,
  requireEnv,
  type PlanPriceRow,
} from "../_shared/stripeBilling.ts";
import {
  listBillableStripeSubscriptions,
  reconcileDuplicateStripeSubscriptions,
} from "../_shared/stripeSubscriptionReconcile.ts";
import { grantPremiumCreditForInvoice } from "../_shared/premiumCreditGrant.ts";
import { syncStripeSubscriptionForUser } from "../_shared/stripeSubscriptionSync.ts";
import {
  graceDeadlineFrom,
  type BillingInterval,
} from "../_shared/subscriptionLifecycle.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** Returns false when this event id has already been processed. */
async function claimEvent(
  service: SupabaseClient,
  event: Stripe.Event,
): Promise<boolean> {
  const { error } = await service.from("stripeWebhookEvent").insert({
    id: event.id,
    type: event.type,
  });

  if (!error) return true;
  // 23505 = unique violation: a duplicate delivery of an event we already ran.
  if (error.code === "23505") return false;
  throw new Error(`Couldn't record webhook event: ${error.message}`);
}

async function resolveUserId(
  service: SupabaseClient,
  candidates: {
    metadataUserId?: string | null;
    customerId?: string | null;
  },
): Promise<string | null> {
  if (candidates.metadataUserId) return candidates.metadataUserId;
  if (!candidates.customerId) return null;

  const { data, error } = await service
    .from("userSubscription")
    .select("userId")
    .eq("stripeCustomerId", candidates.customerId)
    .maybeSingle();

  if (error) throw new Error(`Couldn't resolve user by customer: ${error.message}`);
  return (data?.userId as string | undefined) ?? null;
}

async function syncSubscription(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  const userId = await resolveUserId(service, {
    metadataUserId: subscription.metadata?.userId ?? null,
    customerId: customerId ?? null,
  });
  if (!userId) {
    console.warn(`stripe-webhook: no user for subscription ${subscription.id}`);
    return null;
  }

  await syncStripeSubscriptionForUser(service, prices, userId, subscription);

  if (customerId) {
    const stripe = getStripe();
    await reconcileDuplicateStripeSubscriptions(
      stripe,
      customerId,
      subscription.id,
    );
  }

  return userId;
}

async function handleInvoicePaid(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const subscriptionId =
    typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  // Re-sync first so a renewal that recovered from past due is active again
  // before we decide whether a credit is owed.
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(service, prices, subscription);
  }

  const userId = await resolveUserId(service, {
    metadataUserId: invoice.subscription_details?.metadata?.userId ?? null,
    customerId: customerId ?? null,
  });
  if (!userId) {
    console.warn(`stripe-webhook: no user for invoice ${invoice.id}`);
    return;
  }

  // One credit per successful Premium billing period. The RPC no-ops for
  // non-Premium users and for an invoice it has already credited.
  const data = await grantPremiumCreditForInvoice(service, userId, invoice.id);
  console.log(`stripe-webhook: credit for ${userId} → ${JSON.stringify(data)}`);
}

async function handleInvoicePaymentFailed(
  service: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const userId = await resolveUserId(service, {
    metadataUserId: invoice.subscription_details?.metadata?.userId ?? null,
    customerId: customerId ?? null,
  });
  if (!userId) return;

  const { data: subRow } = await service
    .from("userSubscription")
    .select("billingInterval")
    .eq("userId", userId)
    .maybeSingle();

  const interval = (subRow?.billingInterval as BillingInterval | null) ?? "month";

  // Grace period follows the provider retry window: 7 days monthly, 14 yearly.
  const { error } = await service.rpc("billing_mark_payment_failed", {
    p_user_id: userId,
    p_grace_period_ends_at: graceDeadlineFrom(interval),
  });
  if (error) throw new Error(`billing_mark_payment_failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing stripe-signature" }, 400);
  }

  const payload = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("stripe-webhook signature verification failed", err);
    return json({ error: "Invalid signature" }, 400);
  }

  const service = getServiceClient();

  try {
    if (!(await claimEvent(service, event))) {
      return json({ received: true, duplicate: true });
    }

    const prices = await loadPlanPrices(service);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          // Carry the app user id onto the subscription so later events resolve
          // even if the customer record is shared.
          if (!subscription.metadata?.userId && session.metadata?.userId) {
            await stripe.subscriptions.update(subscriptionId, {
              metadata: { ...subscription.metadata, userId: session.metadata.userId },
            });
            subscription.metadata = {
              ...subscription.metadata,
              userId: session.metadata.userId,
            };
          }
          await syncSubscription(service, prices, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(service, prices, event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.paid": {
        await handleInvoicePaid(service, prices, stripe, event.data.object as Stripe.Invoice);
        break;
      }

      case "invoice.payment_failed": {
        await handleInvoicePaymentFailed(service, event.data.object as Stripe.Invoice);
        break;
      }

      default:
        // Everything else is recorded and ignored on purpose.
        break;
    }

    return json({ received: true });
  } catch (err) {
    console.error(`stripe-webhook ${event.type} failed`, err);
    // Let Stripe retry: the event row is rolled back only if we mark it failed.
    await service.from("stripeWebhookEvent").delete().eq("id", event.id);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
