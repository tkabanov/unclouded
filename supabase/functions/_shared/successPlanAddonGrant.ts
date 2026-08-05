/**
 * Grant Success Plan add-on entitlement from a completed one-time Checkout.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

export async function grantSuccessPlanAddonFromCheckout(
  service: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  if (session.mode !== "payment") return false;
  if (session.metadata?.product !== "success_plan_addon") return false;

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
