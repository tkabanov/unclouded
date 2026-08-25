-- NCLDD-31 §8 / §9 — Group coaching session catalog + FIFO waitlist (24h claim).

CREATE TABLE IF NOT EXISTS public."groupCoachingSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seriesId" UUID NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  "startsAt" TIMESTAMPTZ NOT NULL,
  "durationMinutes" INT NOT NULL DEFAULT 60
    CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 240),
  capacity INT NOT NULL CHECK (capacity > 0 AND capacity <= 500),
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  "meetLink" TEXT NULL,
  "googleEventId" TEXT NULL,
  "cancelledAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_coaching_session_starts
  ON public."groupCoachingSession" ("startsAt")
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_group_coaching_session_series
  ON public."groupCoachingSession" ("seriesId")
  WHERE "seriesId" IS NOT NULL;

DROP TRIGGER IF EXISTS update_group_coaching_session_updated_at ON public."groupCoachingSession";
CREATE TRIGGER update_group_coaching_session_updated_at
  BEFORE UPDATE ON public."groupCoachingSession"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public."groupCoachingSession" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated reads scheduled group sessions" ON public."groupCoachingSession";
CREATE POLICY "Authenticated reads scheduled group sessions"
  ON public."groupCoachingSession" FOR SELECT TO authenticated
  USING (status = 'scheduled' OR public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin manages group sessions" ON public."groupCoachingSession";
CREATE POLICY "Settings admin manages group sessions"
  ON public."groupCoachingSession" FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

GRANT SELECT ON public."groupCoachingSession" TO authenticated;
GRANT ALL ON public."groupCoachingSession" TO service_role;

CREATE TABLE IF NOT EXISTS public."groupSessionEnrollment" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId" UUID NOT NULL REFERENCES public."groupCoachingSession"(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL
    CHECK (status IN ('registered', 'waitlisted', 'offered', 'cancelled')),
  "periodMonth" TEXT NOT NULL,
  "waitlistedAt" TIMESTAMPTZ NULL,
  "registeredAt" TIMESTAMPTZ NULL,
  "claimExpiresAt" TIMESTAMPTZ NULL,
  "cancelledAt" TIMESTAMPTZ NULL,
  "offerNotifiedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_enrollment_session_user_active
  ON public."groupSessionEnrollment" ("sessionId", "userId")
  WHERE status IN ('registered', 'waitlisted', 'offered');

-- OVR-028: one active group join (registered or offered) per calendar month.
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_enrollment_user_month_active
  ON public."groupSessionEnrollment" ("userId", "periodMonth")
  WHERE status IN ('registered', 'offered');

CREATE INDEX IF NOT EXISTS idx_group_enrollment_session_status
  ON public."groupSessionEnrollment" ("sessionId", status, "waitlistedAt");

CREATE INDEX IF NOT EXISTS idx_group_enrollment_offer_expiry
  ON public."groupSessionEnrollment" ("claimExpiresAt")
  WHERE status = 'offered' AND "claimExpiresAt" IS NOT NULL;

DROP TRIGGER IF EXISTS update_group_session_enrollment_updated_at ON public."groupSessionEnrollment";
CREATE TRIGGER update_group_session_enrollment_updated_at
  BEFORE UPDATE ON public."groupSessionEnrollment"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public."groupSessionEnrollment" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own group enrollments" ON public."groupSessionEnrollment";
CREATE POLICY "Owner reads own group enrollments"
  ON public."groupSessionEnrollment" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin reads all group enrollments" ON public."groupSessionEnrollment";
CREATE POLICY "Settings admin reads all group enrollments"
  ON public."groupSessionEnrollment" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

GRANT SELECT ON public."groupSessionEnrollment" TO authenticated;
GRANT ALL ON public."groupSessionEnrollment" TO service_role;

CREATE OR REPLACE FUNCTION public.group_coaching_period_month(p_at TIMESTAMPTZ DEFAULT now())
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT to_char((p_at AT TIME ZONE 'UTC'), 'YYYY-MM');
$$;

CREATE OR REPLACE FUNCTION public.group_session_registered_count(p_session_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public."groupSessionEnrollment"
  WHERE "sessionId" = p_session_id AND status = 'registered';
$$;

/**
 * Promote the next waitlisted user to offered (24h claim). Returns enrollment id or null.
 */
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

CREATE OR REPLACE FUNCTION public.admin_create_group_coaching_sessions(
  p_title TEXT,
  p_description TEXT,
  p_starts_at TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 60,
  p_capacity INT DEFAULT 20,
  p_recurrence_weeks INT DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_desc text;
  v_weeks int;
  v_series uuid;
  v_i int;
  v_start timestamptz;
  v_id uuid;
  v_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_title := btrim(COALESCE(p_title, ''));
  IF v_title = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'title_required', 'error', 'Title is required.');
  END IF;

  IF p_starts_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'starts_required', 'error', 'Start time is required.');
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 OR p_duration_minutes > 240 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_duration', 'error', 'Duration must be 1–240 minutes.');
  END IF;

  IF p_capacity IS NULL OR p_capacity <= 0 OR p_capacity > 500 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_capacity', 'error', 'Capacity must be 1–500.');
  END IF;

  v_weeks := LEAST(GREATEST(COALESCE(p_recurrence_weeks, 0), 0), 12);
  v_desc := COALESCE(p_description, '');
  v_series := CASE WHEN v_weeks > 0 THEN gen_random_uuid() ELSE NULL END;

  FOR v_i IN 0..v_weeks LOOP
    v_start := p_starts_at + make_interval(weeks => v_i);
    INSERT INTO public."groupCoachingSession" (
      "seriesId", title, description, "startsAt", "durationMinutes", capacity, status
    )
    VALUES (
      v_series, v_title, v_desc, v_start, p_duration_minutes, p_capacity, 'scheduled'
    )
    RETURNING id INTO v_id;
    v_ids := array_append(v_ids, v_id);
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'sessionIds', to_jsonb(v_ids),
    'seriesId', v_series,
    'count', coalesce(array_length(v_ids, 1), 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_group_coaching_sessions(TEXT, TEXT, TIMESTAMPTZ, INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_group_coaching_sessions(TEXT, TEXT, TIMESTAMPTZ, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_group_coaching_sessions(TEXT, TEXT, TIMESTAMPTZ, INT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_update_group_coaching_session(
  p_session_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_starts_at TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes INT DEFAULT NULL,
  p_capacity INT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public."groupCoachingSession"%ROWTYPE;
  v_registered integer;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF v_session.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'cancelled', 'error', 'Cannot edit a cancelled session.');
  END IF;

  IF p_capacity IS NOT NULL THEN
    IF p_capacity <= 0 OR p_capacity > 500 THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_capacity');
    END IF;
    v_registered := public.group_session_registered_count(p_session_id);
    IF p_capacity < v_registered THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'capacity_below_registered',
        'error', 'Capacity cannot be below current registered count.'
      );
    END IF;
  END IF;

  UPDATE public."groupCoachingSession"
  SET title = COALESCE(NULLIF(btrim(p_title), ''), title),
      description = COALESCE(p_description, description),
      "startsAt" = COALESCE(p_starts_at, "startsAt"),
      "durationMinutes" = COALESCE(p_duration_minutes, "durationMinutes"),
      capacity = COALESCE(p_capacity, capacity)
  WHERE id = p_session_id;

  RETURN jsonb_build_object('ok', true, 'sessionId', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_group_coaching_session(UUID, TEXT, TEXT, TIMESTAMPTZ, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_group_coaching_session(UUID, TEXT, TEXT, TIMESTAMPTZ, INT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_cancel_group_coaching_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public."groupCoachingSession"
  SET status = 'cancelled', "cancelledAt" = now()
  WHERE id = p_session_id AND status <> 'cancelled';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  UPDATE public."groupSessionEnrollment"
  SET status = 'cancelled', "cancelledAt" = now()
  WHERE "sessionId" = p_session_id
    AND status IN ('registered', 'waitlisted', 'offered');

  RETURN jsonb_build_object('ok', true, 'sessionId', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_cancel_group_coaching_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_group_coaching_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_upcoming_group_coaching_sessions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t."startsAt")
    FROM (
      SELECT
        s.id,
        s.title,
        s.description,
        s."startsAt",
        s."durationMinutes",
        s.capacity,
        s.status,
        s."meetLink",
        public.group_session_registered_count(s.id) AS "registeredCount",
        (
          SELECT COUNT(*)::INT FROM public."groupSessionEnrollment" e
          WHERE e."sessionId" = s.id AND e.status IN ('waitlisted', 'offered')
        ) AS "waitlistCount",
        (
          SELECT e.status FROM public."groupSessionEnrollment" e
          WHERE e."sessionId" = s.id
            AND e."userId" = v_user_id
            AND e.status IN ('registered', 'waitlisted', 'offered')
          LIMIT 1
        ) AS "myEnrollmentStatus",
        (
          SELECT e."claimExpiresAt" FROM public."groupSessionEnrollment" e
          WHERE e."sessionId" = s.id
            AND e."userId" = v_user_id
            AND e.status = 'offered'
          LIMIT 1
        ) AS "myClaimExpiresAt"
      FROM public."groupCoachingSession" s
      WHERE s.status = 'scheduled'
        AND s."startsAt" > now()
      ORDER BY s."startsAt" ASC
      LIMIT 50
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_upcoming_group_coaching_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_upcoming_group_coaching_sessions() TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_group_coaching_enrollments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t."startsAt" DESC)
    FROM (
      SELECT
        e.id AS "enrollmentId",
        e.status,
        e."periodMonth",
        e."registeredAt",
        e."waitlistedAt",
        e."claimExpiresAt",
        e."cancelledAt",
        s.id AS "sessionId",
        s.title,
        s.description,
        s."startsAt",
        s."durationMinutes",
        s."meetLink",
        s.status AS "sessionStatus"
      FROM public."groupSessionEnrollment" e
      JOIN public."groupCoachingSession" s ON s.id = e."sessionId"
      WHERE e."userId" = v_user_id
      ORDER BY s."startsAt" DESC
      LIMIT 30
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_group_coaching_enrollments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_group_coaching_enrollments() TO authenticated;

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
      'error', 'You already have a group session for this month.'
    );
  END IF;

  v_registered := public.group_session_registered_count(p_session_id);

  IF v_registered < v_session.capacity THEN
    v_status := 'registered';
    INSERT INTO public."groupSessionEnrollment" (
      "sessionId", "userId", status, "periodMonth", "registeredAt"
    )
    VALUES (p_session_id, v_user_id, 'registered', v_period, now());
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
  v_was_registered boolean := false;
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

  UPDATE public."groupSessionEnrollment"
  SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
  WHERE id = v_enrollment.id;

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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('group_claim'),
    hashtext(p_session_id::text)
  );

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

  RETURN jsonb_build_object('ok', true, 'status', 'registered', 'sessionId', p_session_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_group_coaching_offer(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_group_coaching_offer(UUID) TO authenticated;

/**
 * Cron/service: expire stale offers and promote next waitlisted users.
 * Returns jsonb array of newly promoted enrollment ids needing email.
 */
CREATE OR REPLACE FUNCTION public.process_group_coaching_waitlist()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired RECORD;
  v_session_id uuid;
  v_promoted uuid;
  v_promoted_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  FOR v_expired IN
    SELECT id, "sessionId"
    FROM public."groupSessionEnrollment"
    WHERE status = 'offered'
      AND "claimExpiresAt" IS NOT NULL
      AND "claimExpiresAt" <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
    WHERE id = v_expired.id;

    v_promoted := public.promote_next_group_waitlist(v_expired."sessionId");
    IF v_promoted IS NOT NULL THEN
      v_promoted_ids := array_append(v_promoted_ids, v_promoted);
    END IF;
  END LOOP;

  -- Also promote for sessions with free seats and waitlist but no current offer
  -- (e.g. after admin capacity increase).
  FOR v_session_id IN
    SELECT s.id
    FROM public."groupCoachingSession" s
    WHERE s.status = 'scheduled'
      AND s."startsAt" > now()
      AND public.group_session_registered_count(s.id) < s.capacity
      AND EXISTS (
        SELECT 1 FROM public."groupSessionEnrollment" e
        WHERE e."sessionId" = s.id AND e.status = 'waitlisted'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public."groupSessionEnrollment" e2
        WHERE e2."sessionId" = s.id AND e2.status = 'offered'
      )
  LOOP
    v_promoted := public.promote_next_group_waitlist(v_session_id);
    IF v_promoted IS NOT NULL THEN
      v_promoted_ids := array_append(v_promoted_ids, v_promoted);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'promotedEnrollmentIds', to_jsonb(COALESCE(v_promoted_ids, ARRAY[]::uuid[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_group_coaching_waitlist() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_group_coaching_waitlist() TO service_role;

-- Extend cron invoker CASE + schedule waitlist processor.
CREATE OR REPLACE FUNCTION public.invoke_scheduled_edge_function(function_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'net', 'cron', 'pg_catalog'
AS $function$
DECLARE
  project_url text;
  service_role_key text;
  cron_secret text;
  secret_name text;
  request_id bigint;
  headers jsonb;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'edge_cron_service_role_key'
  LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'invoke_scheduled_edge_function(%): missing vault secrets project_url or edge_cron_service_role_key', function_slug;
    RETURN NULL;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  secret_name := CASE function_slug
    WHEN 'module-unlock' THEN 'module_unlock_cron_secret'
    WHEN 'reassessment-due' THEN 'reassessment_due_cron_secret'
    WHEN 'vulnerable-outreach' THEN 'vulnerable_outreach_cron_secret'
    WHEN 'generate-daily-insights' THEN 'daily_insights_cron_secret'
    WHEN 'generate-coaching-summary' THEN 'coaching_summary_cron_secret'
    WHEN 'coach-booking-reminders' THEN 'coach_booking_reminders_cron_secret'
    WHEN 'group-coaching-waitlist' THEN 'group_coaching_waitlist_cron_secret'
    ELSE NULL
  END;

  IF secret_name IS NOT NULL THEN
    SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets
    WHERE name = secret_name
    LIMIT 1;

    IF cron_secret IS NOT NULL AND length(trim(cron_secret)) > 0 THEN
      headers := headers || jsonb_build_object('x-cron-secret', cron_secret);
    END IF;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_slug,
    headers := headers,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  INTO request_id;

  RETURN request_id;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'every-5m-group-coaching-waitlist';

    PERFORM cron.schedule(
      'every-5m-group-coaching-waitlist',
      '*/5 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('group-coaching-waitlist'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip every-5m-group-coaching-waitlist schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule every-5m-group-coaching-waitlist: %', SQLERRM;
END $$;
