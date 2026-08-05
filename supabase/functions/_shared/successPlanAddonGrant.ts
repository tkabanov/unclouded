/**
 * Grant Success Plan add-on entitlement from a completed one-time Checkout.
 * Used by checkout.session.completed webhooks and by subscription sync when
 * webhooks are missing / lag (same pattern as Premium credit sync).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

export async function grantSuccessPlanAddonFromCheckout(
  service: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (session.mode !== "payment") return false;
  if (session.metadata?.product !== "success_plan_addon") return false;
  if (session.payment_status && session.payment_status !== "paid") return false;

  const userId =
    session.metadata?.userId?.trim() ||
    (typeof session.client_reference_id === "string"
      ? session.client_reference_id.trim()
      : "");

  if (!userId) {
    throw new Error("Success Plan checkout missing userId metadata");
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { data: existing } = await service
    .from("successPlanAddon")
    .select("id")
    .eq("stripeCheckoutSessionId", session.id)
    .maybeSingle();

  if (existing?.id) return true;

  const { data: active } = await service
    .from("successPlanAddon")
    .select("id")
    .eq("userId", userId)
    .eq("status", "active")
    .maybeSingle();

  if (active?.id) return true;

  const { error } = await service.from("successPlanAddon").insert({
    userId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    status: "active",
    purchasedAt: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") return true;
    throw new Error(`Couldn't grant Success Plan add-on: ${error.message}`);
  }

  return true;
}

/**
 * After Checkout redirect, grant against the latest paid Success Plan session
 * for this Stripe customer when the webhook never reached the project.
 */
export async function grantSuccessPlanAddonFromLatestPaidCheckout(
  service: SupabaseClient,
  stripe: Stripe,
  userId: string,
  stripeCustomerId: string,
): Promise<boolean> {
  const sessions = await stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    limit: 20,
  });

  for (const session of sessions.data) {
    if (session.mode !== "payment") continue;
    if (session.metadata?.product !== "success_plan_addon") continue;
    if (session.payment_status !== "paid") continue;

    const sessionUserId =
      session.metadata?.userId?.trim() ||
      (typeof session.client_reference_id === "string"
        ? session.client_reference_id.trim()
        : "");
    if (sessionUserId && sessionUserId !== userId) continue;

    if (await grantSuccessPlanAddonFromCheckout(service, session)) {
      return true;
    }
  }

  return false;
}
