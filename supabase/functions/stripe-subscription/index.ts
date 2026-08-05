/**
 * Subscription changes for an existing paid subscription.
 *
 * POST /functions/v1/stripe-subscription
 * Body: { "action": "cancel" | "resume" | "scheduleDowngrade" | "cancelDowngrade"
 *                 | "previewUpgrade" | "confirmUpgrade" }
 *
 * Every action is re-validated against the stored state, so a stale tab or a
 * double-submit cannot cancel twice, resume a live subscription, or stack a
 * downgrade on top of a scheduled cancellation.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  corsHeaders,
  describeStripePrice,
  getServiceClient,
  getStripe,
  json,
  loadBillingProfile,
  loadPlanPrices,
  loadSubscriptionRow,
  selectPlanPrice,
  subscriptionBillingPeriod,
  type PlanPriceRow,
  type SubscriptionRow,
} from "../_shared/stripeBilling.ts";
import {
  describeRejection,
  isActionAllowed,
  type SubscriptionAction,
} from "../_shared/subscriptionActions.ts";
import {
  normalizeStatus,
  resolveEffectiveTier,
} from "../_shared/subscriptionLifecycle.ts";
import {
  reconcileDuplicateStripeSubscriptions,
  listBillableStripeSubscriptions,
} from "../_shared/stripeSubscriptionReconcile.ts";
import { grantPremiumCreditFromLatestPaidInvoice } from "../_shared/premiumCreditGrant.ts";
import { grantSuccessPlanAddonFromLatestPaidCheckout } from "../_shared/successPlanAddonGrant.ts";
import { syncStripeSubscriptionForUser } from "../_shared/stripeSubscriptionSync.ts";

type ActionName =
  | "cancel"
  | "resume"
  | "scheduleDowngrade"
  | "cancelDowngrade"
  | "previewUpgrade"
  | "confirmUpgrade"
  | "sync";

const ACTION_NAMES: readonly ActionName[] = [
  "cancel",
  "resume",
  "scheduleDowngrade",
  "cancelDowngrade",
  "previewUpgrade",
  "confirmUpgrade",
  "sync",
];

/** Actions map onto the shared permission model; previews reuse the upgrade gate. */
function permissionFor(action: ActionName): SubscriptionAction {
  switch (action) {
    case "cancel":
      return "cancel";
    case "resume":
      return "resume";
    case "scheduleDowngrade":
      return "scheduleDowngrade";
    case "cancelDowngrade":
      return "cancelDowngrade";
    case "previewUpgrade":
    case "confirmUpgrade":
      return "upgradeToPremium";
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function currentPriceItem(subscription: Stripe.Subscription): Stripe.SubscriptionItem | null {
  return subscription.items.data[0] ?? null;
}

/** Re-sync period dates from Stripe when Basil API left them NULL in our DB. */
async function backfillSubscriptionFromStripe(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  userId: string,
  stripeSub: Stripe.Subscription,
): Promise<void> {
  await syncStripeSubscriptionForUser(service, prices, userId, stripeSub);
}

/**
 * Stripe is authoritative when our row drifted (duplicate cleanup, missed webhooks).
 */
async function ensureSubscriptionFreshFromStripe(
  service: SupabaseClient,
  stripe: Stripe,
  prices: PlanPriceRow[],
  userId: string,
  subscription: SubscriptionRow,
): Promise<SubscriptionRow> {
  const customerId = subscription.stripeCustomerId;
  if (!customerId && !subscription.stripeSubscriptionId) {
    return subscription;
  }

  let stripeSub: Stripe.Subscription | null = null;
  if (subscription.stripeSubscriptionId) {
    try {
      stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    } catch {
      stripeSub = null;
    }
  }

  if (customerId) {
    const billable = await listBillableStripeSubscriptions(stripe, customerId);
    if (billable.length > 0) {
      const preferred =
        stripeSub && stripeSub.status !== "canceled"
          ? stripeSub.id
          : subscription.stripeSubscriptionId;
      const { keptSubscriptionId } = await reconcileDuplicateStripeSubscriptions(
        stripe,
        customerId,
        preferred,
      );
      const kept =
        billable.find((sub) => sub.id === keptSubscriptionId) ??
        (keptSubscriptionId
          ? await stripe.subscriptions.retrieve(keptSubscriptionId)
          : billable[0]);
      await syncStripeSubscriptionForUser(service, prices, userId, kept);
      return (await loadSubscriptionRow(service, userId)) ?? subscription;
    }
  }

  if (stripeSub) {
    await syncStripeSubscriptionForUser(service, prices, userId, stripeSub);
    return (await loadSubscriptionRow(service, userId)) ?? subscription;
  }

  return subscription;
}

async function resolveCurrentPeriodEnd(
  service: SupabaseClient,
  stripe: Stripe,
  prices: PlanPriceRow[],
  subscription: SubscriptionRow,
  userId: string,
): Promise<string | null> {
  if (subscription.currentPeriodEnd) return subscription.currentPeriodEnd;
  if (!subscription.stripeSubscriptionId) return null;

  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
  const { periodEnd } = subscriptionBillingPeriod(stripeSub);
  if (!periodEnd) return null;

  await backfillSubscriptionFromStripe(service, prices, userId, stripeSub);
  return periodEnd;
}

/** Fresh overview for the caller so the UI can re-render without a second round trip. */
async function loadOverview(userClient: SupabaseClient): Promise<unknown> {
  const { data, error } = await userClient.rpc("get_my_subscription_overview");
  if (error) throw new Error(error.message);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action as ActionName | undefined;
  if (!action || !ACTION_NAMES.includes(action)) {
    return json({ error: `action must be one of: ${ACTION_NAMES.join(", ")}` }, 400);
  }

  const service = getServiceClient();
  const userId = auth.user.id;

  try {
    const profile = await loadBillingProfile(service, userId);
    if (!profile) return json({ error: "Profile not found" }, 404);

    const subscription = await loadSubscriptionRow(service, userId);
    if (!subscription) {
      return json({ status: "no_subscription", message: "No subscription found." }, 409);
    }

    const stripe = getStripe();
    const prices = await loadPlanPrices(service);

    if (action === "sync") {
      const synced =
        subscription.stripeSubscriptionId || subscription.stripeCustomerId
          ? await ensureSubscriptionFreshFromStripe(
              service,
              stripe,
              prices,
              userId,
              subscription,
            )
          : subscription;

      // Checkout redirect often lands before invoice.paid; grant against the
      // latest paid invoice so Premium credits match the tier (idempotent).
      const syncedTier = resolveEffectiveTier(synced);
      if (syncedTier === "premium" && synced.stripeSubscriptionId) {
        try {
          await grantPremiumCreditFromLatestPaidInvoice(
            service,
            stripe,
            userId,
            synced.stripeSubscriptionId,
          );
        } catch (err) {
          console.error("stripe-subscription sync credit grant failed", err);
        }
      }

      // Same lag pattern for one-time Success Plan add-on: pull paid Checkout
      // sessions when checkout.session.completed never reached the webhook.
      const customerId = synced.stripeCustomerId;
      if (customerId && (syncedTier === "pro" || syncedTier === "premium")) {
        try {
          await grantSuccessPlanAddonFromLatestPaidCheckout(
            service,
            stripe,
            userId,
            customerId,
          );
        } catch (err) {
          console.error("stripe-subscription sync success plan grant failed", err);
        }
      }

      return json({
        status: "ok",
        overview: await loadOverview(auth.supabase),
        effectiveTier: syncedTier,
      });
    }

    const freshSubscription = subscription.stripeSubscriptionId || subscription.stripeCustomerId
      ? await ensureSubscriptionFreshFromStripe(service, stripe, prices, userId, subscription)
      : subscription;

    const actionState = {
      ...freshSubscription,
      accountType: profile.accountType,
      hasStripeSubscription: !!freshSubscription.stripeSubscriptionId,
      hasStripeCustomer: !!freshSubscription.stripeCustomerId,
    };

    if (!isActionAllowed(permissionFor(action), actionState)) {
      return json(
        {
          status: "invalid_state",
          message: describeRejection(
            permissionFor(action),
            normalizeStatus(freshSubscription.status),
            resolveEffectiveTier(freshSubscription),
          ),
        },
        409,
      );
    }

    if (!freshSubscription.stripeSubscriptionId) {
      return json(
        {
          status: "no_stripe_subscription",
          message: "This subscription isn't managed by our payment provider yet.",
        },
        409,
      );
    }

    switch (action) {
      case "cancel":
        return await handleCancel(service, stripe, freshSubscription, userId, auth.supabase);
      case "resume":
        return await handleResume(service, stripe, freshSubscription, userId, auth.supabase);
      case "scheduleDowngrade":
        return await handleScheduleDowngrade(
          service,
          stripe,
          prices,
          freshSubscription,
          userId,
          auth.supabase,
        );
      case "cancelDowngrade":
        return await handleCancelDowngrade(service, freshSubscription, userId, auth.supabase);
      case "previewUpgrade":
        return await handlePreviewUpgrade(stripe, freshSubscription, prices);
      case "confirmUpgrade":
        return await handleConfirmUpgrade(
          service,
          stripe,
          freshSubscription,
          prices,
          userId,
          auth.supabase,
        );
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  } catch (err) {
    console.error(`stripe-subscription ${action} failed`, err);
    return json({ error: "We couldn't update your subscription. Please try again." }, 500);
  }
});

async function handleCancel(
  service: SupabaseClient,
  stripe: Stripe,
  subscription: SubscriptionRow,
  userId: string,
  userClient: SupabaseClient,
): Promise<Response> {
  // Auto-renewal off, access untouched until the period ends.
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
    cancel_at_period_end: true,
  });
  const { periodEnd } = subscriptionBillingPeriod(updated);

  const { error } = await service.rpc("billing_set_cancel_at_period_end", {
    p_user_id: userId,
    p_cancel: true,
  });
  if (error) throw new Error(error.message);

  if (subscription.stripeCustomerId) {
    await reconcileDuplicateStripeSubscriptions(
      stripe,
      subscription.stripeCustomerId,
      subscription.stripeSubscriptionId,
    );
  }

  return json({
    status: "ok",
    activeUntil: periodEnd ?? subscription.currentPeriodEnd,
    overview: await loadOverview(userClient),
  });
}

async function handleResume(
  service: SupabaseClient,
  stripe: Stripe,
  subscription: SubscriptionRow,
  userId: string,
  userClient: SupabaseClient,
): Promise<Response> {
  // Restores auto-renewal on the existing cycle — Stripe does not charge now.
  const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId!, {
    cancel_at_period_end: false,
  });
  const { periodEnd } = subscriptionBillingPeriod(updated);

  const { error } = await service.rpc("billing_set_cancel_at_period_end", {
    p_user_id: userId,
    p_cancel: false,
  });
  if (error) throw new Error(error.message);

  return json({
    status: "ok",
    nextRenewalAt: periodEnd ?? subscription.currentPeriodEnd,
    overview: await loadOverview(userClient),
  });
}

async function handleScheduleDowngrade(
  service: SupabaseClient,
  stripe: Stripe,
  prices: PlanPriceRow[],
  subscription: SubscriptionRow,
  userId: string,
  userClient: SupabaseClient,
): Promise<Response> {
  const periodEnd = await resolveCurrentPeriodEnd(
    service,
    stripe,
    prices,
    subscription,
    userId,
  );
  if (!periodEnd) {
    return json(
      {
        status: "missing_period_end",
        message: "We couldn't determine your billing period. Please try again shortly.",
      },
      409,
    );
  }

  // The Stripe price switch happens on the effective date (lifecycle cron) so
  // Premium access and credits survive the rest of the paid period.
  const { error } = await service.rpc("billing_schedule_downgrade", {
    p_user_id: userId,
    p_target_tier: "pro",
    p_effective_at: periodEnd,
  });
  if (error) throw new Error(error.message);

  return json({
    status: "ok",
    effectiveAt: periodEnd,
    overview: await loadOverview(userClient),
  });
}

async function handleCancelDowngrade(
  service: SupabaseClient,
  subscription: SubscriptionRow,
  userId: string,
  userClient: SupabaseClient,
): Promise<Response> {
  const { error } = await service.rpc("billing_cancel_scheduled_downgrade", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);

  return json({
    status: "ok",
    nextRenewalAt: subscription.currentPeriodEnd,
    overview: await loadOverview(userClient),
  });
}

function resolvePremiumPrice(
  prices: PlanPriceRow[],
  subscription: SubscriptionRow,
): PlanPriceRow | null {
  const interval = subscription.billingInterval ?? "month";
  // Founding pricing never applies to Premium.
  return selectPlanPrice(prices, "premium", interval, false);
}

async function handlePreviewUpgrade(
  stripe: Stripe,
  subscription: SubscriptionRow,
  prices: PlanPriceRow[],
): Promise<Response> {
  const premiumPrice = resolvePremiumPrice(prices, subscription);
  if (!premiumPrice?.stripePriceId) {
    return json(
      { status: "price_unavailable", message: "Premium isn't available for your billing cycle yet." },
      409,
    );
  }

  const current = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId!);
  const item = currentPriceItem(current);
  if (!item) {
    return json({ status: "invalid_subscription", message: "No billable item found." }, 409);
  }
  const { periodEnd } = subscriptionBillingPeriod(current);

  // The amount due must come from Stripe, never from a frontend calculation.
  const upcoming = await stripe.invoices.retrieveUpcoming({
    customer: current.customer as string,
    subscription: current.id,
    subscription_items: [{ id: item.id, price: premiumPrice.stripePriceId }],
    subscription_proration_behavior: "always_invoice",
    subscription_cancel_at_period_end: false,
  });

  const proratedCredit = upcoming.lines.data
    .filter((line) => (line.amount ?? 0) < 0)
    .reduce((total, line) => total + (line.amount ?? 0), 0);

  return json({
    status: "ok",
    currency: upcoming.currency,
    amountDueCents: upcoming.amount_due,
    subtotalCents: upcoming.subtotal,
    taxCents: upcoming.tax ?? 0,
    remainingBalanceCents: Math.abs(proratedCredit),
    premiumAmountCents: premiumPrice.amountCents,
    billingInterval: premiumPrice.billingInterval,
    nextRenewalAt: periodEnd,
  });
}

async function handleConfirmUpgrade(
  service: SupabaseClient,
  stripe: Stripe,
  subscription: SubscriptionRow,
  prices: PlanPriceRow[],
  userId: string,
  userClient: SupabaseClient,
): Promise<Response> {
  const premiumPrice = resolvePremiumPrice(prices, subscription);
  if (!premiumPrice?.stripePriceId) {
    return json(
      { status: "price_unavailable", message: "Premium isn't available for your billing cycle yet." },
      409,
    );
  }

  const current = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId!);
  const item = currentPriceItem(current);
  if (!item) {
    return json({ status: "invalid_subscription", message: "No billable item found." }, 409);
  }

  if (item.price.id === premiumPrice.stripePriceId) {
    return json({ status: "ok", alreadyPremium: true, overview: await loadOverview(userClient) });
  }

  let updated: Stripe.Subscription;
  try {
    updated = await stripe.subscriptions.update(current.id, {
      items: [{ id: item.id, price: premiumPrice.stripePriceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
      cancel_at_period_end: false,
      metadata: { ...current.metadata, userId, tier: "premium" },
    });
  } catch (err) {
    // Payment failed: the user stays on Pro, unlocks nothing, gains no credit.
    console.error("premium upgrade payment failed", err);
    return json(
      {
        status: "payment_failed",
        message:
          "We couldn't complete your upgrade. Your Pro subscription is still active, " +
          "and you have not been charged. Please check your payment method and try again.",
      },
      402,
    );
  }

  // Upgrading permanently forfeits the Founding Member price.
  if (subscription.isFoundingMember) {
    const { error } = await service.rpc("billing_forfeit_founding_discount", {
      p_user_id: userId,
    });
    if (error) throw new Error(error.message);
  }

  const { periodStart, periodEnd } = subscriptionBillingPeriod(updated);

  const { error: syncError } = await service.rpc("billing_sync_stripe_subscription", {
    p_user_id: userId,
    p_plan_tier: "premium",
    p_status: "active",
    p_billing_interval: premiumPrice.billingInterval,
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_cancel_at_period_end: updated.cancel_at_period_end === true,
    p_stripe_customer_id: updated.customer as string,
    p_stripe_subscription_id: updated.id,
    p_stripe_price_id: premiumPrice.stripePriceId,
  });
  if (syncError) throw new Error(syncError.message);

  if (subscription.cancelAtPeriodEnd) {
    const { error: resumeError } = await service.rpc("billing_set_cancel_at_period_end", {
      p_user_id: userId,
      p_cancel: false,
    });
    if (resumeError) throw new Error(resumeError.message);
  }

  // Prefer grant-on-sync so the UI sees a credit without waiting for webhook
  // lag; the ledger key on invoice id still prevents double-grants.
  try {
    await grantPremiumCreditFromLatestPaidInvoice(service, stripe, userId, updated.id);
  } catch (err) {
    console.error("premium upgrade credit grant failed", err);
  }

  return json({
    status: "ok",
    nextRenewalAt: periodEnd,
    overview: await loadOverview(userClient),
  });
}
