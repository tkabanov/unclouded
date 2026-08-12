/**
 * Free → Pro / Free → Premium checkout, or Success Plan one-time add-on.
 *
 * POST /functions/v1/stripe-checkout
 * Body (subscription): { "tier": "pro" | "premium", "interval": "month" | "year" }
 * Body (add-on): { "product": "success_plan_addon" }
 * Returns: { "url": "https://checkout.stripe.com/..." }
 *
 * A user who already has a paid subscription must use `stripe-subscription`
 * (upgrade / downgrade / resume) instead — this endpoint only starts new ones
 * for subscription mode. Success Plan add-on uses mode: payment.
 */
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  corsHeaders,
  ensureStripeCustomer,
  getServiceClient,
  getStripe,
  json,
  loadBillingProfile,
  loadPlanPrices,
  loadSubscriptionRow,
  resolveRequestAppOrigin,
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
  product?: string;
  /** Browser origin for success/cancel URLs (validated allowlist). */
  returnOrigin?: string;
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

  if (body.product === "success_plan_addon") {
    try {
      const service = getServiceClient();
      const profile = await loadBillingProfile(service, auth.user.id);
      if (!profile) return json({ error: "Profile not found" }, 404);

      if (profile.accountType === "enterprise") {
        return json(
          {
            status: "enterprise_covered",
            message:
              "Success Plans for workplace members are assigned by your HR admin.",
          },
          409,
        );
      }

      const subscription = await loadSubscriptionRow(service, auth.user.id);
      const effectiveTier = subscription
        ? resolveEffectiveTier(subscription)
        : "free";

      if (effectiveTier !== "pro" && effectiveTier !== "premium") {
        return json(
          {
            status: "pro_required",
            message:
              "Upgrade to Pro or Premium before purchasing the Success Plan add-on.",
          },
          409,
        );
      }

      const { data: existingAddon } = await service
        .from("successPlanAddon")
        .select("id")
        .eq("userId", auth.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingAddon?.id) {
        return json(
          {
            status: "already_purchased",
            message: "You already have the Success Plan add-on.",
          },
          409,
        );
      }

      const { data: priceRow, error: priceError } = await service
        .from("successPlanAddonPrice")
        .select("stripePriceId, amountCents, isActive")
        .eq("lookupKey", "unclouded_success_plan_addon")
        .maybeSingle();

      if (priceError) {
        console.error("successPlanAddonPrice load failed", priceError);
        return json({ error: "Couldn't load Success Plan pricing." }, 500);
      }

      if (!priceRow?.isActive || !priceRow.stripePriceId) {
        return json(
          {
            status: "price_unavailable",
            message: "Success Plan add-on checkout isn't available yet.",
          },
          409,
        );
      }

      const customerId = await ensureStripeCustomer(
        service,
        profile,
        subscription?.stripeCustomerId ?? null,
      );

      const stripe = getStripe();
      const origin = resolveRequestAppOrigin(req, body.returnOrigin);
      const returnBase = `${origin}/subscription`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: priceRow.stripePriceId, quantity: 1 }],
        client_reference_id: profile.id,
        metadata: {
          userId: profile.id,
          product: "success_plan_addon",
        },
        success_url: `${returnBase}&checkout=success&addon=success_plan`,
        cancel_url: `${returnBase}&checkout=cancelled&addon=success_plan`,
        allow_promotion_codes: false,
      });

      if (!session.url) {
        return json({ error: "Stripe did not return a checkout URL." }, 502);
      }

      return json({
        status: "ok",
        url: session.url,
        product: "success_plan_addon",
        amountCents: priceRow.amountCents,
      });
    } catch (err) {
      console.error("stripe-checkout success_plan_addon failed", err);
      return json(
        { error: "We couldn't start Success Plan checkout. Please try again." },
        500,
      );
    }
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
        foundingDiscountForfeitedAt: subscription?.foundingDiscountForfeitedAt ?? null,
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

    const origin = resolveRequestAppOrigin(req, body.returnOrigin);
    const returnBase = `${origin}/subscription`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price.stripePriceId, quantity: 1 }],
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
