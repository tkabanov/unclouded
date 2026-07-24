-- Workplace roster management — admin + HR assign members and delegate HR/manager roles.

CREATE TABLE IF NOT EXISTS public."workplaceMemberRole" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workplaceId" UUID NOT NULL REFERENCES public.workplace(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hr', 'manager')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workplace_member_role_unique UNIQUE ("workplaceId", "userId", role)
);

CREATE INDEX IF NOT EXISTS idx_workplace_member_role_workplace
  ON public."workplaceMemberRole" ("workplaceId", role);

CREATE INDEX IF NOT EXISTS idx_workplace_member_role_user
  ON public."workplaceMemberRole" ("userId");

ALTER TABLE public."workplaceMemberRole" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public."workplaceMemberRole" TO authenticated;
GRANT ALL ON public."workplaceMemberRole" TO service_role;

CREATE OR REPLACE FUNCTION public.is_workplace_hr_contact(p_workplace_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workplace w
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE w.id = p_workplace_id
      AND lower(btrim(coalesce(p.email, ''))) = lower(btrim(coalesce(w."contactEmail", '')))
      AND btrim(coalesce(w."contactEmail", '')) <> ''
  )
  OR EXISTS (
    SELECT 1
    FROM public."workplaceMemberRole" r
    WHERE r."workplaceId" = p_workplace_id
      AND r."userId" = auth.uid()
      AND r.role = 'hr'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workplace_members(p_workplace_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin()
    OR public.is_workplace_hr_contact(p_workplace_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_workplace_members(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admin or HR read workplace member roles" ON public."workplaceMemberRole";
CREATE POLICY "Admin or HR read workplace member roles"
  ON public."workplaceMemberRole"
  FOR SELECT TO authenticated
  USING (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
    OR public.userOwnsRow("userId")
  );

DROP POLICY IF EXISTS "Admin or HR manage workplace member roles" ON public."workplaceMemberRole";
CREATE POLICY "Admin or HR manage workplace member roles"
  ON public."workplaceMemberRole"
  FOR ALL TO authenticated
  USING (public.can_manage_workplace_members("workplaceId"))
  WITH CHECK (public.can_manage_workplace_members("workplaceId"));

DROP POLICY IF EXISTS "HR selects workplace member profiles" ON public.profiles;
CREATE POLICY "HR selects workplace member profiles"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (
    "workplaceId" IS NOT NULL
    AND public.is_workplace_hr_contact("workplaceId")
  );

DROP POLICY IF EXISTS "Settings admin manages managerDirectReport" ON public."managerDirectReport";
CREATE POLICY "Admin or HR manages managerDirectReport"
  ON public."managerDirectReport"
  FOR ALL TO authenticated
  USING (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  )
  WITH CHECK (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  );

GRANT INSERT, UPDATE, DELETE ON public."managerDirectReport" TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_workplace_member_to_workplace(
  p_workplace_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workplace public.workplace%ROWTYPE;
  v_active_seats integer;
  v_tier text;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is required.', 'status', 400);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found.', 'status', 404);
  END IF;

  SELECT w.*
  INTO v_workplace
  FROM public.workplace w
  WHERE w.id = p_workplace_id
  FOR UPDATE;

  IF NOT FOUND OR v_workplace."isActive" IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractStartDate" IS NOT NULL AND v_workplace."contractStartDate" > v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractEndDate" IS NOT NULL AND v_workplace."contractEndDate" < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" IS NOT NULL
      AND p."workplaceId" <> p_workplace_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is already enrolled with another organization.', 'status', 409);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" = p_workplace_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'alreadyEnrolled', true, 'workplaceId', p_workplace_id);
  END IF;

  SELECT public.count_workplace_active_seats(p_workplace_id) INTO v_active_seats;

  IF v_workplace."seatCount" > 0 AND v_active_seats >= v_workplace."seatCount" THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Organization seats are full.',
      'status', 409
    );
  END IF;

  v_tier := CASE
    WHEN lower(coalesce(v_workplace."contractTier", 'pro')) = 'premium' THEN 'premium'
    ELSE 'pro'
  END;

  PERFORM set_config('app.enterprise_sync', 'true', true);

  UPDATE public.profiles
  SET "accountType" = 'enterprise',
      "workplaceId" = p_workplace_id,
      "enterpriseTier" = v_tier,
      "enrollmentDate" = coalesce("enrollmentDate", now()),
      subscribed = true,
      tier = v_tier
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyEnrolled', false,
    'workplaceId', p_workplace_id,
    'enterpriseTier', v_tier
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_workplace_member_by_email(
  p_workplace_id UUID,
  p_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
BEGIN
  SELECT p.id
  INTO v_target_user_id
  FROM public.profiles p
  WHERE lower(btrim(coalesce(p.email, ''))) = lower(btrim(coalesce(p_email, '')))
  LIMIT 1;

  IF v_target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'No account found for that email. The person must sign up first.',
      'status', 404
    );
  END IF;

  RETURN public.assign_workplace_member_to_workplace(p_workplace_id, v_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.unassign_workplace_member(
  p_workplace_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  PERFORM set_config('app.enterprise_sync', 'true', true);

  UPDATE public.profiles
  SET "accountType" = 'individual',
      "workplaceId" = NULL,
      "enterpriseTier" = NULL,
      "enrollmentDate" = NULL,
      subscribed = false,
      tier = 'free',
      "managesATeam" = false
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_workplace_member_role(
  p_workplace_id UUID,
  p_target_user_id UUID,
  p_role TEXT,
  p_enabled BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := lower(btrim(coalesce(p_role, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_role NOT IN ('hr', 'manager') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid role.', 'status', 400);
  END IF;

  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is required.', 'status', 400);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p."workplaceId" = p_workplace_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'User must belong to this workplace before roles can be assigned.',
      'status', 400
    );
  END IF;

  IF p_enabled THEN
    INSERT INTO public."workplaceMemberRole" ("workplaceId", "userId", role)
    VALUES (p_workplace_id, p_target_user_id, v_role)
    ON CONFLICT ("workplaceId", "userId", role) DO NOTHING;

    IF v_role = 'manager' THEN
      UPDATE public.profiles
      SET "managesATeam" = true
      WHERE id = p_target_user_id;
    END IF;
  ELSE
    DELETE FROM public."workplaceMemberRole" r
    WHERE r."workplaceId" = p_workplace_id
      AND r."userId" = p_target_user_id
      AND r.role = v_role;

    IF v_role = 'manager' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public."workplaceMemberRole" r
        WHERE r."userId" = p_target_user_id
          AND r.role = 'manager'
      ) THEN
        UPDATE public.profiles
        SET "managesATeam" = false
        WHERE id = p_target_user_id;
      END IF;

      DELETE FROM public."managerDirectReport" mdr
      WHERE mdr."workplaceId" = p_workplace_id
        AND mdr."managerUserId" = p_target_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'role', v_role, 'enabled', p_enabled);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_workplace_member_to_workplace(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_workplace_member_by_email(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unassign_workplace_member(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_workplace_member_role(UUID, UUID, TEXT, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.assign_workplace_member_to_workplace(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_workplace_member_by_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unassign_workplace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_workplace_member_role(UUID, UUID, TEXT, BOOLEAN) TO authenticated;
