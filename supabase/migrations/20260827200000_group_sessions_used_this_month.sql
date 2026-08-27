-- NCLDD-31 §8 / CL-1 / CL-6 / OVR-060 — group_sessions_used_this_month gate + cancel rules.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "groupSessionsUsedThisMonth" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_group_sessions_used_this_month_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_group_sessions_used_this_month_check
  CHECK ("groupSessionsUsedThisMonth" IN (0, 1));

COMMENT ON COLUMN public.profiles."groupSessionsUsedThisMonth" IS
  'CL-1 / OVR-060 monthly group gate (0 or 1). Docs alias: group_sessions_used_this_month.';

-- Backfill from active registered/offered enrollments in the current UTC month.
UPDATE public.profiles p
SET "groupSessionsUsedThisMonth" = 1
WHERE EXISTS (
  SELECT 1
  FROM public."groupSessionEnrollment" e
  WHERE e."userId" = p.id
    AND e.status IN ('registered', 'offered')
    AND e."periodMonth" = public.group_coaching_period_month(now())
);

CREATE OR REPLACE FUNCTION public.group_sessions_next_available_date_label(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(
    (date_trunc('month', (p_as_of AT TIME ZONE 'UTC')) + interval '1 month')::date,
    'FMMonth FMDD, YYYY'
  );
$$;

CREATE OR REPLACE FUNCTION public.group_sessions_monthly_limit_message(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT format(
    'You''ve used your included group session for this month. Your next session is available on %s.',
    public.group_sessions_next_available_date_label(p_as_of)
  );
$$;

CREATE OR REPLACE FUNCTION public.reset_group_sessions_used_this_month(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Only on the 1st UTC (G10 / OVR-060).
  IF EXTRACT(DAY FROM (p_as_of AT TIME ZONE 'UTC'))::integer <> 1 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_first_of_month_utc');
  END IF;

  UPDATE public.profiles
  SET "groupSessionsUsedThisMonth" = 0
  WHERE "groupSessionsUsedThisMonth" <> 0;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'skipped', false, 'resetCount', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_group_sessions_used_this_month(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_group_sessions_used_this_month(TIMESTAMPTZ) TO service_role;

-- Promote: skip users with counter = 1 (G6) in addition to period-index skip.
CREATE OR REPLACE FUNCTION public.promote_next_group_waitlist(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public."groupCoachingSession"%ROWTYPE;
  v_registered integer;
  v_next public."groupSessionEnrollment"%ROWTYPE;
  v_used integer;
BEGIN
  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status <> 'scheduled' THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment"
    WHERE "sessionId" = p_session_id AND status = 'offered'
  ) THEN
    RETURN NULL;
  END IF;

  v_registered := public.group_session_registered_count(p_session_id);
  IF v_registered >= v_session.capacity THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_next
  FROM public."groupSessionEnrollment"
  WHERE "sessionId" = p_session_id AND status = 'waitlisted'
  ORDER BY "waitlistedAt" ASC NULLS LAST, "createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(p."groupSessionsUsedThisMonth", 0) INTO v_used
  FROM public.profiles p
  WHERE p.id = v_next."userId";

  IF COALESCE(v_used, 0) >= 1 THEN
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now()
    WHERE id = v_next.id;
    RETURN public.promote_next_group_waitlist(p_session_id);
  END IF;

  -- Skip if user already has a monthly registered/offered elsewhere (OVR-028).
  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment" e
    WHERE e."userId" = v_next."userId"
      AND e."periodMonth" = v_next."periodMonth"
      AND e.id <> v_next.id
      AND e.status IN ('registered', 'offered')
  ) THEN
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now()
    WHERE id = v_next.id;
    RETURN public.promote_next_group_waitlist(p_session_id);
  END IF;

  UPDATE public."groupSessionEnrollment"
  SET status = 'offered',
      "claimExpiresAt" = now() + interval '24 hours',
      "offerNotifiedAt" = NULL
  WHERE id = v_next.id;

  RETURN v_next.id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_next_group_waitlist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_next_group_waitlist(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.join_group_coaching_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text;
  v_session public."groupCoachingSession"%ROWTYPE;
  v_registered integer;
  v_period text;
  v_status text;
  v_used integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_tier := public.effective_user_tier(v_user_id);
  IF v_tier NOT IN ('pro', 'premium') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'upgrade_required',
      'error', 'Group coaching is available on Pro and Premium.'
    );
  END IF;

  SELECT COALESCE("groupSessionsUsedThisMonth", 0) INTO v_used
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF COALESCE(v_used, 0) >= 1 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'monthly_limit_reached',
      'error', public.group_sessions_monthly_limit_message(now())
    );
  END IF;

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status <> 'scheduled' OR v_session."startsAt" <= now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'session_unavailable',
      'error', 'That group session is not available.'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment"
    WHERE "sessionId" = p_session_id
      AND "userId" = v_user_id
      AND status IN ('registered', 'waitlisted', 'offered')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_joined',
      'error', 'You are already on this session.'
    );
  END IF;

  v_period := public.group_coaching_period_month(v_session."startsAt");

  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment"
    WHERE "userId" = v_user_id
      AND "periodMonth" = v_period
      AND status IN ('registered', 'offered')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'monthly_limit_reached',
      'error', public.group_sessions_monthly_limit_message(now())
    );
  END IF;

  v_registered := public.group_session_registered_count(p_session_id);

  IF v_registered < v_session.capacity THEN
    v_status := 'registered';
    INSERT INTO public."groupSessionEnrollment" (
      "sessionId", "userId", status, "periodMonth", "registeredAt"
    )
    VALUES (p_session_id, v_user_id, 'registered', v_period, now());

    UPDATE public.profiles
    SET "groupSessionsUsedThisMonth" = 1
    WHERE id = v_user_id;
  ELSE
    v_status := 'waitlisted';
    INSERT INTO public."groupSessionEnrollment" (
      "sessionId", "userId", status, "periodMonth", "waitlistedAt"
    )
    VALUES (p_session_id, v_user_id, 'waitlisted', v_period, now());
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', v_status,
    'sessionId', p_session_id,
    'periodMonth', v_period
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_group_coaching_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_group_coaching_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_group_coaching_enrollment(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_enrollment public."groupSessionEnrollment"%ROWTYPE;
  v_session public."groupCoachingSession"%ROWTYPE;
  v_was_registered boolean := false;
  v_consumed_month boolean := false;
  v_promoted uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_enrollment
  FROM public."groupSessionEnrollment"
  WHERE "sessionId" = p_session_id
    AND "userId" = v_user_id
    AND status IN ('registered', 'waitlisted', 'offered')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_enrolled');
  END IF;

  v_was_registered := v_enrollment.status = 'registered';
  v_consumed_month := v_enrollment.status IN ('registered', 'offered');

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id;

  UPDATE public."groupSessionEnrollment"
  SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
  WHERE id = v_enrollment.id;

  -- CL-6: ≥24h before start → reset counter; <24h → keep used (1).
  IF v_consumed_month AND v_session."startsAt" IS NOT NULL THEN
    IF v_session."startsAt" >= now() + interval '24 hours' THEN
      UPDATE public.profiles
      SET "groupSessionsUsedThisMonth" = 0
      WHERE id = v_user_id;
    END IF;
  END IF;

  v_promoted := NULL;
  IF v_was_registered THEN
    v_promoted := public.promote_next_group_waitlist(p_session_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', p_session_id,
    'promotedEnrollmentId', v_promoted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_group_coaching_enrollment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_group_coaching_enrollment(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_group_coaching_offer(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public."groupCoachingSession"%ROWTYPE;
  v_enrollment public."groupSessionEnrollment"%ROWTYPE;
  v_registered integer;
  v_used integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('group_claim'),
    hashtext(p_session_id::text)
  );

  SELECT COALESCE("groupSessionsUsedThisMonth", 0) INTO v_used
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF COALESCE(v_used, 0) >= 1 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'monthly_limit_reached',
      'error', public.group_sessions_monthly_limit_message(now())
    );
  END IF;

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status <> 'scheduled' OR v_session."startsAt" <= now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'session_unavailable',
      'error', 'That group session is not available.'
    );
  END IF;

  SELECT * INTO v_enrollment
  FROM public."groupSessionEnrollment"
  WHERE "sessionId" = p_session_id
    AND "userId" = v_user_id
    AND status = 'offered'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'no_offer',
      'error', 'No open offer to claim for this session.'
    );
  END IF;

  IF v_enrollment."claimExpiresAt" IS NULL OR v_enrollment."claimExpiresAt" <= now() THEN
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
    WHERE id = v_enrollment.id;
    PERFORM public.promote_next_group_waitlist(p_session_id);
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'offer_expired',
      'error', 'Your claim window expired.'
    );
  END IF;

  v_registered := public.group_session_registered_count(p_session_id);
  IF v_registered >= v_session.capacity THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'session_full',
      'error', 'That spot was just taken.'
    );
  END IF;

  UPDATE public."groupSessionEnrollment"
  SET status = 'registered',
      "registeredAt" = now(),
      "claimExpiresAt" = NULL
  WHERE id = v_enrollment.id;

  UPDATE public.profiles
  SET "groupSessionsUsedThisMonth" = 1
  WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'status', 'registered', 'sessionId', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_group_coaching_offer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_group_coaching_offer(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_cancel_group_coaching_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public."groupCoachingSession"%ROWTYPE;
  v_notify jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', e."userId",
        'email', p.email,
        'firstName', p."firstName",
        'timeZone', p."timeZone",
        'enrollmentStatus', e.status
      )
      ORDER BY e."createdAt"
    ),
    '[]'::jsonb
  )
  INTO v_notify
  FROM public."groupSessionEnrollment" e
  LEFT JOIN public.profiles p ON p.id = e."userId"
  WHERE e."sessionId" = p_session_id
    AND e.status IN ('registered', 'waitlisted', 'offered');

  -- Reset monthly counter for users who held a seat / offer (CL-6).
  UPDATE public.profiles p
  SET "groupSessionsUsedThisMonth" = 0
  WHERE p.id IN (
    SELECT e."userId"
    FROM public."groupSessionEnrollment" e
    WHERE e."sessionId" = p_session_id
      AND e.status IN ('registered', 'offered')
  );

  UPDATE public."groupCoachingSession"
  SET status = 'cancelled', "cancelledAt" = now()
  WHERE id = p_session_id;

  UPDATE public."groupSessionEnrollment"
  SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
  WHERE "sessionId" = p_session_id
    AND status IN ('registered', 'waitlisted', 'offered');

  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', p_session_id,
    'title', v_session.title,
    'startsAt', v_session."startsAt",
    'durationMinutes', v_session."durationMinutes",
    'notifyMembers', v_notify
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_group_coaching_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_group_coaching_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_group_coaching_session(UUID) TO service_role;
