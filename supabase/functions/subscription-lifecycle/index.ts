/**
 * Daily subscription lifecycle sweep.
 *
 * Invoke with the service role (pg_cron does this via
 * `invoke_scheduled_edge_function`):
 *   POST /functions/v1/subscription-lifecycle
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   Optional: x-cron-secret: <SUBSCRIPTION_LIFECYCLE_CRON_SECRET>
 *
 * Stripe owns the charges; this owns the state transitions that only become true
 * with the passage of time: scheduled cancellations and downgrades taking
 * effect, exhausted grace periods, the Founding Member discount ending after 12
 * months, credit holds for sessions that never happened, and the related emails.
 *
 * Every transition is applied through a service-role RPC and is idempotent, so a
 * re-run — or a second scheduler — cannot double-apply anything.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import {
  canonicalAppOrigin,
  getServiceClient,
  getStripe,
  json,
  loadPlanPrices,
  loadSubscriptionRow,
  selectPlanPrice,
  type PlanPriceRow,
} from "../_shared/stripeBilling.ts";
import type { BillingInterval } from "../_shared/subscriptionLifecycle.ts";

const FROM_ADDRESS = "noreply@uncloud360.ai";

const LIFECYCLE_KINDS = [
  "expireCancellation",
  "applyDowngrade",
  "closeGracePeriod",
  "convertFounding",
  "notifyPaymentFailure",
  "notifyEndingSoon",
] as const;

type LifecycleKind = (typeof LIFECYCLE_KINDS)[number];

type LifecycleItem = {
  userId: string;
  kind: LifecycleKind;
  dueAt: string | null;
  planTier: string | null;
  billingInterval: BillingInterval | null;
  email: string | null;
  firstName: string | null;
  stripeSubscriptionId: string | null;
  gracePeriodEndsAt: string | null;
};

type ItemOutcome = {
  userId: string;
  kind: LifecycleKind;
  result: string;
};

function authorize(req: Request, serviceKey: string): boolean {
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer && bearer === serviceKey) return true;

  const cronSecret = Deno.env.get("SUBSCRIPTION_LIFECYCLE_CRON_SECRET");
  if (cronSecret) {
    return (req.headers.get("x-cron-secret") ?? "") === cronSecret;
  }
  return false;
}

function isLifecycleKind(value: unknown): value is LifecycleKind {
  return LIFECYCLE_KINDS.includes(value as LifecycleKind);
}

function parseItems(raw: unknown): LifecycleItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.userId !== "string" || !isLifecycleKind(row.kind)) return [];

    return [
      {
        userId: row.userId,
        kind: row.kind,
        dueAt: typeof row.dueAt === "string" ? row.dueAt : null,
        planTier: typeof row.planTier === "string" ? row.planTier : null,
        billingInterval:
          row.billingInterval === "month" || row.billingInterval === "year"
            ? row.billingInterval
            : null,
        email: typeof row.email === "string" ? row.email : null,
        firstName: typeof row.firstName === "string" ? row.firstName : null,
        stripeSubscriptionId:
          typeof row.stripeSubscriptionId === "string" ? row.stripeSubscriptionId : null,
        gracePeriodEndsAt:
          typeof row.gracePeriodEndsAt === "string" ? row.gracePeriodEndsAt : null,
      },
    ];
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "soon";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "soon"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

/** Emails are best-effort: a failed send never blocks a state transition. */
async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<string> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return "smtp:skipped — RESEND_API_KEY not set";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });
    if (!res.ok) return `resend_error: ${res.status} ${await res.text()}`;
    return "sent";
  } catch (err) {
    return `resend_error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

function subscriptionUrl(): string {
  return `${canonicalAppOrigin()}/settings?tab=subscription`;
}

async function notifyPaymentFailure(item: LifecycleItem): Promise<string> {
  if (!item.email) return "skipped — no email on profile";

  const greeting = item.firstName?.trim() || "there";
  return await sendEmail({
    to: item.email,
    subject: "We couldn't process your Unclouded payment",
    html: `
      <p>Hi ${greeting},</p>
      <p>We couldn't process your latest subscription payment. Your access continues
      until ${formatDate(item.gracePeriodEndsAt)} while we retry.</p>
      <p><a href="${subscriptionUrl()}">Update your payment method</a></p>
      <p>— Unclouded</p>
    `,
  });
}

async function notifyEndingSoon(item: LifecycleItem): Promise<string> {
  if (!item.email) return "skipped — no email on profile";

  const greeting = item.firstName?.trim() || "there";
  const movingToPro = item.planTier === "pro";
  const body = movingToPro
    ? `<p>Your Premium features stay available until ${formatDate(item.dueAt)}, when your
       subscription moves to Pro. Unused Premium credits expire on that date.</p>`
    : `<p>Your subscription is set to end on ${formatDate(item.dueAt)}. After that your
       account moves to the Free plan.</p>`;

  return await sendEmail({
    to: item.email,
    subject: movingToPro
      ? "Your Premium plan changes soon"
      : "Your Unclouded subscription ends soon",
    html: `
      <p>Hi ${greeting},</p>
      ${body}
      <p><a href="${subscriptionUrl()}">Review your subscription</a></p>
      <p>— Unclouded</p>
    `,
  });
}

/**
 * The 12-month Founding rate ended: move the Stripe subscription onto the
 * standard Pro price, then clear the founding flags and release the slot.
 *
 * Stripe is updated first — if the price swap fails, the row keeps its founding
 * state and tomorrow's run retries rather than billing the standard rate in our
 * records while Stripe still charges $19.
 */
async function convertFoundingMember(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  item: LifecycleItem,
): Promise<string> {
  const subscription = await loadSubscriptionRow(service, item.userId);
  if (!subscription?.isFoundingMember) return "noop — no longer founding";

  if (subscription.stripeSubscriptionId) {
    const interval = subscription.billingInterval ?? "month";
    const standard = selectPlanPrice(prices, "pro", interval, false);
    if (!standard?.stripePriceId) {
      return `skipped — no standard pro ${interval} price configured`;
    }

    const stripe = getStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );
    const itemId = stripeSubscription.items.data[0]?.id;
    if (!itemId) return "skipped — Stripe subscription has no items";

    if (stripeSubscription.items.data[0]?.price.id !== standard.stripePriceId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: itemId, price: standard.stripePriceId }],
        proration_behavior: "none",
      });
    }
  }

  const { error } = await service.rpc("billing_convert_founding_to_standard", {
    p_user_id: item.userId,
  });
  if (error) throw new Error(error.message);

  return "converted to standard Pro";
}

async function applyItem(
  service: SupabaseClient,
  prices: PlanPriceRow[],
  item: LifecycleItem,
): Promise<string> {
  switch (item.kind) {
    case "expireCancellation":
    case "closeGracePeriod": {
      const { error } = await service.rpc("billing_expire_subscription", {
        p_user_id: item.userId,
      });
      if (error) throw new Error(error.message);
      return "moved to Free";
    }
    case "applyDowngrade": {
      const { error } = await service.rpc("billing_apply_scheduled_downgrade", {
        p_user_id: item.userId,
      });
      if (error) throw new Error(error.message);
      return `downgrade applied → ${item.planTier ?? "free"}`;
    }
    case "convertFounding":
      return await convertFoundingMember(service, prices, item);
    case "notifyPaymentFailure":
    case "notifyEndingSoon": {
      const detail =
        item.kind === "notifyPaymentFailure"
          ? await notifyPaymentFailure(item)
          : await notifyEndingSoon(item);

      // Stamped either way: a missing address or a provider outage must not turn
      // into a daily repeat attempt for the same subscription state.
      const { error } = await service.rpc("billing_mark_lifecycle_notice_sent", {
        p_user_id: item.userId,
        p_kind: item.kind,
      });
      if (error) throw new Error(error.message);
      return detail;
    }
    default: {
      const exhaustive: never = item.kind;
      return exhaustive;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return json({ error: "Missing Supabase env" }, 500);
  if (!authorize(req, serviceKey)) return json({ error: "Unauthorized" }, 401);

  const service = getServiceClient();

  const { data, error } = await service.rpc("billing_list_lifecycle_due");
  if (error) return json({ error: error.message }, 500);

  const items = parseItems(data);
  const prices = items.some((item) => item.kind === "convertFounding")
    ? await loadPlanPrices(service)
    : [];

  const outcomes: ItemOutcome[] = [];
  const failures: ItemOutcome[] = [];

  // Sequential on purpose: transitions touch shared state (slots, credits) and
  // the daily volume is small.
  for (const item of items) {
    try {
      const result = await applyItem(service, prices, item);
      outcomes.push({ userId: item.userId, kind: item.kind, result });
    } catch (err) {
      failures.push({
        userId: item.userId,
        kind: item.kind,
        result: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  const { data: releaseData, error: releaseError } = await service.rpc(
    "billing_release_stale_booking_holds",
  );

  return json({
    ok: failures.length === 0,
    processed: items.length,
    applied: outcomes,
    failed: failures,
    staleHolds: releaseError ? { error: releaseError.message } : releaseData,
    smtp: Deno.env.get("RESEND_API_KEY") ? "resend" : "skipped",
  });
});
