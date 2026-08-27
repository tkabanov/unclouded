-- NCLDD-31 §2 / CL-9 — User chooses coach; per-coach slots; CL-2 monthly-load assign helper.

-- ---------------------------------------------------------------------------
-- CL-2: pick specialist for a slot by lowest calendar-month load, then random
-- (residual auto-assign paths only; user confirm requires p_specialist_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pick_specialist_for_one_on_one_slot(
  p_slot_start TIMESTAMPTZ,
  p_duration_minutes INT
)
RETURNS TABLE (
  specialist_id UUID,
  specialist_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_end timestamptz;
  v_duration integer;
BEGIN
  v_duration := COALESCE(NULLIF(p_duration_minutes, 0), public.coach_booking_duration_minutes());
  v_slot_end := p_slot_start + make_interval(mins => v_duration);

  RETURN QUERY
  SELECT s.id, s.email
  FROM public."specialist" s
  WHERE s."isActive" = true
    AND EXISTS (
      SELECT 1
      FROM public."specialistAvailability" a
      WHERE a."specialistId" = s.id
        AND a."startsAt" <= p_slot_start
        AND a."endsAt" >= v_slot_end
        AND a."durationMinutes" = v_duration
        AND MOD(
          FLOOR(EXTRACT(EPOCH FROM (p_slot_start - a."startsAt")) / 60)::INT,
          a."durationMinutes"
        ) = 0
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public."coachBooking" b
      WHERE b."specialistId" = s.id
        AND b.status IN ('pending', 'confirmed')
        AND b."scheduledAt" IS NOT NULL
        AND tstzrange(
              b."scheduledAt",
              b."scheduledAt" + make_interval(
                mins => COALESCE(b."durationMinutes", public.coach_booking_duration_minutes())
              ),
              '[)'
            )
            && tstzrange(p_slot_start, v_slot_end, '[)')
    )
  ORDER BY (
    SELECT COUNT(*)::INT
    FROM public."coachBooking" b2
    WHERE b2."specialistId" = s.id
      AND b2.status IN ('pending', 'confirmed', 'completed')
      AND b2."scheduledAt" IS NOT NULL
      AND date_trunc('month', b2."scheduledAt" AT TIME ZONE 'UTC')
          = date_trunc('month', now() AT TIME ZONE 'UTC')
  ) ASC,
  random()
  LIMIT 1
  FOR UPDATE OF s SKIP LOCKED;
END;
$$;

REVOKE ALL ON FUNCTION public.pick_specialist_for_one_on_one_slot(TIMESTAMPTZ, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pick_specialist_for_one_on_one_slot(TIMESTAMPTZ, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- Active coaches for member booking UI (bypasses admin-only specialist RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_active_coaches_for_booking()
RETURNS TABLE (
  id UUID,
  name TEXT,
  "imageUrl" TEXT,
  bio TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s."imageUrl", s.bio
  FROM public."specialist" s
  WHERE s."isActive" = true
  ORDER BY s.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_active_coaches_for_booking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_coaches_for_booking() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_active_coaches_for_booking() TO service_role;

-- ---------------------------------------------------------------------------
-- Most recent coach for "Book again"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_last_one_on_one_coach()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT
    s.id,
    s.name,
    s."imageUrl",
    s.bio,
    s."isActive"
  INTO v_row
  FROM public."coachBooking" b
  INNER JOIN public."specialist" s ON s.id = b."specialistId"
  WHERE b."userId" = v_user_id
    AND b."specialistId" IS NOT NULL
    AND b.status IN ('confirmed', 'completed')
    AND b."scheduledAt" IS NOT NULL
  ORDER BY b."scheduledAt" DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'name', v_row.name,
    'imageUrl', v_row."imageUrl",
    'bio', v_row.bio,
    'isActive', v_row."isActive"
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_last_one_on_one_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_last_one_on_one_coach() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_last_one_on_one_coach() TO service_role;

-- ---------------------------------------------------------------------------
-- Per-coach bookable slots (replaces anonymized 2-arg merge)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.list_bookable_one_on_one_slots(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_specialist_id UUID
)
RETURNS TABLE (
  "slotStart" TIMESTAMPTZ,
  "slotEnd" TIMESTAMPTZ,
  "durationMinutes" INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_specialist_id IS NULL THEN
    RAISE EXCEPTION 'specialist required';
  END IF;

  IF p_to <= p_from THEN
    RAISE EXCEPTION 'invalid range';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."specialist" s
    WHERE s.id = p_specialist_id AND s."isActive" = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH windows AS (
    SELECT
      a."specialistId",
      a."startsAt",
      a."endsAt",
      a."durationMinutes"
    FROM public."specialistAvailability" a
    WHERE a."specialistId" = p_specialist_id
      AND a."endsAt" > p_from
      AND a."startsAt" < p_to
  ),
  slots AS (
    SELECT
      w."specialistId",
      w."durationMinutes",
      gs AS slot_start,
      gs + make_interval(mins => w."durationMinutes") AS slot_end
    FROM windows w
    CROSS JOIN LATERAL generate_series(
      w."startsAt",
      w."endsAt" - make_interval(mins => w."durationMinutes"),
      make_interval(mins => w."durationMinutes")
    ) AS gs
    WHERE gs >= p_from
      AND gs + make_interval(mins => w."durationMinutes") <= p_to
      AND gs >= now()
  ),
  free_slots AS (
    SELECT s.slot_start, s.slot_end, s."durationMinutes"
    FROM slots s
    WHERE NOT EXISTS (
      SELECT 1
      FROM public."coachBooking" b
      WHERE b."specialistId" = s."specialistId"
        AND b.status IN ('pending', 'confirmed')
        AND b."scheduledAt" IS NOT NULL
        AND tstzrange(
              b."scheduledAt",
              b."scheduledAt" + make_interval(
                mins => COALESCE(b."durationMinutes", public.coach_booking_duration_minutes())
              ),
              '[)'
            )
            && tstzrange(s.slot_start, s.slot_end, '[)')
    )
  )
  SELECT
    fs.slot_start AS "slotStart",
    fs.slot_end AS "slotEnd",
    fs."durationMinutes"
  FROM free_slots fs
  ORDER BY fs.slot_start, fs."durationMinutes";
END;
$$;

REVOKE ALL ON FUNCTION public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Member booking history with coach name
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_one_on_one_bookings(p_limit INT DEFAULT 20)
RETURNS TABLE (
  id UUID,
  "userId" UUID,
  "scheduledAt" TIMESTAMPTZ,
  status TEXT,
  "kotaRead" TEXT,
  "createdAt" TIMESTAMPTZ,
  "meetLink" TEXT,
  "durationMinutes" INT,
  "coachSessionNotes" TEXT,
  "specialistId" UUID,
  "specialistName" TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b."userId",
    b."scheduledAt",
    b.status,
    b."kotaRead",
    b."createdAt",
    b."meetLink",
    b."durationMinutes",
    b."coachSessionNotes",
    b."specialistId",
    s.name AS "specialistName"
  FROM public."coachBooking" b
  LEFT JOIN public."specialist" s ON s.id = b."specialistId"
  WHERE b."userId" = v_user_id
  ORDER BY b."scheduledAt" DESC NULLS LAST, b."createdAt" DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_one_on_one_bookings(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_one_on_one_bookings(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_one_on_one_bookings(INT) TO service_role;

-- ---------------------------------------------------------------------------
-- Confirm 1:1 with required user-selected specialist (CL-9)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.confirm_one_on_one_booking(TIMESTAMPTZ, INT);

CREATE OR REPLACE FUNCTION public.confirm_one_on_one_booking(
  p_slot_start TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 30,
  p_specialist_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_required integer := public.credits_per_one_on_one_session();
  v_balance integer;
  v_duration integer;
  v_slot_end timestamptz;
  v_specialist_id uuid;
  v_specialist_email text;
  v_specialist_name text;
  v_booking_id uuid;
  v_redeem jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_slot_start IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_slot',
      'error', 'Choose an available time slot.'
    );
  END IF;

  IF p_slot_start < now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'slot_in_past',
      'error', 'That time slot is no longer available.'
    );
  END IF;

  v_duration := COALESCE(NULLIF(p_duration_minutes, 0), public.coach_booking_duration_minutes());
  IF v_duration <= 0 OR v_duration > 180 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_duration',
      'error', 'Invalid session duration.'
    );
  END IF;

  v_slot_end := p_slot_start + make_interval(mins => v_duration);

  PERFORM pg_advisory_xact_lock(
    hashtext('one_on_one_booking'),
    hashtext(v_user_id::text)
  );
  PERFORM pg_advisory_xact_lock(
    hashtext('one_on_one_slot'),
    hashtext(p_slot_start::text || ':' || v_duration::text || ':' || COALESCE(p_specialist_id::text, 'auto'))
  );

  IF public.effective_user_tier(v_user_id) <> 'premium' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'premium_required',
      'error', '1:1 sessions are available on Premium.'
    );
  END IF;

  v_balance := public.available_premium_credits(v_user_id);
  IF v_balance < v_required THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'insufficient_credits',
      'balance', v_balance,
      'required', v_required,
      'error', format(
        'You need two credits to book a 30-minute 1:1 session. You currently have %s credit%s.',
        v_balance,
        CASE WHEN v_balance = 1 THEN '' ELSE 's' END
      )
    );
  END IF;

  IF p_specialist_id IS NOT NULL THEN
    SELECT s.id, s.email, s.name
    INTO v_specialist_id, v_specialist_email, v_specialist_name
    FROM public."specialist" s
    WHERE s.id = p_specialist_id
      AND s."isActive" = true
    FOR UPDATE OF s;

    IF v_specialist_id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'specialist_unavailable',
        'error', 'That coach is no longer available. Please choose another.'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public."specialistAvailability" a
      WHERE a."specialistId" = v_specialist_id
        AND a."startsAt" <= p_slot_start
        AND a."endsAt" >= v_slot_end
        AND a."durationMinutes" = v_duration
        AND MOD(
          FLOOR(EXTRACT(EPOCH FROM (p_slot_start - a."startsAt")) / 60)::INT,
          a."durationMinutes"
        ) = 0
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'slot_unavailable',
        'error', 'That time slot is no longer available. Please choose another.'
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public."coachBooking" b
      WHERE b."specialistId" = v_specialist_id
        AND b.status IN ('pending', 'confirmed')
        AND b."scheduledAt" IS NOT NULL
        AND tstzrange(
              b."scheduledAt",
              b."scheduledAt" + make_interval(
                mins => COALESCE(b."durationMinutes", public.coach_booking_duration_minutes())
              ),
              '[)'
            )
            && tstzrange(p_slot_start, v_slot_end, '[)')
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'slot_unavailable',
        'error', 'That time slot is no longer available. Please choose another.'
      );
    END IF;
  ELSE
    -- Residual auto-assign (CL-2): lowest calendar-month load, then random
    SELECT p.specialist_id, p.specialist_email
    INTO v_specialist_id, v_specialist_email
    FROM public.pick_specialist_for_one_on_one_slot(p_slot_start, v_duration) p;

    IF v_specialist_id IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'slot_unavailable',
        'error', 'That time slot is no longer available. Please choose another.'
      );
    END IF;

    SELECT s.name INTO v_specialist_name
    FROM public."specialist" s
    WHERE s.id = v_specialist_id;
  END IF;

  INSERT INTO public."coachBooking" (
    "userId",
    "scheduledAt",
    status,
    "creditsRequired",
    "specialistId",
    "assignedCoachEmail",
    "durationMinutes",
    "confirmedAt",
    "postSessionToken"
  )
  VALUES (
    v_user_id,
    p_slot_start,
    'confirmed',
    v_required,
    v_specialist_id,
    v_specialist_email,
    v_duration,
    now(),
    gen_random_uuid()
  )
  RETURNING id INTO v_booking_id;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "coachBookingId", note)
  VALUES (
    v_user_id,
    -v_required,
    'hold',
    v_booking_id,
    'Reserved for a confirmed internal 1:1 session.'
  );

  v_redeem := public.redeem_premium_credits_for_booking(v_booking_id);
  IF COALESCE(v_redeem ->> 'ok', 'false') <> 'true' THEN
    RAISE EXCEPTION 'credit redemption failed: %', COALESCE(v_redeem ->> 'code', 'unknown');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', v_booking_id,
    'scheduledAt', p_slot_start,
    'durationMinutes', v_duration,
    'specialistId', v_specialist_id,
    'specialistName', v_specialist_name,
    'balance', public.available_premium_credits(v_user_id),
    'required', v_required
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) TO service_role;
