-- NCLDD-31 §3 — Internal one-on-one booking confirm, Meet fields, admin reassign.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "meetLink" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "googleEventId" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "durationMinutes" INT NOT NULL DEFAULT 30;

ALTER TABLE public."coachBooking"
  DROP CONSTRAINT IF EXISTS coach_booking_duration_minutes_check;

ALTER TABLE public."coachBooking"
  ADD CONSTRAINT coach_booking_duration_minutes_check
  CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 180);

COMMENT ON COLUMN public."coachBooking"."meetLink" IS
  'Google Meet URL created after internal 1:1 confirm (finalize-coach-booking).';

COMMENT ON COLUMN public."coachBooking"."googleEventId" IS
  'Google Calendar event id for the 1:1 session.';

COMMENT ON COLUMN public."coachBooking"."durationMinutes" IS
  'Session length in minutes (default 30).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_booking_specialist_slot_unique
  ON public."coachBooking" ("specialistId", "scheduledAt")
  WHERE "specialistId" IS NOT NULL
    AND "scheduledAt" IS NOT NULL
    AND status IN ('pending', 'confirmed');

/**
 * Confirm an internal 1:1 booking for a consolidated anonymized slot.
 * Assigns a free active specialist, holds+redeems credits, status = confirmed.
 * Never returns specialist identity to the caller.
 */
CREATE OR REPLACE FUNCTION public.confirm_one_on_one_booking(
  p_slot_start TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 30
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
    hashtext(p_slot_start::text || ':' || v_duration::text)
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

  SELECT s.id, s.email
  INTO v_specialist_id, v_specialist_email
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
      AND b2.status IN ('pending', 'confirmed')
      AND b2."scheduledAt" IS NOT NULL
      AND b2."scheduledAt" >= now()
  ) ASC,
  s.id ASC
  LIMIT 1
  FOR UPDATE OF s SKIP LOCKED;

  IF v_specialist_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'slot_unavailable',
      'error', 'That time slot is no longer available. Please choose another.'
    );
  END IF;

  INSERT INTO public."coachBooking" (
    "userId",
    "scheduledAt",
    status,
    "creditsRequired",
    "specialistId",
    "assignedCoachEmail",
    "durationMinutes",
    "confirmedAt"
  )
  VALUES (
    v_user_id,
    p_slot_start,
    'confirmed',
    v_required,
    v_specialist_id,
    v_specialist_email,
    v_duration,
    now()
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
    'balance', public.available_premium_credits(v_user_id),
    'required', v_required
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT) TO service_role;

/**
 * Admin: change the assigned specialist on a confirmed/pending booking.
 */
CREATE OR REPLACE FUNCTION public.admin_reassign_coach_booking_specialist(
  p_booking_id UUID,
  p_specialist_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public."coachBooking"%ROWTYPE;
  v_email text;
  v_active boolean;
  v_duration integer;
  v_slot_end timestamptz;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_found');
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_status',
      'error', 'Only upcoming bookings can be reassigned.'
    );
  END IF;

  IF v_booking."scheduledAt" IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'no_schedule',
      'error', 'Booking has no scheduled time.'
    );
  END IF;

  SELECT s.email, s."isActive"
  INTO v_email, v_active
  FROM public."specialist" s
  WHERE s.id = p_specialist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'specialist_not_found');
  END IF;

  IF NOT v_active THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'specialist_inactive',
      'error', 'Specialist is inactive.'
    );
  END IF;

  v_duration := COALESCE(v_booking."durationMinutes", public.coach_booking_duration_minutes());
  v_slot_end := v_booking."scheduledAt" + make_interval(mins => v_duration);

  IF NOT EXISTS (
    SELECT 1
    FROM public."specialistAvailability" a
    WHERE a."specialistId" = p_specialist_id
      AND a."startsAt" <= v_booking."scheduledAt"
      AND a."endsAt" >= v_slot_end
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'no_availability',
      'error', 'Specialist is not available at this time.'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."coachBooking" b
    WHERE b."specialistId" = p_specialist_id
      AND b.id <> p_booking_id
      AND b.status IN ('pending', 'confirmed')
      AND b."scheduledAt" IS NOT NULL
      AND tstzrange(
            b."scheduledAt",
            b."scheduledAt" + make_interval(
              mins => COALESCE(b."durationMinutes", public.coach_booking_duration_minutes())
            ),
            '[)'
          )
          && tstzrange(v_booking."scheduledAt", v_slot_end, '[)')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'specialist_busy',
      'error', 'Specialist already has a booking at this time.'
    );
  END IF;

  UPDATE public."coachBooking"
  SET
    "specialistId" = p_specialist_id,
    "assignedCoachEmail" = v_email
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', p_booking_id,
    'specialistId', p_specialist_id,
    'assignedCoachEmail', v_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reassign_coach_booking_specialist(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reassign_coach_booking_specialist(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_coach_booking_specialist(UUID, UUID) TO service_role;
