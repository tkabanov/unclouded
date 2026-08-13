-- Part C §31: on HR revoke, restore prior personal entitlement from an
-- existing Stripe-backed userSubscription when it still grants access;
-- otherwise fall back to Free. Does not create a new Stripe subscription.

CREATE OR REPLACE FUNCTION public.unassign_workplace_member(
  p_workplace_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public."userSubscription"%ROWTYPE;
  v_restore_tier text := 'free';
  v_restore_subscribed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p."workplaceId" = p_workplace_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is not a member of this workplace.', 'status', 404);
  END IF;

  DELETE FROM public."managerDirectReport" mdr
  WHERE mdr."workplaceId" = p_workplace_id
    AND (mdr."managerUserId" = p_target_user_id OR mdr."reportUserId" = p_target_user_id);

  DELETE FROM public."workplaceMemberRole" r
  WHERE r."workplaceId" = p_workplace_id
    AND r."userId" = p_target_user_id;

  SELECT * INTO v_sub
  FROM public."userSubscription" s
  WHERE s."userId" = p_target_user_id;

  IF FOUND THEN
    v_restore_tier := public.subscription_effective_tier(
      v_sub.status,
      v_sub."planTier",
      v_sub."currentPeriodEnd",
      v_sub."scheduledDowngradeTier",
      v_sub."scheduledDowngradeEffectiveAt",
      v_sub."gracePeriodEndsAt"
    );
    IF lower(coalesce(v_restore_tier, 'free')) IN ('pro', 'premium') THEN
      v_restore_subscribed := true;
      v_restore_tier := lower(v_restore_tier);
    ELSE
      v_restore_tier := 'free';
      v_restore_subscribed := false;
    END IF;
  END IF;

  PERFORM set_config('app.enterprise_sync', 'true', true);

  UPDATE public.profiles
  SET "accountType" = 'individual',
      "workplaceId" = NULL,
      "enterpriseTier" = NULL,
      "enrollmentDate" = NULL,
      subscribed = v_restore_subscribed,
      tier = v_restore_tier,
      "managesATeam" = false
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'restoredTier', v_restore_tier,
    'restoredSubscribed', v_restore_subscribed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.unassign_workplace_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unassign_workplace_member(UUID, UUID) TO authenticated;
