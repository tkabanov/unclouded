-- Part B §14.2: HR must not SELECT clinical profile columns; workplace rows scoped to admin/HR.
-- Ops roster fields available via SECURITY DEFINER RPC (column-limited).

-- 1) Drop broad HR profile SELECT (was full-row for workplace members).
DROP POLICY IF EXISTS "HR selects workplace member profiles" ON public.profiles;

-- 2) Ops-only member list for HR/Admin (used by direct-report wiring UI).
CREATE OR REPLACE FUNCTION public.list_workplace_member_ops_profiles(p_workplace_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "enrollmentDate" TIMESTAMPTZ,
  "managesATeam" BOOLEAN,
  "isActive" BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_workplace_id IS NULL OR NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email::text,
    p."firstName"::text,
    p."lastName"::text,
    p."enrollmentDate",
    coalesce(p."managesATeam", false),
    coalesce(p."isActive", true)
  FROM public.profiles p
  WHERE p."workplaceId" = p_workplace_id
    AND p."accountType" = 'enterprise'
  ORDER BY p."firstName" ASC NULLS LAST, p.email ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.list_workplace_member_ops_profiles(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_workplace_member_ops_profiles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_workplace_member_ops_profiles(UUID) TO service_role;

-- 3) Narrow workplace SELECT: admin + primary/delegated HR only.
DROP POLICY IF EXISTS "Authenticated read workplace" ON public.workplace;
DROP POLICY IF EXISTS "Admin or HR read accessible workplaces" ON public.workplace;
CREATE POLICY "Admin or HR read accessible workplaces"
  ON public.workplace
  FOR SELECT TO authenticated
  USING (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact(id)
  );

-- Enrolled employees may read their own linked workplace (name/tier display).
DROP POLICY IF EXISTS "Members read own workplace" ON public.workplace;
CREATE POLICY "Members read own workplace"
  ON public.workplace
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p."workplaceId" = workplace.id
    )
  );
