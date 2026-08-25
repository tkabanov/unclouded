-- NCLDD-31 §6 — Post-session coach form (tokenized public submit, notes, completed status).

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "postSessionToken" UUID NULL,
  ADD COLUMN IF NOT EXISTS "coachSessionNotes" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "postSessionSubmittedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ NULL;

UPDATE public."coachBooking"
SET "postSessionToken" = gen_random_uuid()
WHERE "postSessionToken" IS NULL;

ALTER TABLE public."coachBooking"
  ALTER COLUMN "postSessionToken" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "postSessionToken" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_booking_post_session_token_unique
  ON public."coachBooking" ("postSessionToken");

COMMENT ON COLUMN public."coachBooking"."postSessionToken" IS
  'Unguessable token for the public post-session notes form (/coach-session/:token).';
COMMENT ON COLUMN public."coachBooking"."coachSessionNotes" IS
  'Specialist post-session coaching notes submitted via the public form.';
COMMENT ON COLUMN public."coachBooking"."postSessionSubmittedAt" IS
  'When post-session notes were submitted (idempotency stamp).';
COMMENT ON COLUMN public."coachBooking"."completedAt" IS
  'When the session was marked completed (post-session form submit).';

/**
 * Public peek — minimal session info for the post-session form (edge function only).
 */
CREATE OR REPLACE FUNCTION public.peek_coach_post_session(p_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public."coachBooking"%ROWTYPE;
  v_first_name text;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE "postSessionToken" = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT p."firstName" INTO v_first_name
  FROM public.profiles p
  WHERE p.id = v_booking."userId";

  RETURN jsonb_build_object(
    'ok', true,
    'scheduledAt', v_booking."scheduledAt",
    'durationMinutes', COALESCE(v_booking."durationMinutes", 30),
    'status', v_booking.status,
    'memberFirstName', NULLIF(btrim(v_first_name), ''),
    'alreadySubmitted', v_booking."postSessionSubmittedAt" IS NOT NULL,
    'submittedAt', v_booking."postSessionSubmittedAt",
    'notes', CASE
      WHEN v_booking."postSessionSubmittedAt" IS NOT NULL THEN v_booking."coachSessionNotes"
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_coach_post_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_coach_post_session(UUID) TO service_role;

/**
 * Public submit — specialist post-session notes (edge function only).
 */
CREATE OR REPLACE FUNCTION public.submit_coach_post_session(
  p_token UUID,
  p_notes TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public."coachBooking"%ROWTYPE;
  v_notes text;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  v_notes := btrim(COALESCE(p_notes, ''));
  IF v_notes = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'notes_required',
      'error', 'Session notes are required.'
    );
  END IF;

  IF char_length(v_notes) > 8000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'notes_too_long',
      'error', 'Session notes must be 8000 characters or fewer.'
    );
  END IF;

  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE "postSessionToken" = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF v_booking."postSessionSubmittedAt" IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'already_submitted',
      'submittedAt', v_booking."postSessionSubmittedAt"
    );
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'not_available',
      'error', 'This session cannot accept post-session notes.'
    );
  END IF;

  IF v_booking."scheduledAt" IS NULL OR v_booking."scheduledAt" > now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'session_not_started',
      'error', 'Notes can be submitted after the session start time.'
    );
  END IF;

  UPDATE public."coachBooking"
  SET "coachSessionNotes" = v_notes,
      "postSessionSubmittedAt" = now(),
      "completedAt" = now(),
      status = 'completed'
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'submitted',
    'bookingId', v_booking.id,
    'submittedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_coach_post_session(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_coach_post_session(UUID, TEXT) TO service_role;

-- Issue post-session token on internal 1:1 confirm.
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
    'balance', public.available_premium_credits(v_user_id),
    'required', v_required
  );
END;
$$;
