-- NCLDD-56 slice 3: book a human-coach 1:1 session with a referral coach credit.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
-- Depends on 20261013160000_referral_rewards_ledgers ("referralCoachCreditLedger").
--
-- * 1 referral credit = 1 full 1:1 session on ANY plan (OVR-074); it is spent before Premium
--   credits. Without a referral credit the existing Premium-only + 2-credit rules apply unchanged.
-- * coachBooking."paymentSource" records what paid for the booking.
-- * Cancel 24h+ before the session returns the referral credit in full (no cap) — only if this
--   booking spent one, and it settles a pending 0-reversal from slice 2 instead of minting a credit.
-- * Direct client INSERT into "coachBooking" is closed (forged bookings could mint credits).
-- * AI sessions are untouched: referral credits are only read by these two RPCs.
-- * Bodies are copied from the latest versions (confirm: 20260827150000, cancel: 20260827160000)
--   with only the referral branches added.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "paymentSource" TEXT NOT NULL DEFAULT 'premium_credits';

ALTER TABLE public."coachBooking"
  DROP CONSTRAINT IF EXISTS coach_booking_payment_source_check;
ALTER TABLE public."coachBooking"
  ADD CONSTRAINT coach_booking_payment_source_check
  CHECK ("paymentSource" IN ('premium_credits', 'referral_credit'));

-- Bookings are created only by SECURITY DEFINER RPCs. The old direct-insert policy let a client
-- forge a "confirmed" booking (any paymentSource) and cancel it for credits it never spent.
DROP POLICY IF EXISTS "Premium owner with credits inserts coachBooking" ON public."coachBooking";
REVOKE INSERT ON public."coachBooking" FROM anon, authenticated;

-- Own referral credit balance for the booking UI.
CREATE OR REPLACE FUNCTION public.my_referral_coach_credit_balance()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 0
    ELSE public.available_referral_coach_credits(auth.uid())
  END;
$$;

REVOKE ALL ON FUNCTION public.my_referral_coach_credit_balance() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_coach_credit_balance() TO authenticated, service_role;

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
  v_use_referral boolean := false;
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

  -- NCLDD-56: a referral coach credit pays for one full session on any plan and is spent first.
  PERFORM pg_advisory_xact_lock(
    hashtext('referral_coach_credit'),
    hashtext(v_user_id::text)
  );
  v_use_referral := public.available_referral_coach_credits(v_user_id) >= 1;

  IF NOT v_use_referral AND public.effective_user_tier(v_user_id) <> 'premium' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'premium_required',
      'error', '1:1 sessions are available on Premium.'
    );
  END IF;

  v_balance := public.available_premium_credits(v_user_id);
  IF NOT v_use_referral AND v_balance < v_required THEN
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
    "postSessionToken",
    "paymentSource"
  )
  VALUES (
    v_user_id,
    p_slot_start,
    'confirmed',
    CASE WHEN v_use_referral THEN 0 ELSE v_required END,
    v_specialist_id,
    v_specialist_email,
    v_duration,
    now(),
    gen_random_uuid(),
    CASE WHEN v_use_referral THEN 'referral_credit' ELSE 'premium_credits' END
  )
  RETURNING id INTO v_booking_id;

  IF v_use_referral THEN
    INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, "coachBookingId", note)
    VALUES (v_user_id, -1, 'redemption', v_booking_id, 'Used for a confirmed 1:1 session.');
  ELSE
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
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', v_booking_id,
    'scheduledAt', p_slot_start,
    'durationMinutes', v_duration,
    'specialistId', v_specialist_id,
    'specialistName', v_specialist_name,
    'balance', public.available_premium_credits(v_user_id),
    'required', CASE WHEN v_use_referral THEN 0 ELSE v_required END,
    'paymentSource', CASE WHEN v_use_referral THEN 'referral_credit' ELSE 'premium_credits' END,
    'referralCredits', public.available_referral_coach_credits(v_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_one_on_one_booking(
  p_booking_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public."coachBooking"%ROWTYPE;
  v_redeemed integer;
  v_refund boolean := false;
  v_refunded_amount integer := 0;
  v_hours_until numeric;
  v_room integer;
  v_rev_invoice text;
  v_rev_referred uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_booking_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'booking_id_required',
      'error', 'Booking id is required.'
    );
  END IF;

  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'booking_not_found',
      'error', 'Booking not found.'
    );
  END IF;

  IF v_booking."userId" <> v_user_id AND NOT public.is_settings_admin() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'error', 'You cannot cancel this booking.'
    );
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'already_cancelled',
      'bookingId', v_booking.id,
      'refunded', EXISTS (
        SELECT 1 FROM public."premiumCreditLedger"
        WHERE "coachBookingId" = v_booking.id AND reason = 'reversal'
      ) OR (
        EXISTS (
          SELECT 1 FROM public."referralCoachCreditLedger"
          WHERE "coachBookingId" = v_booking.id AND reason = 'cancel_refund'
        ) AND NOT EXISTS (
          SELECT 1 FROM public."referralCoachCreditLedger"
          WHERE "coachBookingId" = v_booking.id AND reason = 'reversal'
        )
      ),
      'paymentSource', v_booking."paymentSource",
      'googleEventId', v_booking."googleEventId",
      'meetLink', v_booking."meetLink",
      'scheduledAt', v_booking."scheduledAt",
      'assignedCoachEmail', v_booking."assignedCoachEmail",
      'durationMinutes', COALESCE(v_booking."durationMinutes", 30),
      'userId', v_booking."userId",
      'balance', public.available_premium_credits(v_booking."userId")
    );
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_status',
      'error', 'Only confirmed upcoming sessions can be canceled.'
    );
  END IF;

  IF v_booking."scheduledAt" IS NULL OR v_booking."scheduledAt" <= now() THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'session_started_or_past',
      'error', 'Past or in-progress sessions cannot be canceled.'
    );
  END IF;

  v_hours_until := EXTRACT(EPOCH FROM (v_booking."scheduledAt" - now())) / 3600.0;
  v_refund := v_hours_until >= 24;

  IF v_refund AND v_booking."paymentSource" = 'referral_credit' THEN
    -- NCLDD-56: the referral credit comes back in full (no cap on referral credits).
    PERFORM pg_advisory_xact_lock(
      hashtext('referral_coach_credit'),
      hashtext(v_booking."userId"::text)
    );
    -- Only a credit this booking actually spent comes back, and only once.
    IF EXISTS (
      SELECT 1 FROM public."referralCoachCreditLedger"
      WHERE "coachBookingId" = v_booking.id AND reason = 'redemption'
    ) AND NOT EXISTS (
      SELECT 1 FROM public."referralCoachCreditLedger"
      WHERE "coachBookingId" = v_booking.id AND reason = 'cancel_refund'
    ) THEN
      INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, "coachBookingId", note)
      VALUES (v_booking."userId", 1, 'cancel_refund', v_booking.id,
              'Canceled 24+ hours before session — referral credit returned.');
      v_refunded_amount := 1;

      -- A reward whose payment was fully refunded / disputed while the credit was spent was
      -- recorded as a 0 reversal; the returned credit settles that reversal now.
      SELECT l."stripeInvoiceId", l."referredUserId"
      INTO v_rev_invoice, v_rev_referred
      FROM public."referralCoachCreditLedger" AS l
      WHERE l."userId" = v_booking."userId"
        AND l.reason = 'reversal'
        AND l.delta = 0
        AND l.seq = (
          SELECT max(x.seq) FROM public."referralCoachCreditLedger" AS x
          WHERE x."stripeInvoiceId" = l."stripeInvoiceId"
            AND x.reason IN ('reversal', 'reversal_restore')
        )
      ORDER BY l.seq
      LIMIT 1;

      IF v_rev_invoice IS NOT NULL THEN
        INSERT INTO public."referralCoachCreditLedger"
          ("userId", delta, reason, "referredUserId", "stripeInvoiceId", "coachBookingId", note)
        VALUES (v_booking."userId", -1, 'reversal', v_rev_referred, v_rev_invoice, v_booking.id,
                'Returned credit taken by an earlier full refund / dispute.');
        v_refunded_amount := 0;
      END IF;
    END IF;
  ELSIF v_refund THEN
    SELECT -delta INTO v_redeemed
    FROM public."premiumCreditLedger"
    WHERE "coachBookingId" = v_booking.id AND reason = 'redemption';

    IF v_redeemed IS NULL OR v_redeemed <= 0 THEN
      v_redeemed := COALESCE(
        NULLIF(v_booking."creditsRequired", 0),
        public.credits_per_one_on_one_session()
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public."premiumCreditLedger"
      WHERE "coachBookingId" = v_booking.id AND reason = 'reversal'
    ) THEN
      v_room := public.premium_credit_room(v_booking."userId");
      v_refunded_amount := LEAST(v_redeemed, v_room);

      IF v_refunded_amount > 0 THEN
        INSERT INTO public."premiumCreditLedger" (
          "userId", delta, reason, "coachBookingId", note
        )
        VALUES (
          v_booking."userId",
          v_refunded_amount,
          'reversal',
          v_booking.id,
          CASE
            WHEN v_refunded_amount < v_redeemed THEN
              format(
                'Canceled 24+ hours before session — refunded %s of %s credits (balance cap %s).',
                v_refunded_amount,
                v_redeemed,
                public.premium_credit_balance_cap()
              )
            ELSE
              'Canceled 24+ hours before session — credits refunded.'
          END
        );
      ELSE
        -- Qualifies for refund but already at cap — record $0 via note-only? skip row (delta<>0).
        v_refunded_amount := 0;
      END IF;
    ELSE
      SELECT delta INTO v_refunded_amount
      FROM public."premiumCreditLedger"
      WHERE "coachBookingId" = v_booking.id AND reason = 'reversal';
      v_refunded_amount := COALESCE(v_refunded_amount, 0);
    END IF;
  END IF;

  UPDATE public."coachBooking"
  SET status = 'cancelled',
      "cancelledAt" = now()
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', v_booking.id,
    'refunded', CASE
      WHEN v_booking."paymentSource" = 'referral_credit' THEN v_refunded_amount > 0
      ELSE v_refund
    END,
    'refundedAmount', v_refunded_amount,
    'googleEventId', v_booking."googleEventId",
    'meetLink', v_booking."meetLink",
    'scheduledAt', v_booking."scheduledAt",
    'assignedCoachEmail', v_booking."assignedCoachEmail",
    'durationMinutes', COALESCE(v_booking."durationMinutes", 30),
    'userId', v_booking."userId",
    'balance', public.available_premium_credits(v_booking."userId"),
    'paymentSource', v_booking."paymentSource",
    'referralCredits', public.available_referral_coach_credits(v_booking."userId")
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_one_on_one_booking(TIMESTAMPTZ, INT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_one_on_one_booking(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_one_on_one_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_one_on_one_booking(UUID) TO service_role;

COMMENT ON FUNCTION public.cancel_one_on_one_booking(UUID) IS
  'NCLDD-31/56: cancel confirmed 1:1; 24h+ before the session refunds Premium credits (clamped to cap 6) or the referral credit (in full).';
