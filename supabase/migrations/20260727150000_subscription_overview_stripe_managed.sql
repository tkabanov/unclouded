-- Expose whether Stripe manages the subscription so the UI can route Pro → Premium
-- through in-app proration vs checkout (legacy rows with planTier pro but no sub id).

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
        'hasPaymentMethodOnFile', (v_sub."stripeCustomerId" IS NOT NULL),
        'hasStripeSubscription', (v_sub."stripeSubscriptionId" IS NOT NULL)
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
