/**
 * Activate yearly Pro/Premium prices once product confirms amounts.
 *
 * Required env:
 *   SUPABASE_SERVICE_ROLE_KEY
 *   YEARLY_PRO_AMOUNT_CENTS        e.g. 29000
 *   YEARLY_PREMIUM_AMOUNT_CENTS    e.g. 79000
 *
 * Optional (link existing Stripe Price IDs instead of amount-only rows):
 *   YEARLY_PRO_STRIPE_PRICE_ID
 *   YEARLY_PREMIUM_STRIPE_PRICE_ID
 *
 * Optional:
 *   SUPABASE_URL (defaults to project URL)
 *
 * Usage:
 *   YEARLY_PRO_AMOUNT_CENTS=29000 YEARLY_PREMIUM_AMOUNT_CENTS=79000 \
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/activate_yearly_plan_prices.mjs
 *
 * After product confirms Stripe yearly Price IDs, run sync_stripe_plan_prices.mjs
 * or set YEARLY_*_STRIPE_PRICE_ID here, then re-run this script.
 */
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { createClient } = require("@supabase/supabase-js");

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://szkextipgpupqoppccoy.supabase.co";

const PRO_CENTS = Number.parseInt(process.env.YEARLY_PRO_AMOUNT_CENTS ?? "", 10);
const PREMIUM_CENTS = Number.parseInt(process.env.YEARLY_PREMIUM_AMOUNT_CENTS ?? "", 10);
const PRO_PRICE_ID = process.env.YEARLY_PRO_STRIPE_PRICE_ID?.trim() || null;
const PREMIUM_PRICE_ID = process.env.YEARLY_PREMIUM_STRIPE_PRICE_ID?.trim() || null;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!Number.isFinite(PRO_CENTS) || PRO_CENTS <= 0) {
  console.error("Set YEARLY_PRO_AMOUNT_CENTS to a positive integer (e.g. 29000).");
  process.exit(1);
}
if (!Number.isFinite(PREMIUM_CENTS) || PREMIUM_CENTS <= 0) {
  console.error("Set YEARLY_PREMIUM_AMOUNT_CENTS to a positive integer (e.g. 79000).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function activateRow(tierSlug, amountCents, stripePriceId) {
  const { data, error } = await supabase
    .from("subscriptionPlanPrice")
    .update({
      amountCents,
      stripePriceId,
      isActive: true,
      currency: "usd",
    })
    .eq("tierSlug", tierSlug)
    .eq("billingInterval", "year")
    .eq("isFoundingRate", false)
    .select("tierSlug, billingInterval, amountCents, stripePriceId, isActive")
    .maybeSingle();

  if (error) throw new Error(`${tierSlug}/year: ${error.message}`);
  if (!data) throw new Error(`${tierSlug}/year row not found in subscriptionPlanPrice`);
  return data;
}

async function main() {
  const pro = await activateRow("pro", PRO_CENTS, PRO_PRICE_ID);
  const premium = await activateRow("premium", PREMIUM_CENTS, PREMIUM_PRICE_ID);

  console.log("Yearly plan prices activated:");
  console.log(JSON.stringify({ pro, premium }, null, 2));

  if (!PRO_PRICE_ID || !PREMIUM_PRICE_ID) {
    console.warn(
      "\nStripe Price IDs are not set. Run scripts/sync_stripe_plan_prices.mjs after creating yearly prices, " +
        "or pass YEARLY_PRO_STRIPE_PRICE_ID and YEARLY_PREMIUM_STRIPE_PRICE_ID.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
