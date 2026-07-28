-- Individual Subscription Management Flow — lifecycle schema.
--
-- Adds the subscription state machine (`userSubscription`), the Premium credit
-- ledger, the Stripe price catalog, and the Founding Member slot register.
--
-- `profiles.subscribed` / `profiles.tier` stay as a denormalized cache because
-- `consume_chat_session`, path RLS, and the chat edge functions read them. They
-- are kept in sync from `userSubscription` by trigger and must never be the
-- source of truth for a scheduled cancellation or downgrade.

-- ---------------------------------------------------------------------------
-- Plan price catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."subscriptionPlanPrice" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tierSlug" TEXT NOT NULL CHECK ("tierSlug" IN ('pro', 'premium')),
  "billingInterval" TEXT NOT NULL CHECK ("billingInterval" IN ('month', 'year')),
  "stripePriceId" TEXT NULL,
  -- NULL means the price is not confirmed yet (yearly Pro / Premium are TBD and
  -- must not be derived from the monthly amount).
  "amountCents" INTEGER NULL CHECK ("amountCents" IS NULL OR "amountCents" >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  "isFoundingRate" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plan_price_unique
  ON public."subscriptionPlanPrice" ("tierSlug", "billingInterval", "isFoundingRate");

DROP TRIGGER IF EXISTS subscription_plan_price_updated_at ON public."subscriptionPlanPrice";
CREATE TRIGGER subscription_plan_price_updated_at
  BEFORE UPDATE ON public."subscriptionPlanPrice"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public."subscriptionPlanPrice"
  ("tierSlug", "billingInterval", "amountCents", "isFoundingRate", "isActive")
VALUES
  ('pro',     'month', 2900, false, true),
  ('premium', 'month', 7900, false, true),
  ('pro',     'month', 1900, true,  true),
  -- Yearly amounts are TBD per spec; kept inactive so the UI renders the
  -- selector but disables the yearly option until real prices arrive.
  ('pro',     'year',  NULL, false, false),
  ('premium', 'year',  NULL, false, false)
ON CONFLICT ("tierSlug", "billingInterval", "isFoundingRate") DO NOTHING;

ALTER TABLE public."subscriptionPlanPrice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active plan prices" ON public."subscriptionPlanPrice";
CREATE POLICY "Anyone reads active plan prices"
  ON public."subscriptionPlanPrice" FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Settings admin writes plan prices" ON public."subscriptionPlanPrice";
CREATE POLICY "Settings admin writes plan prices"
  ON public."subscriptionPlanPrice" FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

GRANT SELECT ON public."subscriptionPlanPrice" TO authenticated;
GRANT ALL ON public."subscriptionPlanPrice" TO service_role;

-- ---------------------------------------------------------------------------
-- Subscription state machine
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."userSubscription" (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "planTier" TEXT NOT NULL DEFAULT 'free'
    CHECK ("planTier" IN ('free', 'pro', 'premium')),
  status TEXT NOT NULL DEFAULT 'free'
    CHECK (status IN (
      'free',
      'active',
      'scheduledToCancel',
      'scheduledToDowngrade',
      'pastDue',
      'inactive'
    )),
  "billingInterval" TEXT NULL
    CHECK ("billingInterval" IS NULL OR "billingInterval" IN ('month', 'year')),
  "currentPeriodStart" TIMESTAMPTZ NULL,
  "currentPeriodEnd" TIMESTAMPTZ NULL,
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "scheduledDowngradeTier" TEXT NULL
    CHECK ("scheduledDowngradeTier" IS NULL OR "scheduledDowngradeTier" IN ('free', 'pro')),
  "scheduledDowngradeEffectiveAt" TIMESTAMPTZ NULL,
  "stripeCustomerId" TEXT NULL,
  "stripeSubscriptionId" TEXT NULL,
  "stripePriceId" TEXT NULL,
  "isFoundingMember" BOOLEAN NOT NULL DEFAULT false,
  "foundingStartedAt" TIMESTAMPTZ NULL,
  "foundingDiscountEndsAt" TIMESTAMPTZ NULL,
  "foundingDiscountForfeitedAt" TIMESTAMPTZ NULL,
  "gracePeriodEndsAt" TIMESTAMPTZ NULL,
  "lastPaymentFailedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A cancellation and a downgrade must never be scheduled at the same time.
  CONSTRAINT user_subscription_single_schedule CHECK (
    NOT ("cancelAtPeriodEnd" = true AND "scheduledDowngradeTier" IS NOT NULL)
  ),
  CONSTRAINT user_subscription_downgrade_has_date CHECK (
    ("scheduledDowngradeTier" IS NULL) = ("scheduledDowngradeEffectiveAt" IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscription_stripe_subscription
  ON public."userSubscription" ("stripeSubscriptionId")
  WHERE "stripeSubscriptionId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscription_stripe_customer
  ON public."userSubscription" ("stripeCustomerId")
  WHERE "stripeCustomerId" IS NOT NULL;

-- Cron lookups: rows whose scheduled state has come due.
CREATE INDEX IF NOT EXISTS idx_user_subscription_period_end
  ON public."userSubscription" (status, "currentPeriodEnd");

CREATE INDEX IF NOT EXISTS idx_user_subscription_downgrade_due
  ON public."userSubscription" ("scheduledDowngradeEffectiveAt")
  WHERE "scheduledDowngradeTier" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscription_founding_due
  ON public."userSubscription" ("foundingDiscountEndsAt")
  WHERE "isFoundingMember" = true;

DROP TRIGGER IF EXISTS user_subscription_updated_at ON public."userSubscription";
CREATE TRIGGER user_subscription_updated_at
  BEFORE UPDATE ON public."userSubscription"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public."userSubscription" ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner; every write goes through SECURITY DEFINER RPCs or
-- the Stripe webhook running as service_role.
DROP POLICY IF EXISTS "Owner reads own subscription" ON public."userSubscription";
CREATE POLICY "Owner reads own subscription"
  ON public."userSubscription" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

GRANT SELECT ON public."userSubscription" TO authenticated;
GRANT ALL ON public."userSubscription" TO service_role;

-- ---------------------------------------------------------------------------
-- Premium credit ledger (append-only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."premiumCreditLedger" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Positive = credits granted, negative = credits consumed or expired.
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL CHECK (reason IN (
    'accrual',
    'hold',
    'holdRelease',
    'redemption',
    'expiry',
    'reversal',
    'adminAdjustment'
  )),
  "stripeInvoiceId" TEXT NULL,
  "coachBookingId" UUID NULL REFERENCES public."coachBooking"(id) ON DELETE SET NULL,
  note TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One credit per successful billing period: a duplicated Stripe webhook cannot
-- create a second accrual row for the same invoice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_credit_accrual_per_invoice
  ON public."premiumCreditLedger" ("userId", "stripeInvoiceId")
  WHERE reason = 'accrual' AND "stripeInvoiceId" IS NOT NULL;

-- A booking can hold once and redeem once — never twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_credit_booking_reason
  ON public."premiumCreditLedger" ("coachBookingId", reason)
  WHERE "coachBookingId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_premium_credit_user_created
  ON public."premiumCreditLedger" ("userId", "createdAt" DESC);

ALTER TABLE public."premiumCreditLedger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own credit ledger" ON public."premiumCreditLedger";
CREATE POLICY "Owner reads own credit ledger"
  ON public."premiumCreditLedger" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

GRANT SELECT ON public."premiumCreditLedger" TO authenticated;
GRANT ALL ON public."premiumCreditLedger" TO service_role;

CREATE OR REPLACE FUNCTION public.available_premium_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(sum(delta), 0)::integer
  FROM public."premiumCreditLedger"
  WHERE "userId" = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.available_premium_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.available_premium_credits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.available_premium_credits(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.my_premium_credit_balance()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.available_premium_credits(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.my_premium_credit_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_premium_credit_balance() TO authenticated;

/** Credits required to redeem one 30-minute 1:1 session. */
CREATE OR REPLACE FUNCTION public.credits_per_one_on_one_session()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 2; $$;

GRANT EXECUTE ON FUNCTION public.credits_per_one_on_one_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credits_per_one_on_one_session() TO service_role;

-- ---------------------------------------------------------------------------
-- Founding Member slots — first 100 eligible users
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.founding_member_slot_limit()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 100; $$;

GRANT EXECUTE ON FUNCTION public.founding_member_slot_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.founding_member_slot_limit() TO service_role;

CREATE TABLE IF NOT EXISTS public."foundingMemberSlot" (
  "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "slotNumber" INTEGER NOT NULL,
  "claimedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "releasedAt" TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_member_slot_number
  ON public."foundingMemberSlot" ("slotNumber");

ALTER TABLE public."foundingMemberSlot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own founding slot" ON public."foundingMemberSlot";
CREATE POLICY "Owner reads own founding slot"
  ON public."foundingMemberSlot" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

GRANT SELECT ON public."foundingMemberSlot" TO authenticated;
GRANT ALL ON public."foundingMemberSlot" TO service_role;

CREATE OR REPLACE FUNCTION public.founding_member_slots_remaining()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(
    0,
    public.founding_member_slot_limit()
      - (SELECT count(*)::integer FROM public."foundingMemberSlot" WHERE "releasedAt" IS NULL)
  );
$$;

GRANT EXECUTE ON FUNCTION public.founding_member_slots_remaining() TO authenticated;
GRANT EXECUTE ON FUNCTION public.founding_member_slots_remaining() TO service_role;

/**
 * Reserve a Founding Member slot. Returns the slot number, or NULL when the
 * campaign is full. Idempotent: an existing unreleased slot is returned as-is.
 */
CREATE OR REPLACE FUNCTION public.claim_founding_member_slot(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot integer;
  v_taken integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  SELECT "slotNumber" INTO v_slot
  FROM public."foundingMemberSlot"
  WHERE "userId" = p_user_id AND "releasedAt" IS NULL;

  IF v_slot IS NOT NULL THEN
    RETURN v_slot;
  END IF;

  -- Serialize concurrent claims so the 100-slot cap cannot be oversold.
  PERFORM pg_advisory_xact_lock(hashtext('founding_member_slot'));

  SELECT count(*)::integer INTO v_taken
  FROM public."foundingMemberSlot"
  WHERE "releasedAt" IS NULL;

  IF v_taken >= public.founding_member_slot_limit() THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(max("slotNumber"), 0) + 1 INTO v_slot
  FROM public."foundingMemberSlot";

  INSERT INTO public."foundingMemberSlot" ("userId", "slotNumber")
  VALUES (p_user_id, v_slot)
  ON CONFLICT ("userId") DO UPDATE
    SET "releasedAt" = NULL
  RETURNING "slotNumber" INTO v_slot;

  RETURN v_slot;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_founding_member_slot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_founding_member_slot(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Effective tier: status + dates, never the `subscribed` boolean alone
-- ---------------------------------------------------------------------------

/**
 * Pure resolver over subscription columns. A scheduled cancellation or
 * downgrade keeps full paid access until its date, and a past-due subscription
 * keeps access until the grace period ends. Correct even if the lifecycle cron
 * has not yet transitioned the row.
 */
CREATE OR REPLACE FUNCTION public.subscription_effective_tier(
  p_status TEXT,
  p_plan_tier TEXT,
  p_current_period_end TIMESTAMPTZ,
  p_scheduled_downgrade_tier TEXT,
  p_scheduled_downgrade_effective_at TIMESTAMPTZ,
  p_grace_period_ends_at TIMESTAMPTZ,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_status, 'free'))
    WHEN 'active' THEN coalesce(p_plan_tier, 'free')
    WHEN 'scheduledtocancel' THEN
      CASE
        WHEN p_current_period_end IS NULL OR p_now < p_current_period_end
          THEN coalesce(p_plan_tier, 'free')
        ELSE 'free'
      END
    WHEN 'scheduledtodowngrade' THEN
      CASE
        WHEN p_scheduled_downgrade_effective_at IS NULL
             OR p_now < p_scheduled_downgrade_effective_at
          THEN coalesce(p_plan_tier, 'free')
        ELSE coalesce(p_scheduled_downgrade_tier, 'free')
      END
    WHEN 'pastdue' THEN
      CASE
        WHEN p_grace_period_ends_at IS NULL OR p_now < p_grace_period_ends_at
          THEN coalesce(p_plan_tier, 'free')
        ELSE 'free'
      END
    ELSE 'free'
  END;
$$;

GRANT EXECUTE ON FUNCTION public.subscription_effective_tier(
  TEXT, TEXT, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_effective_tier(
  TEXT, TEXT, TIMESTAMPTZ, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;

-- ---------------------------------------------------------------------------
-- Keep profiles.subscribed / profiles.tier in sync with the state machine
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_profile_entitlement_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_account_type text;
BEGIN
  SELECT "accountType" INTO v_account_type
  FROM public.profiles
  WHERE id = NEW."userId";

  -- Enterprise entitlement is owned by the workplace contract, not by Stripe.
  IF v_account_type = 'enterprise' THEN
    RETURN NEW;
  END IF;

  v_tier := public.subscription_effective_tier(
    NEW.status,
    NEW."planTier",
    NEW."currentPeriodEnd",
    NEW."scheduledDowngradeTier",
    NEW."scheduledDowngradeEffectiveAt",
    NEW."gracePeriodEndsAt"
  );

  PERFORM set_config('app.billing_sync', 'true', true);

  UPDATE public.profiles
  SET subscribed = (v_tier <> 'free'),
      tier = v_tier,
      "canReassessOnDemand" = CASE
        WHEN v_tier = 'premium' THEN true
        ELSE "canReassessOnDemand"
      END
  WHERE id = NEW."userId";

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscription_sync_profile ON public."userSubscription";
CREATE TRIGGER user_subscription_sync_profile
  AFTER INSERT OR UPDATE ON public."userSubscription"
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_entitlement_from_subscription();

-- Every profile owns exactly one subscription row.
CREATE OR REPLACE FUNCTION public.ensure_user_subscription_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."userSubscription" ("userId", "planTier", status)
  VALUES (NEW.id, 'free', 'free')
  ON CONFLICT ("userId") DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_ensure_user_subscription ON public.profiles;
CREATE TRIGGER profiles_ensure_user_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_subscription_row();

-- ---------------------------------------------------------------------------
-- Backfill from the legacy boolean entitlement
-- ---------------------------------------------------------------------------

INSERT INTO public."userSubscription" (
  "userId",
  "planTier",
  status,
  "billingInterval",
  "isFoundingMember",
  "foundingStartedAt",
  "foundingDiscountEndsAt"
)
SELECT
  p.id,
  CASE
    WHEN p."accountType" = 'enterprise' THEN 'free'
    WHEN lower(coalesce(p.tier, 'free')) IN ('pro', 'premium') THEN lower(p.tier)
    WHEN p.subscribed IS TRUE THEN 'pro'
    ELSE 'free'
  END,
  CASE
    WHEN p."accountType" = 'enterprise' THEN 'free'
    WHEN p.subscribed IS TRUE OR lower(coalesce(p.tier, 'free')) IN ('pro', 'premium')
      THEN 'active'
    ELSE 'free'
  END,
  CASE
    WHEN p."accountType" <> 'enterprise'
         AND (p.subscribed IS TRUE OR lower(coalesce(p.tier, 'free')) IN ('pro', 'premium'))
      THEN 'month'
    ELSE NULL
  END,
  coalesce(p."signupPlan", '') = 'founding',
  CASE WHEN coalesce(p."signupPlan", '') = 'founding' THEN p."createdAt" ELSE NULL END,
  CASE
    WHEN coalesce(p."signupPlan", '') = 'founding'
      THEN coalesce(p."createdAt", now()) + interval '12 months'
    ELSE NULL
  END
FROM public.profiles p
ON CONFLICT ("userId") DO NOTHING;

-- Existing founding signups occupy campaign slots, oldest first.
INSERT INTO public."foundingMemberSlot" ("userId", "slotNumber", "claimedAt")
SELECT
  ranked.id,
  ranked.slot_number,
  ranked."createdAt"
FROM (
  SELECT
    p.id,
    p."createdAt",
    row_number() OVER (ORDER BY p."createdAt", p.id) AS slot_number
  FROM public.profiles p
  WHERE coalesce(p."signupPlan", '') = 'founding'
) ranked
WHERE ranked.slot_number <= public.founding_member_slot_limit()
ON CONFLICT ("userId") DO NOTHING;
