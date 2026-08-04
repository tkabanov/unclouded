/**
 * Free → Pro / Free → Premium checkout.
 *
 * POST /functions/v1/stripe-checkout
 * Body: { "tier": "pro" | "premium", "interval": "month" | "year" }
 * Returns: { "url": "https://checkout.stripe.com/..." }
 *
 * A user who already has a paid subscription must use `stripe-subscription`
 * (upgrade / downgrade / resume) instead — this endpoint only starts new ones.
 */
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  appOrigin,
  corsHeaders,
  ensureStripeCustomer,
  getServiceClient,
  getStripe,
  json,
  loadBillingProfile,
  loadPlanPrices,
  loadSubscriptionRow,
  selectPlanPrice,
} from "../_shared/stripeBilling.ts";
import {
  listBillableStripeSubscriptions,
  reconcileDuplicateStripeSubscriptions,
} from "../_shared/stripeSubscriptionReconcile.ts";
import { syncStripeSubscriptionForUser } from "../_shared/stripeSubscriptionSync.ts";
import {
  FOUNDING_SIGNUP_PLAN,
  isFoundingEligible,
} from "../_shared/foundingMember.ts";
import {
  normalizeStatus,
  resolveEffectiveTier,
  type BillingInterval,
  type PaidTier,
} from "../_shared/subscriptionLifecycle.ts";

type CheckoutBody = {
  tier?: string;
  interval?: string;
};

function parseTier(value: string | undefined): PaidTier | null {
  return value === "pro" || value === "premium" ? value : null;
}

function parseInterval(value: string | undefined): BillingInterval | null {
  if (!value) return "month";
  return value === "month" || value === "year" ? value : null;
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

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const tier = parseTier(body.tier);
  const interval = parseInterval(body.interval);
  if (!tier) return json({ error: "tier must be 'pro' or 'premium'" }, 400);
  if (!interval) return json({ error: "interval must be 'month' or 'year'" }, 400);

  const service = getServiceClient();

  try {
    const profile = await loadBillingProfile(service, auth.user.id);
    if (!profile) return json({ error: "Profile not found" }, 404);

    if (profile.accountType === "enterprise") {
      return json(
        {
          status: "enterprise_covered",
          message: "Your organization covers this subscription.",
        },
        409,
      );
    }

    const subscription = await loadSubscriptionRow(service, auth.user.id);
    const effectiveTier = subscription
      ? resolveEffectiveTier(subscription)
      : "free";

    // An existing paid subscription changes plan through Stripe, not a new one.
    if (subscription?.stripeSubscriptionId && effectiveTier !== "free") {
      const { data: overview } = await auth.supabase.rpc("get_my_subscription_overview");
      return json(
        {
          status: "already_subscribed",
          message: "You already have an active subscription. Change your plan instead.",
          overview: overview ?? null,
        },
        409,
      );
    }

    const prices = await loadPlanPrices(service);
    const wantsFoundingRate =
      tier === "pro" &&
      isFoundingEligible({
        signupPlan: profile.signupPlan,
        isFoundingMember: subscription?.isFoundingMember ?? false,
      });

    const price = selectPlanPrice(prices, tier, interval, wantsFoundingRate);
    if (!price?.stripePriceId) {
      return json(
        {
          status: "price_unavailable",
          message:
            interval === "year"
              ? "Yearly pricing isn't available yet. Choose monthly billing to continue."
              : "This plan isn't available for checkout yet.",
        },
        409,
      );
    }

    if (wantsFoundingRate) {
      const { data: slotsRemaining, error: slotsError } = await service.rpc(
        "founding_member_slots_remaining",
      );
      if (slotsError) {
        console.error("founding_member_slots_remaining failed", slotsError);
      } else if (typeof slotsRemaining === "number" && slotsRemaining <= 0) {
        return json(
          {
            status: "founding_full",
            message:
              "The Founding Member offer is full. Choose standard Pro at $29/month to continue.",
          },
          409,
        );
      }
    }

    const customerId = await ensureStripeCustomer(
      service,
      profile,
      subscription?.stripeCustomerId ?? null,
    );

    const stripe = getStripe();
    const billable = await listBillableStripeSubscriptions(stripe, customerId);
    if (billable.length > 0) {
      const { keptSubscriptionId } = await reconcileDuplicateStripeSubscriptions(
        stripe,
        customerId,
        subscription?.stripeSubscriptionId ?? null,
      );
      const kept =
        billable.find((sub) => sub.id === keptSubscriptionId) ??
        (await stripe.subscriptions.retrieve(keptSubscriptionId ?? billable[0].id));

      await syncStripeSubscriptionForUser(service, prices, auth.user.id, kept);

      const { data: overview } = await auth.supabase.rpc("get_my_subscription_overview");

      return json(
        {
          status: "already_subscribed",
          message:
            "You already have an active subscription. Change your plan on this page instead of starting a new checkout.",
          overview: overview ?? null,
        },
        409,
      );
    }

    const returnBase = `${appOrigin()}/settings?tab=subscription`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.stripePriceId, quantity: 1 }],
      // Guards against a double-submit creating two subscriptions for the
      // same plan choice within the same billing period.
      subscription_data: {
        metadata: {
          userId: profile.id,
          tier,
          interval,
          foundingRate: String(price.isFoundingRate),
        },
      },
      client_reference_id: profile.id,
      metadata: {
        userId: profile.id,
        tier,
        interval,
        foundingRate: String(price.isFoundingRate),
        signupPlan: profile.signupPlan ?? "",
      },
      success_url: `${returnBase}&checkout=success&plan=${tier}`,
      cancel_url: `${returnBase}&checkout=cancelled`,
      allow_promotion_codes: false,
    });

    if (!session.url) {
      return json({ error: "Stripe did not return a checkout URL." }, 502);
    }

    return json({
      status: "ok",
      url: session.url,
      tier,
      interval,
      isFoundingRate: price.isFoundingRate,
      previousStatus: normalizeStatus(subscription?.status),
      signupPlan: profile.signupPlan === FOUNDING_SIGNUP_PLAN ? FOUNDING_SIGNUP_PLAN : null,
    });
  } catch (err) {
    console.error("stripe-checkout failed", err);
    return json(
      { error: "We couldn't start checkout. Please try again." },
      500,
    );
  }
});
