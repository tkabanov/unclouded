-- Individual Subscription Management Flow — billing write surface.
--
-- Every mutation of the subscription state machine and the credit ledger goes
-- through one of these functions. User-facing reads use
-- `get_my_subscription_overview`; all writes are service_role only so the
-- Stripe webhook and the lifecycle cron are the sole authorities.

-- ---------------------------------------------------------------------------
-- Effective entitlement (status + dates, plus the enterprise carve-out)
-- ---------------------------------------------------------------------------

/**
 * Effective tier for a user. Enterprise contracts bypass Stripe entirely
 * (Phase 2 §9), so their `profiles.enterpriseTier` wins.
 */
CREATE OR REPLACE FUNCTION public.effective_user_tier(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p."accountType" = 'enterprise'
      THEN coalesce(nullif(lower(btrim(p."enterpriseTier")), ''), 'pro')
    WHEN s."userId" IS NULL
      THEN CASE
        WHEN lower(coalesce(p.tier, 'free')) IN ('pro', 'premium') THEN lower(p.tier)
        WHEN p.subscribed IS TRUE THEN 'pro'
        ELSE 'free'
      END
    ELSE public.subscription_effective_tier(
      s.status,
      s."planTier",
      s."currentPeriodEnd",
      s."scheduledDowngradeTier",
      s."scheduledDowngradeEffectiveAt",
      s."gracePeriodEndsAt"
    )
  END
  FROM public.profiles p
  LEFT JOIN public."userSubscription" s ON s."userId" = p.id
  WHERE p.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.effective_user_tier(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.effective_user_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_user_tier(UUID) TO service_role;

/** Convenience wrapper for RLS policies. */
CREATE OR REPLACE FUNCTION public.my_effective_tier()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_user_tier(auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.my_effective_tier() TO authenticated;

-- `userHasPremiumTier` predates the state machine and read `profiles.tier`
-- directly, which would drop access the moment a cancellation was scheduled.
CREATE OR REPLACE FUNCTION public.userHasPremiumTier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_user_tier(auth.uid()) = 'premium';
$$;

GRANT EXECUTE ON FUNCTION public.userHasPremiumTier() TO authenticated;

-- ---------------------------------------------------------------------------
-- Read surface
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_subscription_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_sub public."userSubscription"%ROWTYPE;
  v_prices jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = v_user_id;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'tierSlug', pr."tierSlug",
        'billingInterval', pr."billingInterval",
        'amountCents', pr."amountCents",
        'currency', pr.currency,
        'isFoundingRate', pr."isFoundingRate",
        'isActive', pr."isActive"
      )
      ORDER BY pr."tierSlug", pr."billingInterval", pr."isFoundingRate"
    ),
    '[]'::jsonb
  )
  INTO v_prices
  FROM public."subscriptionPlanPrice" pr;

  RETURN jsonb_build_object(
    'accountType', v_profile."accountType",
    'enterpriseTier', v_profile."enterpriseTier",
    'effectiveTier', public.effective_user_tier(v_user_id),
    'subscription', CASE
      WHEN v_sub."userId" IS NULL THEN NULL
      ELSE jsonb_build_object(
        'planTier', v_sub."planTier",
        'status', v_sub.status,
        'billingInterval', v_sub."billingInterval",
        'currentPeriodStart', v_sub."currentPeriodStart",
        'currentPeriodEnd', v_sub."currentPeriodEnd",
        'cancelAtPeriodEnd', v_sub."cancelAtPeriodEnd",
        'scheduledDowngradeTier', v_sub."scheduledDowngradeTier",
        'scheduledDowngradeEffectiveAt', v_sub."scheduledDowngradeEffectiveAt",
        'isFoundingMember', v_sub."isFoundingMember",
        'foundingStartedAt', v_sub."foundingStartedAt",
        'foundingDiscountEndsAt', v_sub."foundingDiscountEndsAt",
        'foundingDiscountForfeitedAt', v_sub."foundingDiscountForfeitedAt",
        'gracePeriodEndsAt', v_sub."gracePeriodEndsAt",
        'hasPaymentMethodOnFile', (v_sub."stripeCustomerId" IS NOT NULL)
      )
    END,
    'credits', jsonb_build_object(
      'balance', public.available_premium_credits(v_user_id),
      'requiredPerSession', public.credits_per_one_on_one_session()
    ),
    'prices', v_prices,
    'foundingSlotsRemaining', public.founding_member_slots_remaining()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_subscription_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_subscription_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_premium_credit_history(p_limit INTEGER DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'delta', l.delta,
        'reason', l.reason,
        'note', l.note,
        'createdAt', l."createdAt"
      )
      ORDER BY l."createdAt" DESC
    ),
    '[]'::jsonb
  )
  FROM (
    SELECT *
    FROM public."premiumCreditLedger"
    WHERE "userId" = auth.uid()
    ORDER BY "createdAt" DESC
    LIMIT greatest(1, least(coalesce(p_limit, 50), 200))
  ) l;
$$;

REVOKE ALL ON FUNCTION public.list_my_premium_credit_history(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_premium_credit_history(INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------
-- Webhook replay protection
-- ---------------------------------------------------------------------------

-- The webhook inserts the Stripe event id before processing it, so a duplicate
-- or replayed delivery short-circuits instead of re-running side effects.
CREATE TABLE IF NOT EXISTS public."stripeWebhookEvent" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_event_received
  ON public."stripeWebhookEvent" ("receivedAt" DESC);

ALTER TABLE public."stripeWebhookEvent" ENABLE ROW LEVEL SECURITY;

-- No client policies: service_role only.
GRANT ALL ON public."stripeWebhookEvent" TO service_role;

-- ---------------------------------------------------------------------------
-- Stripe sync (service_role only)
-- ---------------------------------------------------------------------------

/**
 * Apply Stripe subscription state. Our scheduled downgrade is preserved unless
 * the incoming plan already matches it, which means the downgrade has landed.
 */
CREATE OR REPLACE FUNCTION public.billing_sync_stripe_subscription(
  p_user_id UUID,
  p_plan_tier TEXT,
  p_status TEXT,
  p_billing_interval TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_stripe_price_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public."userSubscription"%ROWTYPE;
  v_plan text := lower(btrim(coalesce(p_plan_tier, 'free')));
  v_status text := btrim(coalesce(p_status, 'free'));
  v_downgrade_tier text;
  v_downgrade_at timestamptz;
  v_cancel boolean := coalesce(p_cancel_at_period_end, false);
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  INSERT INTO public."userSubscription" ("userId")
  VALUES (p_user_id)
  ON CONFLICT ("userId") DO NOTHING;

  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = p_user_id FOR UPDATE;

  v_downgrade_tier := v_sub."scheduledDowngradeTier";
  v_downgrade_at := v_sub."scheduledDowngradeEffectiveAt";

  -- The scheduled downgrade has been applied in Stripe: drop the schedule.
  IF v_downgrade_tier IS NOT NULL AND v_plan = v_downgrade_tier THEN
    v_downgrade_tier := NULL;
    v_downgrade_at := NULL;
  END IF;

  -- A cancellation and a downgrade are mutually exclusive.
  IF v_cancel THEN
    v_downgrade_tier := NULL;
    v_downgrade_at := NULL;
  END IF;

  IF v_downgrade_tier IS NOT NULL AND v_status = 'active' THEN
    v_status := 'scheduledToDowngrade';
  END IF;

  UPDATE public."userSubscription"
  SET "planTier" = v_plan,
      status = v_status,
      "billingInterval" = nullif(lower(btrim(coalesce(p_billing_interval, ''))), ''),
      "currentPeriodStart" = p_current_period_start,
      "currentPeriodEnd" = p_current_period_end,
      "cancelAtPeriodEnd" = v_cancel,
      "scheduledDowngradeTier" = v_downgrade_tier,
      "scheduledDowngradeEffectiveAt" = v_downgrade_at,
      "stripeCustomerId" = coalesce(p_stripe_customer_id, "stripeCustomerId"),
      "stripeSubscriptionId" = coalesce(p_stripe_subscription_id, "stripeSubscriptionId"),
      "stripePriceId" = coalesce(p_stripe_price_id, "stripePriceId"),
      "gracePeriodEndsAt" = CASE WHEN v_status = 'pastDue' THEN "gracePeriodEndsAt" ELSE NULL END,
      "lastPaymentFailedAt" = CASE WHEN v_status = 'pastDue' THEN "lastPaymentFailedAt" ELSE NULL END
  WHERE "userId" = p_user_id;

  -- Leaving Premium for good makes any unused credits unusable.
  IF public.effective_user_tier(p_user_id) <> 'premium' THEN
    PERFORM public.billing_expire_premium_credits(
      p_user_id,
      'Premium access ended — unused credits expired.'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_sync_stripe_subscription(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_sync_stripe_subscription(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, TEXT
) TO service_role;

CREATE OR REPLACE FUNCTION public.billing_attach_stripe_customer(
  p_user_id UUID,
  p_stripe_customer_id TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."userSubscription" ("userId", "stripeCustomerId")
  VALUES (p_user_id, p_stripe_customer_id)
  ON CONFLICT ("userId") DO UPDATE
    SET "stripeCustomerId" = coalesce(EXCLUDED."stripeCustomerId", public."userSubscription"."stripeCustomerId");
END;
$$;

REVOKE ALL ON FUNCTION public.billing_attach_stripe_customer(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_attach_stripe_customer(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Credit accrual and expiry (service_role only)
-- ---------------------------------------------------------------------------

/**
 * Grant the monthly Premium credit. Idempotent per Stripe invoice, so a
 * duplicated, retried, or replayed webhook cannot create a second credit.
 */
CREATE OR REPLACE FUNCTION public.billing_grant_premium_credit(
  p_user_id UUID,
  p_stripe_invoice_id TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF p_stripe_invoice_id IS NULL OR btrim(p_stripe_invoice_id) = '' THEN
    RAISE EXCEPTION 'invoice_required';
  END IF;

  -- Credits only accrue while Premium is the effective entitlement.
  IF public.effective_user_tier(p_user_id) <> 'premium' THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_premium');
  END IF;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "stripeInvoiceId", note)
  VALUES (p_user_id, 1, 'accrual', btrim(p_stripe_invoice_id), p_note)
  ON CONFLICT ("userId", "stripeInvoiceId") WHERE reason = 'accrual' AND "stripeInvoiceId" IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_inserted > 0 THEN 'granted' ELSE 'duplicate' END,
    'balance', public.available_premium_credits(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_grant_premium_credit(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_grant_premium_credit(UUID, TEXT, TEXT) TO service_role;

/** Zero out the balance when Premium access ends. History is preserved. */
CREATE OR REPLACE FUNCTION public.billing_expire_premium_credits(
  p_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
BEGIN
  v_balance := public.available_premium_credits(p_user_id);

  IF v_balance <= 0 THEN
    RETURN jsonb_build_object('status', 'noop', 'balance', v_balance);
  END IF;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, note)
  VALUES (p_user_id, -v_balance, 'expiry', p_note);

  RETURN jsonb_build_object('status', 'expired', 'expired', v_balance, 'balance', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.billing_expire_premium_credits(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_expire_premium_credits(UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Payment failure handling (service_role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_mark_payment_failed(
  p_user_id UUID,
  p_grace_period_ends_at TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."userSubscription"
  SET status = 'pastDue',
      "gracePeriodEndsAt" = p_grace_period_ends_at,
      "lastPaymentFailedAt" = now()
  WHERE "userId" = p_user_id
    AND status IN ('active', 'scheduledToCancel', 'scheduledToDowngrade', 'pastDue');

  RETURN jsonb_build_object(
    'status', 'ok',
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_mark_payment_failed(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_mark_payment_failed(UUID, TIMESTAMPTZ) TO service_role;

-- ---------------------------------------------------------------------------
-- Scheduled cancellation / downgrade (service_role only; called from edge)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_set_cancel_at_period_end(
  p_user_id UUID,
  p_cancel BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public."userSubscription"%ROWTYPE;
BEGIN
  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  UPDATE public."userSubscription"
  SET "cancelAtPeriodEnd" = coalesce(p_cancel, false),
      status = CASE
        WHEN coalesce(p_cancel, false) THEN 'scheduledToCancel'
        -- Resuming restores auto-renewal; an unresolved payment failure stays
        -- past due until Stripe reports a successful charge.
        WHEN v_sub.status = 'pastDue' THEN 'pastDue'
        ELSE 'active'
      END,
      "scheduledDowngradeTier" = NULL,
      "scheduledDowngradeEffectiveAt" = NULL
  WHERE "userId" = p_user_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'currentPeriodEnd', v_sub."currentPeriodEnd",
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_set_cancel_at_period_end(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_set_cancel_at_period_end(UUID, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.billing_schedule_downgrade(
  p_user_id UUID,
  p_target_tier TEXT,
  p_effective_at TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text := lower(btrim(coalesce(p_target_tier, '')));
BEGIN
  IF v_tier NOT IN ('free', 'pro') THEN
    RAISE EXCEPTION 'invalid_downgrade_tier';
  END IF;

  IF p_effective_at IS NULL THEN
    RAISE EXCEPTION 'effective_date_required';
  END IF;

  UPDATE public."userSubscription"
  SET "scheduledDowngradeTier" = v_tier,
      "scheduledDowngradeEffectiveAt" = p_effective_at,
      "cancelAtPeriodEnd" = false,
      status = 'scheduledToDowngrade'
  WHERE "userId" = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'effectiveAt', p_effective_at,
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_schedule_downgrade(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_schedule_downgrade(UUID, TEXT, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.billing_cancel_scheduled_downgrade(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."userSubscription"
  SET "scheduledDowngradeTier" = NULL,
      "scheduledDowngradeEffectiveAt" = NULL,
      status = 'active'
  WHERE "userId" = p_user_id
    AND "scheduledDowngradeTier" IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'noop');
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_cancel_scheduled_downgrade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_cancel_scheduled_downgrade(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Founding Member lifecycle (service_role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.billing_start_founding_member(
  p_user_id UUID,
  p_started_at TIMESTAMPTZ DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot integer;
BEGIN
  SELECT public.claim_founding_member_slot(p_user_id) INTO v_slot;
  IF v_slot IS NULL THEN
    RETURN jsonb_build_object('status', 'campaign_full');
  END IF;

  UPDATE public."userSubscription"
  SET "isFoundingMember" = true,
      "foundingStartedAt" = coalesce("foundingStartedAt", p_started_at),
      "foundingDiscountEndsAt" = coalesce(
        "foundingDiscountEndsAt",
        p_started_at + interval '12 months'
      ),
      "foundingDiscountForfeitedAt" = NULL
  WHERE "userId" = p_user_id;

  RETURN jsonb_build_object('status', 'ok', 'slotNumber', v_slot);
END;
$$;

REVOKE ALL ON FUNCTION public.billing_start_founding_member(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_start_founding_member(UUID, TIMESTAMPTZ) TO service_role;

/**
 * Upgrading to Premium permanently forfeits the Founding Member price, and the
 * campaign slot is released back to the pool.
 */
CREATE OR REPLACE FUNCTION public.billing_forfeit_founding_discount(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."userSubscription"
  SET "isFoundingMember" = false,
      "foundingDiscountForfeitedAt" = now(),
      "foundingDiscountEndsAt" = NULL
  WHERE "userId" = p_user_id;

  UPDATE public."foundingMemberSlot"
  SET "releasedAt" = now()
  WHERE "userId" = p_user_id AND "releasedAt" IS NULL;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.billing_forfeit_founding_discount(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_forfeit_founding_discount(UUID) TO service_role;

/** Discount window elapsed — the subscription continues as standard Pro. */
CREATE OR REPLACE FUNCTION public.billing_convert_founding_to_standard(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."userSubscription"
  SET "isFoundingMember" = false,
      "foundingDiscountEndsAt" = NULL
  WHERE "userId" = p_user_id;

  UPDATE public."foundingMemberSlot"
  SET "releasedAt" = now()
  WHERE "userId" = p_user_id AND "releasedAt" IS NULL;

  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.billing_convert_founding_to_standard(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_convert_founding_to_standard(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Lifecycle transitions (service_role only; driven by the daily cron)
-- ---------------------------------------------------------------------------

/** A scheduled cancellation or an exhausted grace period reached its end. */
CREATE OR REPLACE FUNCTION public.billing_expire_subscription(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public."userSubscription"
  SET status = 'inactive',
      "planTier" = 'free',
      "cancelAtPeriodEnd" = false,
      "scheduledDowngradeTier" = NULL,
      "scheduledDowngradeEffectiveAt" = NULL,
      "billingInterval" = NULL,
      "currentPeriodStart" = NULL,
      "currentPeriodEnd" = NULL,
      "gracePeriodEndsAt" = NULL,
      "stripeSubscriptionId" = NULL,
      "stripePriceId" = NULL
  WHERE "userId" = p_user_id;

  PERFORM public.billing_expire_premium_credits(
    p_user_id,
    'Subscription expired — unused credits are no longer available.'
  );

  RETURN jsonb_build_object('status', 'ok', 'effectiveTier', public.effective_user_tier(p_user_id));
END;
$$;

REVOKE ALL ON FUNCTION public.billing_expire_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_expire_subscription(UUID) TO service_role;

/** The scheduled downgrade date arrived: move the plan and drop credits. */
CREATE OR REPLACE FUNCTION public.billing_apply_scheduled_downgrade(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public."userSubscription"%ROWTYPE;
  v_target text;
BEGIN
  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_sub."scheduledDowngradeTier" IS NULL THEN
    RETURN jsonb_build_object('status', 'noop');
  END IF;

  v_target := v_sub."scheduledDowngradeTier";

  IF v_target = 'free' THEN
    RETURN public.billing_expire_subscription(p_user_id);
  END IF;

  UPDATE public."userSubscription"
  SET "planTier" = v_target,
      status = 'active',
      "scheduledDowngradeTier" = NULL,
      "scheduledDowngradeEffectiveAt" = NULL
  WHERE "userId" = p_user_id;

  -- Credits are not transferred to Pro and are permanently lost.
  PERFORM public.billing_expire_premium_credits(
    p_user_id,
    'Downgrade to Pro took effect — unused Premium credits expired.'
  );

  RETURN jsonb_build_object(
    'status', 'ok',
    'planTier', v_target,
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_apply_scheduled_downgrade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_apply_scheduled_downgrade(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Retire the demo billing stubs
-- ---------------------------------------------------------------------------

-- Returning to Free is only possible by cancelling; there is no plan-change
-- RPC any more. Checkout, cancel, resume, and downgrade run through the
-- `stripe-checkout` / `stripe-subscription` edge functions.
DROP FUNCTION IF EXISTS public.request_subscription_plan_change(text);
DROP FUNCTION IF EXISTS public.open_billing_portal();
DROP FUNCTION IF EXISTS public.list_billing_invoices();

-- Premium is a self-serve $79/month plan, not a "contact us" tier.
UPDATE public."subscriptionPlan"
SET price = 79,
    description = 'Everything in Pro plus 1:1 coaching credits and the full PuP 360 report.'
WHERE lower(coalesce("tierSlug", id)) = 'premium';
