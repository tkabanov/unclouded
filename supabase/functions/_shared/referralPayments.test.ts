import { describe, expect, it } from "vitest";
import type Stripe from "npm:stripe@17.7.0";

import {
  buildChargeStatePayload,
  buildInvoicePaymentPayload,
  chargeIdFromEventObject,
  invoiceTier,
  type PaidTierSlug,
} from "./referralPayments.ts";

const PRICES: Record<string, PaidTierSlug> = {
  price_pro_month: "pro",
  price_premium_month: "premium",
};
const tierFor = (priceId: string) => PRICES[priceId] ?? null;

function invoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  return {
    id: "in_1",
    subscription: "sub_1",
    charge: "ch_1",
    amount_paid: 2900,
    currency: "USD",
    billing_reason: "subscription_create",
    status_transitions: { paid_at: 1_760_000_000 },
    lines: { data: [{ amount: 2900, price: { id: "price_pro_month" } }] },
    ...overrides,
  } as unknown as Stripe.Invoice;
}

describe("invoiceTier", () => {
  it("picks the largest positive known line on an upgrade proration invoice", () => {
    const inv = invoice({
      lines: {
        data: [
          { amount: -1500, price: { id: "price_pro_month" } },
          { amount: 4000, price: { id: "price_premium_month" } },
        ],
      } as unknown as Stripe.Invoice["lines"],
    });
    expect(invoiceTier(inv, tierFor)).toBe("premium");
  });

  it("returns null when no line maps to a plan price", () => {
    const inv = invoice({
      lines: { data: [{ amount: 9700, price: { id: "price_addon" } }] } as unknown as Stripe.Invoice["lines"],
    });
    expect(invoiceTier(inv, tierFor)).toBeNull();
  });
});

describe("buildInvoicePaymentPayload", () => {
  it("maps a paid subscription invoice", () => {
    expect(buildInvoicePaymentPayload(invoice(), "user-1", tierFor)).toEqual({
      p_invoice_id: "in_1",
      p_user_id: "user-1",
      p_subscription_id: "sub_1",
      p_charge_id: "ch_1",
      p_amount_cents: 2900,
      p_currency: "usd",
      p_tier: "pro",
      p_billing_reason: "subscription_create",
      p_paid_at: new Date(1_760_000_000 * 1000).toISOString(),
    });
  });

  it("keeps $0 invoices (trials) so SQL can record but not reward them", () => {
    const payload = buildInvoicePaymentPayload(invoice({ amount_paid: 0 }), "user-1", tierFor);
    expect(payload?.p_amount_cents).toBe(0);
  });

  it("skips invoices without a subscription", () => {
    expect(buildInvoicePaymentPayload(invoice({ subscription: null }), "user-1", tierFor)).toBeNull();
  });

  it("falls back to the provided time when Stripe has no paid_at", () => {
    const at = new Date("2026-10-13T10:00:00Z");
    const payload = buildInvoicePaymentPayload(
      invoice({ status_transitions: {} as Stripe.Invoice["status_transitions"] }),
      "user-1",
      tierFor,
      at,
    );
    expect(payload?.p_paid_at).toBe(at.toISOString());
  });
});

describe("charge state payload", () => {
  const charge = (overrides: Partial<Stripe.Charge> = {}) =>
    ({ id: "ch_1", object: "charge", invoice: "in_1", amount_refunded: 0, ...overrides }) as unknown as Stripe.Charge;
  const dispute = (status: string, amount = 2900) =>
    ({ object: "dispute", charge: "ch_1", amount, status }) as unknown as Stripe.Dispute;

  it("passes the current cumulative refunded amount", () => {
    expect(buildChargeStatePayload(charge({ amount_refunded: 1000 }), [])).toEqual({
      p_invoice_id: "in_1",
      p_charge_id: "ch_1",
      p_refunded_cents: 1000,
      p_disputed_cents: 0,
    });
  });

  it("holds open and lost chargebacks, releases won ones and ignores inquiries", () => {
    const disputes = [
      dispute("needs_response", 1000),
      dispute("lost", 500),
      dispute("won", 2900),
      dispute("warning_needs_response", 2900),
    ];
    expect(buildChargeStatePayload(charge(), disputes).p_disputed_cents).toBe(1500);
  });

  it("falls back to the invoice hint when the charge has no invoice", () => {
    expect(buildChargeStatePayload(charge({ invoice: null }), [], "in_hint").p_invoice_id).toBe("in_hint");
  });

  it("reads the charge id from charge and dispute event objects", () => {
    expect(chargeIdFromEventObject(charge())).toBe("ch_1");
    expect(chargeIdFromEventObject(dispute("won"))).toBe("ch_1");
    expect(
      chargeIdFromEventObject({ object: "dispute", charge: { id: "ch_2" } } as unknown as Stripe.Dispute),
    ).toBe("ch_2");
  });
});
