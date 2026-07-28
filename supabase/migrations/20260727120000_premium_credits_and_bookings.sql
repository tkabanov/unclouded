-- Individual Subscription Management Flow — credit redemption and session booking.
--
-- 1:1 sessions cost 2 Premium credits. Requesting a booking places a hold so the
-- same credits cannot be spent twice while the session is unconfirmed; the hold
-- becomes a redemption once the provider confirms, or is released if the booking
-- falls through.
--
-- Group sessions are a Pro entitlement capped at one per calendar month.

-- ---------------------------------------------------------------------------
-- 1:1 bookings
-- ---------------------------------------------------------------------------

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "creditsRequired" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "externalBookingRef" TEXT NULL;

-- Existing rows predate the status vocabulary below.
UPDATE public."coachBooking"
SET status = 'pending'
WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public."coachBooking"
  DROP CONSTRAINT IF EXISTS coach_booking_status_check;

ALTER TABLE public."coachBooking"
  ADD CONSTRAINT coach_booking_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));

CREATE INDEX IF NOT EXISTS idx_coach_booking_pending
  ON public."coachBooking" ("userId", status)
  WHERE status = 'pending';

/**
 * Request a 1:1 session.
 *
 * Requires effective Premium and enough credits, then reserves the credits with
 * a `hold` row. The hold is what stops a second booking from spending the same
 * credits while the first is still unconfirmed.
 */
CREATE OR REPLACE FUNCTION public.request_one_on_one_booking(
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
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
  v_booking_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Serialize a user's booking requests so two clicks cannot both pass the
  -- balance check before either has written its hold.
  PERFORM pg_advisory_xact_lock(hashtext('one_on_one_booking'), hashtext(v_user_id::text));

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
      -- Wording matches `insufficientCreditsError` in subscriptionCopy.ts.
      'error', format(
        'You need two credits to book a 30-minute 1:1 session. You currently have %s credit%s.',
        v_balance,
        CASE WHEN v_balance = 1 THEN '' ELSE 's' END
      )
    );
  END IF;

  INSERT INTO public."coachBooking" ("userId", "scheduledAt", status, "creditsRequired")
  VALUES (v_user_id, p_scheduled_at, 'pending', v_required)
  RETURNING id INTO v_booking_id;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "coachBookingId", note)
  VALUES (
    v_user_id,
    -v_required,
    'hold',
    v_booking_id,
    'Reserved for a 1:1 session pending confirmation.'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', v_booking_id,
    'balance', public.available_premium_credits(v_user_id),
    'required', v_required
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_one_on_one_booking(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_one_on_one_booking(TIMESTAMPTZ) TO authenticated;

/**
 * Convert a confirmed booking's hold into a redemption.
 *
 * Idempotent: the unique index on (coachBookingId, reason) means a second call
 * cannot deduct the credits again.
 */
CREATE OR REPLACE FUNCTION public.redeem_premium_credits_for_booking(p_booking_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public."coachBooking"%ROWTYPE;
  v_held integer;
BEGIN
  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_found');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'not_confirmed',
      'error', 'Credits are only redeemed once the session is confirmed.'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."premiumCreditLedger"
    WHERE "coachBookingId" = p_booking_id AND reason = 'redemption'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'code', 'already_redeemed');
  END IF;

  SELECT -delta INTO v_held
  FROM public."premiumCreditLedger"
  WHERE "coachBookingId" = p_booking_id AND reason = 'hold';

  IF v_held IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_hold');
  END IF;

  -- Release then redeem so the ledger reads honestly and the net balance change
  -- from a confirmation is zero: the credits left the balance at hold time.
  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "coachBookingId", note)
  VALUES (v_booking."userId", v_held, 'holdRelease', p_booking_id, 'Hold converted on confirmation.');

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "coachBookingId", note)
  VALUES (v_booking."userId", -v_held, 'redemption', p_booking_id, 'Redeemed for a 1:1 session.');

  RETURN jsonb_build_object(
    'ok', true,
    'redeemed', v_held,
    'balance', public.available_premium_credits(v_booking."userId")
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_premium_credits_for_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_premium_credits_for_booking(UUID) TO service_role;

/** Give the credits back when a pending booking never happens. */
CREATE OR REPLACE FUNCTION public.release_one_on_one_booking_hold(
  p_booking_id UUID,
  p_note TEXT DEFAULT 'Booking cancelled — credits returned.'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public."coachBooking"%ROWTYPE;
  v_held integer;
BEGIN
  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."premiumCreditLedger"
    WHERE "coachBookingId" = p_booking_id AND reason IN ('redemption', 'holdRelease')
  ) THEN
    RETURN jsonb_build_object('ok', true, 'code', 'nothing_to_release');
  END IF;

  SELECT -delta INTO v_held
  FROM public."premiumCreditLedger"
  WHERE "coachBookingId" = p_booking_id AND reason = 'hold';

  IF v_held IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', 'no_hold');
  END IF;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, "coachBookingId", note)
  VALUES (v_booking."userId", v_held, 'holdRelease', p_booking_id, p_note);

  UPDATE public."coachBooking"
  SET status = 'cancelled',
      "cancelledAt" = now()
  WHERE id = p_booking_id AND status = 'pending';

  RETURN jsonb_build_object(
    'ok', true,
    'released', v_held,
    'balance', public.available_premium_credits(v_booking."userId")
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_one_on_one_booking_hold(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_one_on_one_booking_hold(UUID, TEXT) TO service_role;

-- Direct INSERT is no longer the supported path: `request_one_on_one_booking`
-- is, because it is the only thing that writes the credit hold. The policy is
-- tightened rather than removed so a stray client insert still cannot create a
-- booking without Premium and a sufficient balance.
DROP POLICY IF EXISTS "Premium owner inserts coachBooking" ON public."coachBooking";
CREATE POLICY "Premium owner with credits inserts coachBooking" ON public."coachBooking"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND public.my_effective_tier() = 'premium'
    AND public.my_premium_credit_balance() >= public.credits_per_one_on_one_session()
  );

-- ---------------------------------------------------------------------------
-- Group sessions — one per calendar month on Pro and Premium
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."groupSessionBooking" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'YYYY-MM' in UTC: the calendar month the entitlement was spent in.
  "periodMonth" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'confirmed', 'cancelled', 'completed')),
  "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "scheduledAt" TIMESTAMPTZ NULL,
  "cancelledAt" TIMESTAMPTZ NULL
);

-- One active group session per user per calendar month (AC: Pro includes one).
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_session_one_per_month
  ON public."groupSessionBooking" ("userId", "periodMonth")
  WHERE status <> 'cancelled';

CREATE INDEX IF NOT EXISTS idx_group_session_user_requested
  ON public."groupSessionBooking" ("userId", "requestedAt" DESC);

ALTER TABLE public."groupSessionBooking" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own group session bookings" ON public."groupSessionBooking";
CREATE POLICY "Owner reads own group session bookings"
  ON public."groupSessionBooking" FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId") OR public.is_settings_admin());

GRANT SELECT ON public."groupSessionBooking" TO authenticated;
GRANT ALL ON public."groupSessionBooking" TO service_role;

/**
 * Request the monthly group session.
 *
 * Enforced server-side: Pro or Premium effective tier, and at most one active
 * request per calendar month.
 */
CREATE OR REPLACE FUNCTION public.request_group_session_booking()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tier text;
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_booking_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_tier := public.effective_user_tier(v_user_id);

  IF v_tier NOT IN ('pro', 'premium') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'upgrade_required',
      'error', 'Group coaching sessions are available on Pro and Premium.'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('group_session_booking'), hashtext(v_user_id::text));

  IF EXISTS (
    SELECT 1 FROM public."groupSessionBooking"
    WHERE "userId" = v_user_id
      AND "periodMonth" = v_month
      AND status <> 'cancelled'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'monthly_limit_reached',
      'periodMonth', v_month,
      'error', 'You have already used your group session for this month.'
    );
  END IF;

  INSERT INTO public."groupSessionBooking" ("userId", "periodMonth")
  VALUES (v_user_id, v_month)
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'ok', true,
    'bookingId', v_booking_id,
    'periodMonth', v_month
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_group_session_booking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_group_session_booking() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_group_session_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'periodMonth', to_char(timezone('utc', now()), 'YYYY-MM'),
    'used', EXISTS (
      SELECT 1 FROM public."groupSessionBooking"
      WHERE "userId" = auth.uid()
        AND "periodMonth" = to_char(timezone('utc', now()), 'YYYY-MM')
        AND status <> 'cancelled'
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_group_session_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_group_session_status() TO authenticated;
