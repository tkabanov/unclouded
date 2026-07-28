/**
 * Stripe Customer Portal — "Update Payment Method" and invoice history.
 *
 * POST /functions/v1/stripe-portal
 * Returns: { "url": "https://billing.stripe.com/..." }
 */
import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  appOrigin,
  corsHeaders,
  getServiceClient,
  getStripe,
  json,
  loadSubscriptionRow,
} from "../_shared/stripeBilling.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  try {
    const service = getServiceClient();
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

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appOrigin()}/settings?tab=subscription`,
    });

    return json({ status: "ok", url: session.url });
  } catch (err) {
    console.error("stripe-portal failed", err);
    return json({ error: "We couldn't open your billing portal. Please try again." }, 500);
  }
});
