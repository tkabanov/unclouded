-- Service-role helper so QA seed can actually clear enterprise entitlement.
-- Direct PostgREST updates of accountType / enterpriseTier are silently reverted
-- by profiles_protect_entitlement_columns unless app.enterprise_sync is set.

CREATE OR REPLACE FUNCTION public.service_reset_to_individual_free(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workplace uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  SELECT "workplaceId" INTO v_workplace
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_workplace IS NOT NULL THEN
    DELETE FROM public."managerDirectReport" mdr
    WHERE mdr."workplaceId" = v_workplace
      AND (mdr."managerUserId" = p_user_id OR mdr."reportUserId" = p_user_id);

    DELETE FROM public."workplaceMemberRole" r
    WHERE r."workplaceId" = v_workplace
      AND r."userId" = p_user_id;
  END IF;

  PERFORM set_config('app.enterprise_sync', 'true', true);
  PERFORM set_config('app.billing_sync', 'true', true);

  UPDATE public.profiles
  SET "accountType" = 'individual',
      "workplaceId" = NULL,
      "enterpriseTier" = NULL,
      "enrollmentDate" = NULL,
      subscribed = false,
      tier = 'free',
      "managesATeam" = false
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'userId', p_user_id,
    'effectiveTier', public.effective_user_tier(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_reset_to_individual_free(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.service_reset_to_individual_free(UUID) TO service_role;

COMMENT ON FUNCTION public.service_reset_to_individual_free(UUID) IS
  'QA/seed only: clear workplace membership and force individual Free entitlement.';
