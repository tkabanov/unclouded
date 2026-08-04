-- Admin Account Set-Up: user Active/Deactivated + path enable/disable + admin read RLS.

-- ---------------------------------------------------------------------------
-- profiles: Active / Deactivated
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_is_active
  ON public.profiles ("isActive");

COMMENT ON COLUMN public.profiles."isActive" IS
  'Platform admin Active/Deactivated status. False blocks product use; ban is applied via admin-users edge.';

COMMENT ON COLUMN public.profiles."deactivatedAt" IS
  'When an admin last deactivated this account; null while active.';

-- Admin may update only active-status columns via SECURITY DEFINER RPC.
-- Direct authenticated UPDATE on other profile fields stays owner-scoped.

CREATE OR REPLACE FUNCTION public.admin_set_profile_active(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot deactivate own admin account' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND "roleType" = 'admin'
  ) THEN
    RAISE EXCEPTION 'cannot deactivate another admin account' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET
    "isActive" = p_is_active,
    "deactivatedAt" = CASE WHEN p_is_active THEN NULL ELSE now() END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_profile_active(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_active(UUID, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- path: enable / disable
-- ---------------------------------------------------------------------------

ALTER TABLE public.path
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_path_is_active
  ON public.path ("isActive");

COMMENT ON COLUMN public.path."isActive" IS
  'When false, path is hidden from consumer catalog/enrollment; still editable in admin.';

-- ---------------------------------------------------------------------------
-- Admin SELECT for user-detail aggregates
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Settings admin selects pathEnrollment" ON public."pathEnrollment";
CREATE POLICY "Settings admin selects pathEnrollment"
  ON public."pathEnrollment"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin selects journalEntry" ON public."journalEntry";
CREATE POLICY "Settings admin selects journalEntry"
  ON public."journalEntry"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin selects groupSessionBooking" ON public."groupSessionBooking";
CREATE POLICY "Settings admin selects groupSessionBooking"
  ON public."groupSessionBooking"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());
