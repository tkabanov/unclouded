-- NCLDD-31 §4 / §7 — Cancel confirmed internal 1:1 bookings + 24h credit refund.

/**
 * Cancel an upcoming confirmed 1:1 booking owned by the caller (or settings admin).
 * Frees the specialist slot via status change (partial unique index excludes cancelled).
 * Refunds session credits when cancellation is 24+ hours before scheduledAt.
 * Returns googleEventId so the edge function can delete the Calendar event.
 */
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
      ),
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

  IF v_refund THEN
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
      INSERT INTO public."premiumCreditLedger" (
        "userId", delta, reason, "coachBookingId", note
      )
      VALUES (
        v_booking."userId",
        v_redeemed,
        'reversal',
        v_booking.id,
        'Canceled 24+ hours before session — credits refunded.'
      );
      v_refunded_amount := v_redeemed;
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
    'refunded', v_refund,
    'refundedAmount', v_refunded_amount,
    'googleEventId', v_booking."googleEventId",
    'meetLink', v_booking."meetLink",
    'scheduledAt', v_booking."scheduledAt",
    'assignedCoachEmail', v_booking."assignedCoachEmail",
    'durationMinutes', COALESCE(v_booking."durationMinutes", 30),
    'userId', v_booking."userId",
    'balance', public.available_premium_credits(v_booking."userId")
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_one_on_one_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_one_on_one_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_one_on_one_booking(UUID) TO service_role;

COMMENT ON FUNCTION public.cancel_one_on_one_booking(UUID) IS
  'NCLDD-31: cancel confirmed 1:1; refund credits if 24+ hours before session; returns googleEventId for Calendar delete.';
