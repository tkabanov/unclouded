-- Activate confirmed yearly Pro / Premium prices (product sign-off Aug 2026).
-- Pro: $290/year ($24.17/mo effective — 2 months free vs $348 at monthly)
-- Premium: $790/year ($65.83/mo effective — 2 months free vs $948 at monthly)
--
-- Stripe Price IDs are linked by scripts/sync_stripe_plan_prices.mjs after deploy.

UPDATE public."subscriptionPlanPrice"
SET
  "amountCents" = 29000,
  "isActive" = true,
  currency = 'usd'
WHERE "tierSlug" = 'pro'
  AND "billingInterval" = 'year'
  AND "isFoundingRate" = false;

UPDATE public."subscriptionPlanPrice"
SET
  "amountCents" = 79000,
  "isActive" = true,
  currency = 'usd'
WHERE "tierSlug" = 'premium'
  AND "billingInterval" = 'year'
  AND "isFoundingRate" = false;
