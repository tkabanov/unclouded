/**
 * Create Stripe test-mode Prices and link them in subscriptionPlanPrice.
 *
 * Required:
 *   STRIPE_SECRET_KEY=sk_test_...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Optional:
 *   SUPABASE_URL (defaults to project URL)
 *
 * Usage:
 *   STRIPE_SECRET_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync_stripe_plan_prices.mjs
 *
 * After this, set the same STRIPE_SECRET_KEY on Supabase Edge Functions:
 *   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref szkextipgpupqoppccoy
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim();
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const PRODUCT_LOOKUP = "unclouded_individual_plans";

async function stripeRequest(method, path, body) {
  const init = {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  if (body) {
    init.body = new URLSearchParams(body).toString();
  }
  const res = await fetch(`https://api.stripe.com/v1${path}`, init);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${path}: ${json.error?.message ?? res.status}`);
  }
  return json;
}

async function ensureProduct() {
  const listed = await stripeRequest("GET", `/products?limit=100&active=true`);
  const existing = listed.data?.find((p) => p.metadata?.lookup === PRODUCT_LOOKUP);
  if (existing) return existing.id;

  const created = await stripeRequest("POST", "/products", {
    name: "Uncloud360 Individual Plans (QA)",
    "metadata[lookup]": PRODUCT_LOOKUP,
  });
  return created.id;
}

function lookupKey(tierSlug, billingInterval, isFoundingRate) {
  return `unclouded_${tierSlug}_${billingInterval}${isFoundingRate ? "_founding" : ""}`;
}

async function ensurePrice(productId, row) {
  const key = lookupKey(row.tierSlug, row.billingInterval, row.isFoundingRate);
  const listed = await stripeRequest("GET", `/prices?limit=100&active=true&lookup_keys[]=${key}`);
  const hit = listed.data?.[0];
  if (hit?.id) return hit.id;

  const created = await stripeRequest("POST", "/prices", {
    product: productId,
    currency: row.currency ?? "usd",
    unit_amount: String(row.amountCents),
    "recurring[interval]": row.billingInterval,
    lookup_key: key,
    "metadata[tierSlug]": row.tierSlug,
    "metadata[billingInterval]": row.billingInterval,
    "metadata[isFoundingRate]": String(row.isFoundingRate),
  });
  return created.id;
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await admin
    .from("subscriptionPlanPrice")
    .select("id, tierSlug, billingInterval, amountCents, currency, isFoundingRate, isActive, stripePriceId")
    .eq("isActive", true)
    .not("amountCents", "is", null);

  if (error) throw error;

  const productId = await ensureProduct();
  console.log("Stripe product:", productId);

  for (const row of rows ?? []) {
    const priceId = await ensurePrice(productId, row);
    if (row.stripePriceId === priceId) {
      console.log(`  ${row.tierSlug}/${row.billingInterval} founding=${row.isFoundingRate}: already linked`);
      continue;
    }
    const { error: updateError } = await admin
      .from("subscriptionPlanPrice")
      .update({ stripePriceId: priceId })
      .eq("id", row.id);
    if (updateError) throw updateError;
    console.log(`  ${row.tierSlug}/${row.billingInterval} founding=${row.isFoundingRate}: ${priceId}`);
  }

  console.log("\nDone. Deploy secret if needed:");
  console.log("  npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref szkextipgpupqoppccoy");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
