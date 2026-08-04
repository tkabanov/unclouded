/**
 * SUB-FM-009 / cancel dialog: after a Founding Member subscription expires,
 * the $19 offer is permanently forfeited (slot released, flags cleared).
 * Resume before expiry still keeps the discount — forfeit runs only on expire
 * (or when Stripe sync lands on inactive after the subscription is gone).
 *
 * Also refuse re-enrollment once foundingDiscountForfeitedAt is set so a later
 * Free→Pro checkout cannot reclaim $19 (SUB-FM-007 / SUB-FM-009).
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
  v_was_founding boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  INSERT INTO public."userSubscription" ("userId")
  VALUES (p_user_id)
  ON CONFLICT ("userId") DO NOTHING;

  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = p_user_id FOR UPDATE;
  v_was_founding := coalesce(v_sub."isFoundingMember", false);

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

  -- Subscription fully ended in Stripe (deleted / inactive): FM cannot return.
  -- Scheduled-to-cancel stays founding until billing_expire_subscription runs.
  IF v_was_founding AND lower(v_status) = 'inactive' THEN
    PERFORM public.billing_forfeit_founding_discount(p_user_id);
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
  v_forfeited_at timestamptz;
BEGIN
  SELECT "foundingDiscountForfeitedAt" INTO v_forfeited_at
  FROM public."userSubscription"
  WHERE "userId" = p_user_id;

  IF v_forfeited_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'forfeited');
  END IF;

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

CREATE OR REPLACE FUNCTION public.billing_expire_subscription(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_founding boolean := false;
BEGIN
  SELECT coalesce("isFoundingMember", false) INTO v_was_founding
  FROM public."userSubscription"
  WHERE "userId" = p_user_id;

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

  -- Cancel→expiry (and grace close): FM price cannot be restored.
  IF v_was_founding THEN
    PERFORM public.billing_forfeit_founding_discount(p_user_id);
  END IF;

  PERFORM public.billing_expire_premium_credits(
    p_user_id,
    'Subscription expired — unused credits are no longer available.'
  );

  RETURN jsonb_build_object('status', 'ok', 'effectiveTier', public.effective_user_tier(p_user_id));
END;
$$;

REVOKE ALL ON FUNCTION public.billing_expire_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_expire_subscription(UUID) TO service_role;
