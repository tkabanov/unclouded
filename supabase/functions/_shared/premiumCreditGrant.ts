/**
 * Premium coaching credit grants (CL-1 / OVR-059).
 * Signup: +2 once. Monthly +1 is calendar-based (billing_run_monthly_premium_credit_accrual).
 * Invoice-paid no longer grants +1 per cycle.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

/** Ensure Premium signup grant (+2 once, capped at 6). Idempotent. */
export async function ensurePremiumSignupCredits(
  service: SupabaseClient,
  userId: string,
): Promise<unknown> {
  const { data, error } = await service.rpc("billing_ensure_premium_signup_credits", {
    p_user_id: userId,
  });
  if (error) throw new Error(`billing_ensure_premium_signup_credits: ${error.message}`);
  return data;
}

/**
 * After Premium sync / invoice.paid: ensure signup credits only.
 * Kept name for call-site compatibility; no longer grants +1 per invoice.
 */
export async function grantPremiumCreditForInvoice(
  service: SupabaseClient,
  userId: string,
  invoiceId: string,
  note = "Premium sign-up credit grant",
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
 * After the user is Premium in our DB, ensure signup +2 against latest paid invoice id
 * for logging/compat. Safe if already granted.
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
  if (!invoice?.id) {
    return ensurePremiumSignupCredits(service, userId);
  }

  return grantPremiumCreditForInvoice(service, userId, invoice.id);
}

/** Run calendar-month +1 accrual (no-ops unless UTC day is 1st). */
export async function runMonthlyPremiumCreditAccrual(
  service: SupabaseClient,
): Promise<unknown> {
  const { data, error } = await service.rpc("billing_run_monthly_premium_credit_accrual", {
    p_as_of: new Date().toISOString(),
  });
  if (error) throw new Error(`billing_run_monthly_premium_credit_accrual: ${error.message}`);
  return data;
}

/** Reset groupSessionsUsedThisMonth on the 1st UTC (OVR-060 / G10). */
export async function runMonthlyGroupSessionsCounterReset(
  service: SupabaseClient,
): Promise<unknown> {
  const { data, error } = await service.rpc("reset_group_sessions_used_this_month", {
    p_as_of: new Date().toISOString(),
  });
  if (error) throw new Error(`reset_group_sessions_used_this_month: ${error.message}`);
  return data;
}
