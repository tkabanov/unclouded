-- OVR-038: Success Plans — Pro/Premium one-time add-on (unlock all 7) or HR assign.
-- Free self-enroll forbidden; Free + HR assignment allowed.

-- ---------------------------------------------------------------------------
-- Catalog badge: Success Plans are not free self-select
-- ---------------------------------------------------------------------------

UPDATE public.path
SET tier = 'pro'
WHERE lower(coalesce(btrim("subMode"), '')) = 'success_plan'
   OR position('path_type:success_plan' in coalesce("triggerSignals", '')) > 0;

-- ---------------------------------------------------------------------------
-- One-time add-on price catalog (Stripe sync writes stripePriceId)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."successPlanAddonPrice" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "lookupKey" TEXT NOT NULL UNIQUE DEFAULT 'unclouded_success_plan_addon',
  "stripePriceId" TEXT NULL,
  "amountCents" INTEGER NOT NULL DEFAULT 9700 CHECK ("amountCents" >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS success_plan_addon_price_updated_at ON public."successPlanAddonPrice";
CREATE TRIGGER success_plan_addon_price_updated_at
  BEFORE UPDATE ON public."successPlanAddonPrice"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public."successPlanAddonPrice" ("lookupKey", "amountCents", currency, "isActive")
VALUES ('unclouded_success_plan_addon', 9700, 'usd', true)
ON CONFLICT ("lookupKey") DO NOTHING;

ALTER TABLE public."successPlanAddonPrice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads success plan addon price" ON public."successPlanAddonPrice";
CREATE POLICY "Anyone reads success plan addon price"
  ON public."successPlanAddonPrice" FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Settings admin writes success plan addon price" ON public."successPlanAddonPrice";
CREATE POLICY "Settings admin writes success plan addon price"
  ON public."successPlanAddonPrice" FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

GRANT SELECT ON public."successPlanAddonPrice" TO authenticated;
GRANT ALL ON public."successPlanAddonPrice" TO service_role;

-- ---------------------------------------------------------------------------
-- User entitlement (one active purchase unlocks all Success Plans)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."successPlanAddon" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "stripeCheckoutSessionId" TEXT NULL,
  "stripePaymentIntentId" TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  "purchasedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "revokedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_success_plan_addon_checkout_session
  ON public."successPlanAddon" ("stripeCheckoutSessionId")
  WHERE "stripeCheckoutSessionId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_success_plan_addon_one_active_per_user
  ON public."successPlanAddon" ("userId")
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_success_plan_addon_user
  ON public."successPlanAddon" ("userId", status);

DROP TRIGGER IF EXISTS success_plan_addon_updated_at ON public."successPlanAddon";
CREATE TRIGGER success_plan_addon_updated_at
  BEFORE UPDATE ON public."successPlanAddon"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public."successPlanAddon" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own success plan addon" ON public."successPlanAddon";
CREATE POLICY "Owner reads own success plan addon"
  ON public."successPlanAddon" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

GRANT SELECT ON public."successPlanAddon" TO authenticated;
GRANT ALL ON public."successPlanAddon" TO service_role;

-- ---------------------------------------------------------------------------
-- Enrollment provenance (self / addon / hr_assign)
-- ---------------------------------------------------------------------------

ALTER TABLE public."pathEnrollment"
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS "assignedByWorkplaceId" UUID NULL REFERENCES public.workplace(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "assignedByUserId" UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."pathEnrollment"
  DROP CONSTRAINT IF EXISTS path_enrollment_source_check;

ALTER TABLE public."pathEnrollment"
  ADD CONSTRAINT path_enrollment_source_check
  CHECK (source IN ('self', 'addon', 'hr_assign'));

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.path_is_success_plan(p_path_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.path p
    WHERE p.id = p_path_id
      AND (
        lower(coalesce(btrim(p."subMode"), '')) = 'success_plan'
        OR position('path_type:success_plan' in coalesce(p."triggerSignals", '')) > 0
      )
  );
$$;

REVOKE ALL ON FUNCTION public.path_is_success_plan(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.path_is_success_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.path_is_success_plan(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.user_has_success_plan_addon(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."successPlanAddon" a
    WHERE a."userId" = p_user_id
      AND a.status = 'active'
  )
  AND public.tier_rank(public.effective_user_tier(p_user_id)) >= public.tier_rank('pro');
$$;

REVOKE ALL ON FUNCTION public.user_has_success_plan_addon(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_success_plan_addon(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.user_has_hr_success_plan_assignment(
  p_user_id UUID,
  p_path_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."pathEnrollment" pe
    WHERE pe."userId" = p_user_id
      AND pe."pathId" = p_path_id
      AND pe.source = 'hr_assign'
      AND pe.status IS DISTINCT FROM 'abandoned'
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_hr_success_plan_assignment(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_hr_success_plan_assignment(UUID, UUID) TO service_role;

/**
 * Unified path access: ordinary tier gate, or Success Plan rules (HR or add-on).
 */
CREATE OR REPLACE FUNCTION public.user_can_access_path(
  p_user_id UUID,
  p_path_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_user_id IS NULL OR p_path_id IS NULL THEN false
    WHEN public.path_is_success_plan(p_path_id) THEN
      public.user_has_hr_success_plan_assignment(p_user_id, p_path_id)
      OR public.user_has_success_plan_addon(p_user_id)
    ELSE
      public.tier_rank(public.effective_user_tier(p_user_id))
        >= public.tier_rank(coalesce(public.path_required_tier(p_path_id), 'free'))
  END;
$$;

REVOKE ALL ON FUNCTION public.user_can_access_path(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_path(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.my_can_access_path(p_path_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin()
    OR public.user_can_access_path(auth.uid(), p_path_id);
$$;

REVOKE ALL ON FUNCTION public.my_can_access_path(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_can_access_path(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_can_access_path(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.i_have_success_plan_addon()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_success_plan_addon(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.i_have_success_plan_addon() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.i_have_success_plan_addon() TO authenticated;

-- ---------------------------------------------------------------------------
-- Wire RLS to unified access
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.userCanAccessPathSession(session_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1
    FROM public."pathSession" ps
    WHERE ps.id = session_id
      AND public.user_can_access_path(auth.uid(), ps."pathId")
  );
$$;

CREATE OR REPLACE FUNCTION public.userCanAccessPathQuestion(question_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1
    FROM public."pathQuestion" pq
    JOIN public."pathSession" ps ON ps.id = pq."sessionId"
    WHERE pq.id = question_id
      AND public.user_can_access_path(auth.uid(), ps."pathId")
  );
$$;

DROP POLICY IF EXISTS "Owner with tier inserts pathEnrollment" ON public."pathEnrollment";
CREATE POLICY "Owner with path access inserts pathEnrollment" ON public."pathEnrollment"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND public.my_can_access_path("pathId")
    AND source IN ('self', 'addon')
    AND (
      (NOT public.path_is_success_plan("pathId") AND source = 'self')
      OR (public.path_is_success_plan("pathId") AND source = 'addon')
    )
  );

DROP POLICY IF EXISTS "Owner updates pathEnrollment with tier for progress"
  ON public."pathEnrollment";
CREATE POLICY "Owner updates pathEnrollment with path access for progress"
  ON public."pathEnrollment"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (
    public.userOwnsRow("userId")
    AND (
      public.my_can_access_path("pathId")
      OR status = 'abandoned'
    )
  );

DROP POLICY IF EXISTS "Owner with tier inserts pathResponse" ON public."pathResponse";
CREATE POLICY "Owner with path access inserts pathResponse" ON public."pathResponse"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND EXISTS (
      SELECT 1
      FROM public."pathSession" ps
      WHERE ps.id = "sessionId"
        AND public.my_can_access_path(ps."pathId")
    )
  );

-- ---------------------------------------------------------------------------
-- Subscription overview: expose Success Plan add-on status
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
  v_addon public."successPlanAddon"%ROWTYPE;
  v_addon_price public."successPlanAddonPrice"%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT * INTO v_sub FROM public."userSubscription" WHERE "userId" = v_user_id;

  SELECT * INTO v_addon
  FROM public."successPlanAddon"
  WHERE "userId" = v_user_id AND status = 'active'
  ORDER BY "purchasedAt" DESC
  LIMIT 1;

  SELECT * INTO v_addon_price
  FROM public."successPlanAddonPrice"
  WHERE "lookupKey" = 'unclouded_success_plan_addon'
  LIMIT 1;

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
    'foundingSlotsRemaining', public.founding_member_slots_remaining(),
    'successPlanAddon', jsonb_build_object(
      'active', (v_addon.id IS NOT NULL AND public.tier_rank(public.effective_user_tier(v_user_id)) >= public.tier_rank('pro')),
      'purchased', (v_addon.id IS NOT NULL),
      'purchasedAt', v_addon."purchasedAt",
      'amountCents', v_addon_price."amountCents",
      'currency', coalesce(v_addon_price.currency, 'usd')
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_subscription_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_subscription_overview() TO authenticated;
