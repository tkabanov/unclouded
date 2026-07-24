-- Workplace email invitations — admin/HR can invite not-yet-registered users.

CREATE TABLE IF NOT EXISTS public."workplaceInvitation" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workplaceId" UUID NOT NULL REFERENCES public.workplace(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  "invitedByUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled')),
  "grantHr" BOOLEAN NOT NULL DEFAULT false,
  "grantManager" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "acceptedAt" TIMESTAMPTZ NULL,
  "cancelledAt" TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workplace_invitation_pending_email
  ON public."workplaceInvitation" ("workplaceId", lower(btrim(email)))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_workplace_invitation_workplace_status
  ON public."workplaceInvitation" ("workplaceId", status, "createdAt" DESC);

ALTER TABLE public."workplaceInvitation" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public."workplaceInvitation" TO authenticated;
GRANT ALL ON public."workplaceInvitation" TO service_role;

DROP POLICY IF EXISTS "Admin or HR read workplace invitations" ON public."workplaceInvitation";
CREATE POLICY "Admin or HR read workplace invitations"
  ON public."workplaceInvitation"
  FOR SELECT TO authenticated
  USING (public.can_manage_workplace_members("workplaceId"));

DROP POLICY IF EXISTS "Admin or HR manage workplace invitations" ON public."workplaceInvitation";
CREATE POLICY "Admin or HR manage workplace invitations"
  ON public."workplaceInvitation"
  FOR ALL TO authenticated
  USING (public.can_manage_workplace_members("workplaceId"))
  WITH CHECK (public.can_manage_workplace_members("workplaceId"));

CREATE OR REPLACE FUNCTION public.enroll_profile_in_workplace(
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
    RETURN jsonb_build_object('ok', false, 'error', 'Organization seats are full.', 'status', 409);
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

CREATE OR REPLACE FUNCTION public.assign_workplace_member_to_workplace(
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

  RETURN public.enroll_profile_in_workplace(p_workplace_id, p_target_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_pending_workplace_invitations(
  p_user_id UUID,
  p_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public."workplaceInvitation"%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_user_id IS NULL OR btrim(coalesce(p_email, '')) = '' THEN
    RETURN;
  END IF;

  FOR v_invitation IN
    SELECT *
    FROM public."workplaceInvitation" i
    WHERE i.status = 'pending'
      AND lower(btrim(i.email)) = lower(btrim(p_email))
    ORDER BY i."createdAt" ASC
  LOOP
    v_result := public.enroll_profile_in_workplace(v_invitation."workplaceId", p_user_id);
    IF coalesce(v_result->>'ok', 'false') <> 'true' THEN
      CONTINUE;
    END IF;

    IF v_invitation."grantHr" THEN
      INSERT INTO public."workplaceMemberRole" ("workplaceId", "userId", role)
      VALUES (v_invitation."workplaceId", p_user_id, 'hr')
      ON CONFLICT ("workplaceId", "userId", role) DO NOTHING;
    END IF;

    IF v_invitation."grantManager" THEN
      INSERT INTO public."workplaceMemberRole" ("workplaceId", "userId", role)
      VALUES (v_invitation."workplaceId", p_user_id, 'manager')
      ON CONFLICT ("workplaceId", "userId", role) DO NOTHING;

      UPDATE public.profiles
      SET "managesATeam" = true
      WHERE id = p_user_id;
    END IF;

    UPDATE public."workplaceInvitation"
    SET status = 'accepted',
        "acceptedAt" = now()
    WHERE id = v_invitation.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
  v_referred_code TEXT;
  v_referrer_id UUID;
  v_utm_source TEXT;
  v_utm_medium TEXT;
  v_utm_campaign TEXT;
  v_signup_plan TEXT;
BEGIN
  v_time_zone := COALESCE(
    NEW.raw_user_meta_data ->> 'time_zone',
    NEW.raw_user_meta_data ->> 'timezone'
  );

  v_referred_code := NULLIF(UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code')), '');
  v_referrer_id := NULL;

  IF v_referred_code IS NOT NULL THEN
    SELECT referrer.id
    INTO v_referrer_id
    FROM public.profiles AS referrer
    WHERE referrer."referralCode" = v_referred_code;

    IF v_referrer_id IS NULL THEN
      v_referred_code := NULL;
    END IF;
  END IF;

  v_utm_source := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_source'), 128), '');
  v_utm_medium := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_medium'), 128), '');
  v_utm_campaign := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_campaign'), 128), '');

  v_signup_plan := lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'signup_plan', '')));
  IF v_signup_plan <> 'founding' THEN
    v_signup_plan := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    "firstName",
    "lastName",
    "timeZone",
    "referredByUserId",
    "referredByReferralCode",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "signupPlan"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NULLIF(TRIM(v_time_zone), ''),
    v_referrer_id,
    v_referred_code,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_signup_plan
  );

  PERFORM public.apply_pending_workplace_invitations(NEW.id, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  v_normalized_email text := lower(btrim(coalesce(p_email, '')));
  v_invitation_id uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_normalized_email = '' OR position('@' in v_normalized_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a valid email address.', 'status', 400);
  END IF;

  SELECT p.id
  INTO v_target_user_id
  FROM public.profiles p
  WHERE lower(btrim(coalesce(p.email, ''))) = v_normalized_email
  LIMIT 1;

  IF v_target_user_id IS NOT NULL THEN
    v_result := public.enroll_profile_in_workplace(p_workplace_id, v_target_user_id);
    IF coalesce(v_result->>'ok', 'false') <> 'true' THEN
      RETURN v_result;
    END IF;
    RETURN v_result || jsonb_build_object('mode', 'assigned');
  END IF;

  UPDATE public."workplaceInvitation"
  SET status = 'cancelled',
      "cancelledAt" = now()
  WHERE "workplaceId" = p_workplace_id
    AND lower(btrim(email)) = v_normalized_email
    AND status = 'pending';

  INSERT INTO public."workplaceInvitation" (
    "workplaceId",
    email,
    "invitedByUserId",
    status
  )
  VALUES (
    p_workplace_id,
    v_normalized_email,
    auth.uid(),
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'invited',
    'invitationId', v_invitation_id,
    'email', v_normalized_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_workplace_invitation(
  p_workplace_id UUID,
  p_invitation_id UUID
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

  UPDATE public."workplaceInvitation"
  SET status = 'cancelled',
      "cancelledAt" = now()
  WHERE id = p_invitation_id
    AND "workplaceId" = p_workplace_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invitation not found.', 'status', 404);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.enroll_profile_in_workplace(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_pending_workplace_invitations(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_workplace_invitation(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.enroll_profile_in_workplace(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_pending_workplace_invitations(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_workplace_invitation(UUID, UUID) TO authenticated;
