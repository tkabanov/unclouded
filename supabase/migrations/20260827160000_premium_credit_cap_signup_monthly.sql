-- NCLDD-31 §3 / CL-1 — Premium credit cap 6, signup +2, monthly +1 on 1st;
-- cancel refunds clamped to cap (G5). Keeps premiumCreditLedger as the wallet.

-- ---------------------------------------------------------------------------
-- Ledger reason vocabulary
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'premiumCreditLedger'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%reason%'
  LOOP
    EXECUTE format('ALTER TABLE public."premiumCreditLedger" DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public."premiumCreditLedger"
  ADD CONSTRAINT "premiumCreditLedger_reason_check"
  CHECK (reason IN (
    'accrual',
    'signup_grant',
    'monthly_accrual',
    'hold',
    'holdRelease',
    'redemption',
    'expiry',
    'reversal',
    'adminAdjustment'
  ));

-- One Premium signup grant per user (CL-1).
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_credit_signup_once
  ON public."premiumCreditLedger" ("userId")
  WHERE reason = 'signup_grant';

-- One monthly accrual per user per calendar month (stripeInvoiceId stores YYYY-MM).
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_credit_monthly_once
  ON public."premiumCreditLedger" ("userId", "stripeInvoiceId")
  WHERE reason = 'monthly_accrual' AND "stripeInvoiceId" IS NOT NULL;

CREATE OR REPLACE FUNCTION public.premium_credit_balance_cap()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 6;
$$;

COMMENT ON FUNCTION public.premium_credit_balance_cap() IS
  'CL-1 / OVR-059: max coaching credit balance (3 sessions × 2 credits).';

CREATE OR REPLACE FUNCTION public.premium_credit_room(p_user_id UUID)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    0,
    public.premium_credit_balance_cap() - public.available_premium_credits(p_user_id)
  )::integer;
$$;

REVOKE ALL ON FUNCTION public.premium_credit_balance_cap() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premium_credit_balance_cap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.premium_credit_balance_cap() TO service_role;
REVOKE ALL ON FUNCTION public.premium_credit_room(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.premium_credit_room(UUID) TO service_role;

/**
 * Insert a positive ledger grant clamped so balance never exceeds the cap.
 * Returns granted delta (0 if at cap or not premium when required).
 */
CREATE OR REPLACE FUNCTION public.billing_insert_capped_credit_grant(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT,
  p_stripe_invoice_id TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_require_premium BOOLEAN DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room integer;
  v_grant integer;
  v_inserted integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'delta_must_be_positive';
  END IF;

  IF p_require_premium AND public.effective_user_tier(p_user_id) <> 'premium' THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'not_premium',
      'granted', 0,
      'balance', public.available_premium_credits(p_user_id)
    );
  END IF;

  v_room := public.premium_credit_room(p_user_id);
  v_grant := LEAST(p_delta, v_room);

  IF v_grant <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'capped',
      'granted', 0,
      'balance', public.available_premium_credits(p_user_id)
    );
  END IF;

  BEGIN
    INSERT INTO public."premiumCreditLedger" (
      "userId", delta, reason, "stripeInvoiceId", note
    )
    VALUES (
      p_user_id,
      v_grant,
      p_reason,
      NULLIF(btrim(COALESCE(p_stripe_invoice_id, '')), ''),
      p_note
    );
    v_inserted := 1;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'status', 'duplicate',
        'granted', 0,
        'balance', public.available_premium_credits(p_user_id)
      );
  END;

  RETURN jsonb_build_object(
    'status', CASE WHEN v_inserted > 0 THEN 'granted' ELSE 'duplicate' END,
    'granted', v_grant,
    'requested', p_delta,
    'balance', public.available_premium_credits(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_insert_capped_credit_grant(UUID, INT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_insert_capped_credit_grant(UUID, INT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;

/**
 * CL-1 signup grant: +2 once when user becomes Premium.
 */
CREATE OR REPLACE FUNCTION public.billing_ensure_premium_signup_credits(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.billing_insert_capped_credit_grant(
    p_user_id,
    2,
    'signup_grant',
    NULL,
    'Premium sign-up — 2 coaching credits pre-loaded.',
    true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_ensure_premium_signup_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_ensure_premium_signup_credits(UUID) TO service_role;

/**
 * Legacy invoice-paid entrypoint: no longer grants +1 per invoice.
 * Ensures signup +2 once (idempotent). Subsequent invoices are no-ops for credits.
 */
CREATE OR REPLACE FUNCTION public.billing_grant_premium_credit(
  p_user_id UUID,
  p_stripe_invoice_id TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  -- Invoice id retained for logging/compat; monthly accrual is calendar-based.
  v_result := public.billing_ensure_premium_signup_credits(p_user_id);

  RETURN jsonb_build_object(
    'status', COALESCE(v_result ->> 'status', 'skipped'),
    'granted', COALESCE((v_result ->> 'granted')::integer, 0),
    'balance', public.available_premium_credits(p_user_id),
    'mode', 'signup_grant_only',
    'invoiceId', NULLIF(btrim(COALESCE(p_stripe_invoice_id, '')), ''),
    'note', COALESCE(p_note, 'CL-1: invoice no longer grants monthly credits')
  );
END;
$$;

/**
 * Accrue +1 for every effective-Premium user for the given calendar month (UTC).
 * Idempotent via unique (userId, period key). Safe to call daily; only inserts once.
 */
CREATE OR REPLACE FUNCTION public.billing_run_monthly_premium_credit_accrual(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text := to_char(timezone('utc', p_as_of), 'YYYY-MM');
  v_day integer := EXTRACT(DAY FROM timezone('utc', p_as_of))::integer;
  v_user record;
  v_result jsonb;
  v_granted integer := 0;
  v_capped integer := 0;
  v_skipped integer := 0;
  v_duplicate integer := 0;
  v_considered integer := 0;
BEGIN
  -- Only run accrual on the 1st (UTC). Other days return early.
  IF v_day <> 1 THEN
    RETURN jsonb_build_object(
      'status', 'skipped',
      'reason', 'not_first_of_month',
      'periodMonth', v_period,
      'day', v_day
    );
  END IF;

  FOR v_user IN
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE public.effective_user_tier(p.id) = 'premium'
  LOOP
    v_considered := v_considered + 1;
    v_result := public.billing_insert_capped_credit_grant(
      v_user.user_id,
      1,
      'monthly_accrual',
      v_period,
      format('Monthly coaching credit accrual for %s.', v_period),
      true
    );

    CASE v_result ->> 'status'
      WHEN 'granted' THEN v_granted := v_granted + 1;
      WHEN 'capped' THEN v_capped := v_capped + 1;
      WHEN 'duplicate' THEN v_duplicate := v_duplicate + 1;
      ELSE v_skipped := v_skipped + 1;
    END CASE;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'ok',
    'periodMonth', v_period,
    'considered', v_considered,
    'granted', v_granted,
    'capped', v_capped,
    'duplicate', v_duplicate,
    'skipped', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.billing_run_monthly_premium_credit_accrual(TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_run_monthly_premium_credit_accrual(TIMESTAMPTZ)
  TO service_role;

-- ---------------------------------------------------------------------------
-- Cancel refund: clamp reversal so balance never exceeds cap (G5)
-- ---------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.cancel_one_on_one_booking(UUID) IS
  'NCLDD-31: cancel confirmed 1:1; refund credits if 24+ hours before session (clamped to balance cap 6).';
