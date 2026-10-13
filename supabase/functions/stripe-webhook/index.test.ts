/**
 * NCLDD-56 test plan §2.2 A1 / A2 — `stripe-webhook` handler with mocked Supabase + Stripe.
 *
 * The function registers its handler via `Deno.serve` at import time, so the test stubs a
 * `Deno` global that captures the handler, then drives it with signed-looking requests.
 * `_shared/referralPayments.ts` and `_shared/premiumCreditGrant.ts` run for real; only the
 * Supabase service client and the Stripe client are faked.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type RpcCall = { name: string; args: Record<string, unknown> };
type Handler = (req: Request) => Promise<Response>;

const fakes = vi.hoisted(() => {
  /** In-memory stand-in for the service-role Supabase client (only what the webhook uses). */
  function createService() {
    const webhookEvents = new Set<string>();
    const rpcCalls: RpcCall[] = [];
    // Mirrors the SQL idempotency keys: payment row per invoice id, credit per (user, invoice).
    const referralPayments = new Map<string, Record<string, unknown>>();
    const creditGrants = new Set<string>();

    const client = {
      from(table: string) {
        return {
          insert(row: { id: string }) {
            if (table !== "stripeWebhookEvent") throw new Error(`unexpected insert into ${table}`);
            if (webhookEvents.has(row.id)) {
              return Promise.resolve({ error: { code: "23505", message: "duplicate key" } });
            }
            webhookEvents.add(row.id);
            return Promise.resolve({ error: null });
          },
          select() {
            return {
              eq(_column: string, value: string) {
                return {
                  maybeSingle: () =>
                    Promise.resolve({
                      data: table === "userSubscription" && value === "cus_1" ? { userId: "user_1" } : null,
                      error: null,
                    }),
                };
              },
            };
          },
          delete() {
            return {
              eq(_column: string, value: string) {
                if (table === "stripeWebhookEvent") webhookEvents.delete(value);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
      rpc(name: string, args: Record<string, unknown>) {
        rpcCalls.push({ name, args });
        if (name === "referral_record_invoice_payment") {
          const invoiceId = args.p_invoice_id as string;
          const duplicate = referralPayments.has(invoiceId);
          if (!duplicate) referralPayments.set(invoiceId, args);
          return Promise.resolve({ data: { recorded: !duplicate }, error: null });
        }
        if (name === "billing_grant_premium_credit") {
          const key = `${args.p_user_id}:${args.p_stripe_invoice_id}`;
          const duplicate = creditGrants.has(key);
          creditGrants.add(key);
          return Promise.resolve({ data: { granted: !duplicate }, error: null });
        }
        return Promise.resolve({ data: { ok: true }, error: null });
      },
    };

    return { client, webhookEvents, rpcCalls, referralPayments, creditGrants };
  }

  function createStripe() {
    return {
      webhooks: {
        constructEventAsync: vi.fn(async (payload: string) => JSON.parse(payload)),
      },
      subscriptions: {
        retrieve: vi.fn(async (id: string) => ({ id, customer: "cus_1", metadata: { userId: "user_1" } })),
        update: vi.fn(),
      },
      charges: { retrieve: vi.fn() },
      disputes: { list: vi.fn(async () => ({ data: [] })) },
    };
  }

  return {
    service: createService(),
    stripe: createStripe(),
    createService,
    createStripe,
  };
});

vi.mock("../_shared/stripeBilling.ts", () => ({
  describeStripePrice: (prices: Array<{ stripePriceId: string; tierSlug: string }>, priceId: string) => {
    const match = prices.find((price) => price.stripePriceId === priceId);
    return match ? { tier: match.tierSlug, interval: "month", isFoundingRate: false } : null;
  },
  getServiceClient: () => fakes.service.client,
  getStripe: () => fakes.stripe,
  json: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  loadPlanPrices: async () => [
    { stripePriceId: "price_pro_month", tierSlug: "pro", billingInterval: "month", isFoundingRate: false },
  ],
  requireEnv: (name: string) => `test-${name}`,
}));
vi.mock("../_shared/stripeSubscriptionSync.ts", () => ({
  syncStripeSubscriptionForUser: vi.fn(async () => undefined),
}));
vi.mock("../_shared/stripeSubscriptionReconcile.ts", () => ({
  listBillableStripeSubscriptions: vi.fn(),
  reconcileDuplicateStripeSubscriptions: vi.fn(async () => undefined),
}));
vi.mock("../_shared/successPlanAddonGrant.ts", () => ({
  grantSuccessPlanAddonFromCheckout: vi.fn(),
}));

let handler: Handler;

beforeAll(async () => {
  vi.stubGlobal("Deno", {
    serve: (fn: Handler) => {
      handler = fn;
    },
    env: { get: () => undefined },
  });
  await import("./index.ts");
});

beforeEach(() => {
  fakes.service = fakes.createService();
  fakes.stripe = fakes.createStripe();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function deliver(event: Record<string, unknown>): Promise<Response> {
  return handler(
    new Request("https://example.supabase.co/functions/v1/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=test" },
      body: JSON.stringify(event),
    }),
  );
}

function invoicePaidEvent(eventId: string) {
  return {
    id: eventId,
    type: "invoice.paid",
    data: {
      object: {
        id: "in_1",
        object: "invoice",
        customer: "cus_1",
        subscription: "sub_1",
        charge: "ch_1",
        amount_paid: 2900,
        currency: "usd",
        billing_reason: "subscription_create",
        status_transitions: { paid_at: 1_760_000_000 },
        subscription_details: { metadata: { userId: "user_1" } },
        lines: { data: [{ amount: 2900, price: { id: "price_pro_month" } }] },
      },
    },
  };
}

/** Charge as Stripe returns it now (the source of truth for reversals). */
function liveCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: "ch_1",
    object: "charge",
    invoice: "in_1",
    amount: 2900,
    amount_refunded: 0,
    disputed: false,
    ...overrides,
  };
}

const rpcNamed = (name: string) => fakes.service.rpcCalls.filter((call) => call.name === name);

describe("stripe-webhook — A1: duplicate invoice.paid", () => {
  it("replayed event id is rejected before any side effect", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge());

    const first = await deliver(invoicePaidEvent("evt_paid_1"));
    const second = await deliver(invoicePaidEvent("evt_paid_1"));

    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ received: true, duplicate: true });

    expect(rpcNamed("referral_record_invoice_payment")).toHaveLength(1);
    expect(rpcNamed("billing_grant_premium_credit")).toHaveLength(1);
    expect(rpcNamed("referral_record_payment_reversal")).toHaveLength(0);
    expect(fakes.service.referralPayments.size).toBe(1);
    expect(fakes.stripe.subscriptions.retrieve).toHaveBeenCalledTimes(1);
  });

  it("a second delivery under a new event id reuses the same invoice key, so SQL dedupes it", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge());

    await deliver(invoicePaidEvent("evt_paid_1"));
    await deliver(invoicePaidEvent("evt_paid_2"));

    const payments = rpcNamed("referral_record_invoice_payment");
    expect(payments).toHaveLength(2);
    expect(payments[1].args).toEqual(payments[0].args);
    expect(payments[0].args).toMatchObject({
      p_invoice_id: "in_1",
      p_user_id: "user_1",
      p_subscription_id: "sub_1",
      p_charge_id: "ch_1",
      p_amount_cents: 2900,
      p_currency: "usd",
      p_tier: "pro",
      p_billing_reason: "subscription_create",
    });

    const credits = rpcNamed("billing_grant_premium_credit");
    expect(credits.map((call) => call.args.p_stripe_invoice_id)).toEqual(["in_1", "in_1"]);

    // One payment row and one credit grant survive the double delivery.
    expect(fakes.service.referralPayments.size).toBe(1);
    expect(fakes.service.creditGrants.size).toBe(1);
  });

  it("a failed run releases the event id so Stripe's retry is processed", async () => {
    fakes.stripe.charges.retrieve.mockRejectedValueOnce(new Error("stripe down"));
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge());

    const failed = await deliver(invoicePaidEvent("evt_paid_1"));
    expect(failed.status).toBe(500);
    expect(fakes.service.webhookEvents.has("evt_paid_1")).toBe(false);

    const retried = await deliver(invoicePaidEvent("evt_paid_1"));
    expect(retried.status).toBe(200);
    expect(await retried.json()).toEqual({ received: true });
    expect(fakes.service.referralPayments.size).toBe(1);
  });

  it("invoice.paid retried after a refund applies the refund from the live charge", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ amount_refunded: 2900 }));

    await deliver(invoicePaidEvent("evt_paid_1"));

    expect(fakes.stripe.charges.retrieve).toHaveBeenCalledWith("ch_1");
    expect(rpcNamed("referral_record_payment_reversal").map((call) => call.args)).toEqual([
      { p_invoice_id: "in_1", p_charge_id: "ch_1", p_refunded_cents: 2900, p_disputed_cents: 0 },
    ]);
  });
});

describe("stripe-webhook — A2: refunds and disputes", () => {
  it("charge.refunded applies the re-fetched refund amount, not the event snapshot", async () => {
    // Snapshot says a partial refund; Stripe now reports the charge fully refunded.
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ amount_refunded: 2900, refunded: true }));

    const res = await deliver({
      id: "evt_refund_1",
      type: "charge.refunded",
      data: { object: liveCharge({ amount_refunded: 1000, invoice: "in_stale" }) },
    });

    expect(res.status).toBe(200);
    expect(fakes.stripe.charges.retrieve).toHaveBeenCalledWith("ch_1");
    expect(fakes.stripe.disputes.list).toHaveBeenCalledWith({ charge: "ch_1", limit: 100 });
    expect(rpcNamed("referral_record_payment_reversal").map((call) => call.args)).toEqual([
      { p_invoice_id: "in_1", p_charge_id: "ch_1", p_refunded_cents: 2900, p_disputed_cents: 0 },
    ]);
  });

  it("charge.dispute.created holds the disputed amount, resolving the charge from the dispute", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ disputed: true }));
    fakes.stripe.disputes.list.mockResolvedValue({
      data: [{ id: "dp_1", object: "dispute", charge: "ch_1", status: "needs_response", amount: 2900 }],
    });

    const res = await deliver({
      id: "evt_dispute_created",
      type: "charge.dispute.created",
      data: {
        object: { id: "dp_1", object: "dispute", charge: "ch_1", status: "warning_needs_response", amount: 1 },
      },
    });

    expect(res.status).toBe(200);
    expect(fakes.stripe.charges.retrieve).toHaveBeenCalledWith("ch_1");
    expect(rpcNamed("referral_record_payment_reversal").map((call) => call.args)).toEqual([
      { p_invoice_id: "in_1", p_charge_id: "ch_1", p_refunded_cents: 0, p_disputed_cents: 2900 },
    ]);
  });

  it("charge.dispute.closed (won) restores the reward: disputed amount goes back to zero", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ disputed: true }));
    fakes.stripe.disputes.list.mockResolvedValue({
      data: [{ id: "dp_1", object: "dispute", charge: "ch_1", status: "won", amount: 2900 }],
    });

    const res = await deliver({
      id: "evt_dispute_closed",
      type: "charge.dispute.closed",
      // Out-of-order snapshot still says under review; the live dispute is won.
      data: { object: { id: "dp_1", object: "dispute", charge: { id: "ch_1" }, status: "under_review", amount: 2900 } },
    });

    expect(res.status).toBe(200);
    expect(fakes.stripe.charges.retrieve).toHaveBeenCalledWith("ch_1");
    expect(rpcNamed("referral_record_payment_reversal").map((call) => call.args)).toEqual([
      { p_invoice_id: "in_1", p_charge_id: "ch_1", p_refunded_cents: 0, p_disputed_cents: 0 },
    ]);
  });

  it("charge.dispute.closed (lost) keeps the disputed amount held", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ disputed: true }));
    fakes.stripe.disputes.list.mockResolvedValue({
      data: [{ id: "dp_1", object: "dispute", charge: "ch_1", status: "lost", amount: 2900 }],
    });

    await deliver({
      id: "evt_dispute_lost",
      type: "charge.dispute.closed",
      data: { object: { id: "dp_1", object: "dispute", charge: "ch_1", status: "lost", amount: 2900 } },
    });

    expect(rpcNamed("referral_record_payment_reversal")[0].args).toMatchObject({ p_disputed_cents: 2900 });
  });

  it("replayed refund event is ignored", async () => {
    fakes.stripe.charges.retrieve.mockResolvedValue(liveCharge({ amount_refunded: 2900 }));
    const event = { id: "evt_refund_1", type: "charge.refunded", data: { object: liveCharge() } };

    await deliver(event);
    const second = await deliver(event);

    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(fakes.stripe.charges.retrieve).toHaveBeenCalledTimes(1);
    expect(rpcNamed("referral_record_payment_reversal")).toHaveLength(1);
  });
});
