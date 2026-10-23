/**
 * NCLDD-63 (OVR-081) — full self-service account deletion (Settings → Security).
 *
 * POST /functions/v1/delete-account  { "confirm": true }
 *
 * 1. Cancels every live Stripe subscription of the user's customer immediately (no proration).
 *    If Stripe cancel fails, nothing is deleted — the user would otherwise keep being billed.
 * 2. Removes the user's PuP PDF files from storage.
 * 3. Deletes the auth user; all public tables cascade (or set null) from auth.users / profiles.
 *
 * Applies to every account type, workplace (enterprise) members included.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

import { authenticateRequest } from "../_shared/supabase-auth.ts";
import {
  corsHeaders,
  getServiceClient,
  getStripe,
  json,
  loadSubscriptionRow,
} from "../_shared/stripeBilling.ts";

const PUP_PDF_BUCKET = "pup-pdf-reports";
const LIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

function isStripeMissing(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "resource_missing";
}

async function cancelStripeSubscriptions(service: SupabaseClient, userId: string): Promise<void> {
  const row = await loadSubscriptionRow(service, userId);
  const customerId = row?.stripeCustomerId?.trim();
  const subscriptionId = row?.stripeSubscriptionId?.trim();
  if (!customerId && !subscriptionId) return;

  const stripe = getStripe();
  const ids = new Set<string>();
  if (customerId) {
    try {
      for await (const sub of stripe.subscriptions.list({ customer: customerId, status: "all" })) {
        if (LIVE_STRIPE_STATUSES.has(sub.status)) ids.add(sub.id);
      }
    } catch (err) {
      // Stale customer from a Stripe account / key swap: nothing billable there.
      if (!isStripeMissing(err)) throw err;
    }
  }
  if (subscriptionId && !customerId) ids.add(subscriptionId);

  for (const id of ids) {
    try {
      await stripe.subscriptions.cancel(id, { prorate: false, invoice_now: false });
    } catch (err) {
      if (!isStripeMissing(err)) throw err;
    }
  }
}

async function removeUserFiles(service: SupabaseClient, userId: string): Promise<void> {
  const bucket = service.storage.from(PUP_PDF_BUCKET);
  for (;;) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    if (error) throw new Error(`storage list: ${error.message}`);
    if (!data || data.length === 0) return;
    const { error: removeError } = await bucket.remove(data.map((file) => `${userId}/${file.name}`));
    if (removeError) throw new Error(`storage remove: ${removeError.message}`);
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const auth = await authenticateRequest(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  const userId = auth.user.id;

  let body: { confirm?: unknown } = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as { confirm?: unknown };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (body.confirm !== true) {
    return json({ error: "Confirmation required" }, 400);
  }

  const service = getServiceClient();

  try {
    await cancelStripeSubscriptions(service, userId);
  } catch (err) {
    console.error(`delete-account: Stripe cancel failed for ${userId}`, err);
    return json(
      { error: "We couldn't cancel your subscription, so your account was not deleted. Please contact support." },
      502,
    );
  }

  try {
    await removeUserFiles(service, userId);
  } catch (err) {
    // Files are keyed by userId and unreachable once the user is gone; do not block deletion.
    console.error(`delete-account: storage cleanup failed for ${userId}`, err);
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error(`delete-account: deleteUser failed for ${userId}`, deleteError);
    return json({ error: "Couldn't delete your account. Please contact support." }, 500);
  }

  return json({ ok: true });
});
