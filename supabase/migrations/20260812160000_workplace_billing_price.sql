-- Org contract metadata for admin enterprise management (not Stripe).
ALTER TABLE public.workplace
  ADD COLUMN IF NOT EXISTS "billingPeriod" TEXT NULL
    CHECK (
      "billingPeriod" IS NULL
      OR "billingPeriod" IN ('monthly', 'quarterly', 'half_yearly', 'yearly')
    ),
  ADD COLUMN IF NOT EXISTS "price" NUMERIC(12, 2) NULL
    CHECK ("price" IS NULL OR "price" >= 0);

COMMENT ON COLUMN public.workplace."billingPeriod" IS
  'Admin contract billing period metadata: monthly | quarterly | half_yearly | yearly';
COMMENT ON COLUMN public.workplace."price" IS
  'Admin contract price metadata (not Stripe billing)';
