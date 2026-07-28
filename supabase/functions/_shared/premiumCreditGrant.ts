/**
 * Grant a Premium credit for a paid Stripe invoice (idempotent via ledger).
 * Used by invoice.paid webhooks and by subscription sync when webhooks lag.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

export async function grantPremiumCreditForInvoice(
  service: SupabaseClient,
  userId: string,
  invoiceId: string,
  note = "Monthly Premium credit",
): Promise<unknown> {
  const { data, error } = await service.rpc("billing_grant_premium_credit", {
    p_user_id: userId,
    p_stripe_invoice_id: invoiceId,
    p_note: note,
  });
  if (error) throw new Error(`billing_grant_premium_credit: ${error.message}`);
  return data;
}

/**
 * After the user is Premium in our DB, grant against the latest paid invoice on
 * their Stripe subscription. Safe if the webhook already granted the same id.
 */
export async function grantPremiumCreditFromLatestPaidInvoice(
  service: SupabaseClient,
  stripe: Stripe,
  userId: string,
  stripeSubscriptionId: string,
): Promise<unknown | null> {
  const invoices = await stripe.invoices.list({
    subscription: stripeSubscriptionId,
    status: "paid",
    limit: 1,
  });
  const invoice = invoices.data[0];
  if (!invoice?.id) return null;

  return grantPremiumCreditForInvoice(service, userId, invoice.id);
}
