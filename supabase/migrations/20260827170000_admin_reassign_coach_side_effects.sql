-- NCLDD-31 §4 / CL-3 — reassign returns previous coach email + calendar ids for edge side effects.

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
  v_previous_email text;
  v_previous_specialist_id uuid;
  v_email text;
  v_name text;
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

  v_previous_email := v_booking."assignedCoachEmail";
  v_previous_specialist_id := v_booking."specialistId";

  SELECT s.email, s.name, s."isActive"
  INTO v_email, v_name, v_active
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
    'specialistName', v_name,
    'assignedCoachEmail', v_email,
    'previousAssignedCoachEmail', v_previous_email,
    'previousSpecialistId', v_previous_specialist_id,
    'googleEventId', v_booking."googleEventId",
    'meetLink', v_booking."meetLink",
    'scheduledAt', v_booking."scheduledAt",
    'durationMinutes', v_duration,
    'userId', v_booking."userId"
  );
END;
$$;

COMMENT ON FUNCTION public.admin_reassign_coach_booking_specialist(UUID, UUID) IS
  'NCLDD-31 CL-3: reassign specialist; returns previous email + googleEventId for Calendar/email side effects.';
