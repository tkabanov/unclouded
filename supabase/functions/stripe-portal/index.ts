/**
 * Stripe Customer Portal — "Update Payment Method" and invoice history.
 *
 * POST /functions/v1/stripe-portal
 * Returns: { "url": "https://billing.stripe.com/..." }
 */
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  corsHeaders,
  ensureStripeCustomer,
  getServiceClient,
  getStripe,
  json,
  loadBillingProfile,
  loadSubscriptionRow,
  resolveRequestAppOrigin,
} from "../_shared/stripeBilling.ts";

type PortalBody = {
  /** Browser origin for portal return_url (validated allowlist). */
  returnOrigin?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: PortalBody = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as PortalBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const service = getServiceClient();
    const profile = await loadBillingProfile(service, auth.user.id);
    if (!profile) return json({ error: "Profile not found" }, 404);

    const subscription = await loadSubscriptionRow(service, auth.user.id);

    if (!subscription?.stripeCustomerId) {
      return json(
        {
          status: "no_billing_account",
          message: "You don't have a billing account yet. Choose a plan to get started.",
        },
        409,
      );
    }

    // Replaces stale customer IDs left over from a Stripe account / key swap.
    const customerId = await ensureStripeCustomer(
      service,
      profile,
      subscription.stripeCustomerId,
    );

    const origin = resolveRequestAppOrigin(req, body.returnOrigin);
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      // `billing=portal` lets SettingsSubscriptionTab sync + show recovery copy.
      return_url: `${origin}/subscription?billing=portal`,
    });

    return json({ status: "ok", url: session.url });
  } catch (err) {
    console.error("stripe-portal failed", err);
    return json({ error: "We couldn't open your billing portal. Please try again." }, 500);
  }
});
