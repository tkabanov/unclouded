/**
 * NCLDD-56 — referral rewards from Stripe payments (OVR-074).
 *
 * Pure mapping from Stripe objects to the `referral_record_*` RPC payloads plus thin
 * RPC wrappers. Only type imports from Stripe so the mapping is unit-testable in vitest.
 * Idempotency lives in SQL: payment rows are keyed by invoice id, the B2C reward is unique per
 * referred user, and reversals are recomputed from the charge's current refund / dispute state.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type Stripe from "npm:stripe@17.7.0";

export type PaidTierSlug = "pro" | "premium";

export type InvoicePaymentPayload = {
  p_invoice_id: string;
  p_user_id: string;
  p_subscription_id: string | null;
  p_charge_id: string | null;
  p_amount_cents: number;
  p_currency: string;
  p_tier: PaidTierSlug | null;
  p_billing_reason: string | null;
  p_paid_at: string;
};

export type PaymentReversalPayload = {
  p_invoice_id: string | null;
  p_charge_id: string | null;
  p_refunded_cents: number | null;
  p_disputed_cents: number | null;
};

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function isoFromSeconds(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

/**
 * Tier of the invoice: the known plan price on the largest positive line. Upgrade proration
 * invoices carry a negative line for the old plan and a positive one for the new plan.
 */
export function invoiceTier(
  invoice: Stripe.Invoice,
  tierForPriceId: (priceId: string) => PaidTierSlug | null,
): PaidTierSlug | null {
  let best: { tier: PaidTierSlug; amount: number } | null = null;
  for (const line of invoice.lines?.data ?? []) {
    const priceId = idOf(line.price as Stripe.Price | string | null | undefined);
    if (!priceId || line.amount <= 0) continue;
    const tier = tierForPriceId(priceId);
    if (!tier) continue;
    if (!best || line.amount > best.amount) best = { tier, amount: line.amount };
  }
  return best?.tier ?? null;
}

/** Subscription invoices only; one-time add-on payments are not part of the program. */
export function buildInvoicePaymentPayload(
  invoice: Stripe.Invoice,
  userId: string,
  tierForPriceId: (priceId: string) => PaidTierSlug | null,
  fallbackPaidAt: Date = new Date(),
): InvoicePaymentPayload | null {
  const subscriptionId = idOf(invoice.subscription);
  if (!invoice.id || !subscriptionId) return null;

  return {
    p_invoice_id: invoice.id,
    p_user_id: userId,
    p_subscription_id: subscriptionId,
    p_charge_id: idOf(invoice.charge),
    p_amount_cents: Math.max(0, invoice.amount_paid ?? 0),
    p_currency: (invoice.currency ?? "usd").toLowerCase(),
    p_tier: invoiceTier(invoice, tierForPriceId),
    p_billing_reason: invoice.billing_reason ?? null,
    p_paid_at:
      isoFromSeconds(invoice.status_transitions?.paid_at) ?? fallbackPaidAt.toISOString(),
  };
}

// Real chargebacks hold the money until they are won; inquiries (warning_*) move no funds.
const HELD_DISPUTE_STATUSES = new Set<string>(["needs_response", "under_review", "lost"]);

/**
 * Current state of a charge. Built from a freshly retrieved charge + its disputes rather than
 * from the event payload, because Stripe events arrive out of order and get retried.
 */
export function buildChargeStatePayload(
  charge: Stripe.Charge,
  disputes: Stripe.Dispute[],
  invoiceIdHint: string | null = null,
): PaymentReversalPayload {
  const disputed = disputes
    .filter((dispute) => HELD_DISPUTE_STATUSES.has(dispute.status))
    .reduce((sum, dispute) => sum + Math.max(0, dispute.amount ?? 0), 0);
  return {
    p_invoice_id: idOf(charge.invoice) ?? invoiceIdHint,
    p_charge_id: charge.id,
    p_refunded_cents: Math.max(0, charge.amount_refunded ?? 0),
    p_disputed_cents: disputed,
  };
}

/** Charge id carried by a `charge.*` / `charge.dispute.*` event object. */
export function chargeIdFromEventObject(object: Stripe.Charge | Stripe.Dispute): string | null {
  if (object.object === "dispute") return idOf((object as Stripe.Dispute).charge);
  return (object as Stripe.Charge).id ?? null;
}

/**
 * Re-read the charge from Stripe and apply its refund / dispute state. Idempotent.
 * `onlyWhenReversed` skips the write for the common case of an untouched charge.
 */
export async function syncReferralChargeState(
  service: SupabaseClient,
  stripe: Stripe,
  chargeId: string,
  options: { invoiceIdHint?: string | null; onlyWhenReversed?: boolean } = {},
): Promise<unknown | null> {
  const charge = await stripe.charges.retrieve(chargeId);
  const disputes = charge.disputed || !options.onlyWhenReversed
    ? (await stripe.disputes.list({ charge: chargeId, limit: 100 })).data
    : [];
  const payload = buildChargeStatePayload(charge, disputes, options.invoiceIdHint ?? null);
  if (options.onlyWhenReversed && !payload.p_refunded_cents && !payload.p_disputed_cents) {
    return null;
  }
  return recordReferralPaymentReversal(service, payload);
}

export async function recordReferralInvoicePayment(
  service: SupabaseClient,
  payload: InvoicePaymentPayload,
): Promise<unknown> {
  const { data, error } = await service.rpc("referral_record_invoice_payment", payload);
  if (error) throw new Error(`referral_record_invoice_payment: ${error.message}`);
  return data;
}

export async function recordReferralPaymentReversal(
  service: SupabaseClient,
  payload: PaymentReversalPayload,
): Promise<unknown> {
  const { data, error } = await service.rpc("referral_record_payment_reversal", payload);
  if (error) throw new Error(`referral_record_payment_reversal: ${error.message}`);
  return data;
}
