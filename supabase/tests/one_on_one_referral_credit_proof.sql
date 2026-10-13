-- Proof for NCLDD-56 slice 3 (20261013170000_one_on_one_referral_credit).
-- Run AFTER 20261013150000, 20261013160000 and 20261013170000, as postgres (SQL editor).
-- Self-contained: throwaway users / coach inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'one-on-one referral credit proof: ALL PASS'.
--
-- F = Free user with one referral credit, P = Premium user with 2 Premium credits + 1 referral
-- credit, X = Free user without credits, L = referrer whose friend's payment gets disputed.
-- S = coach with open availability.

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000058f1', 'proof-oo-f@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000058f2', 'proof-oo-p@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000058f3', 'proof-oo-x@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000058f4', 'proof-oo-l@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-oo-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."userSubscription"
  ("userId", "planTier", status, "billingInterval", "currentPeriodStart", "currentPeriodEnd")
VALUES ('00000000-0000-4000-8000-0000000058f2', 'premium', 'active', 'month',
        now() - interval '1 day', now() + interval '29 days');

INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, note)
VALUES ('00000000-0000-4000-8000-0000000058f2', 2, 'adminAdjustment', 'proof');

INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, note) VALUES
  ('00000000-0000-4000-8000-0000000058f1', 1, 'admin_adjustment', 'proof'),
  ('00000000-0000-4000-8000-0000000058f2', 1, 'admin_adjustment', 'proof');

INSERT INTO public."specialist" (id, name, email)
VALUES ('00000000-0000-4000-8000-0000000058c0', 'Proof Coach', 'proof-oo-coach@unclouded.invalid');

INSERT INTO public."specialistAvailability" ("specialistId", "startsAt", "endsAt", "durationMinutes")
VALUES ('00000000-0000-4000-8000-0000000058c0',
        date_trunc('hour', now()) + interval '1 hour',
        date_trunc('hour', now()) + interval '10 days',
        30);

CREATE TEMP TABLE proof_slots ON COMMIT DROP AS
SELECT
  date_trunc('hour', now()) + interval '3 days' AS far_a,
  date_trunc('hour', now()) + interval '4 days' AS far_b,
  date_trunc('hour', now()) + interval '5 hours' AS near,
  date_trunc('hour', now()) + interval '6 days' AS p_a,
  date_trunc('hour', now()) + interval '7 days' AS p_b,
  date_trunc('hour', now()) + interval '8 days' AS l_a;
GRANT SELECT ON proof_slots TO authenticated;

DO $$
BEGIN
  ASSERT public.effective_user_tier('00000000-0000-4000-8000-0000000058f1') <> 'premium',
    'setup: F must not be Premium';
  ASSERT public.effective_user_tier('00000000-0000-4000-8000-0000000058f2') = 'premium',
    'setup: P must be Premium';
END $$;

-- ---------------------------------------------------------------------------
-- 1. Free user books with a referral credit; second booking needs Premium again.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_result jsonb;
  v_booking uuid;
BEGIN
  ASSERT public.my_referral_coach_credit_balance() = 1, 'F sees own referral balance';

  v_result := public.confirm_one_on_one_booking(
    (SELECT far_a FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT (v_result ->> 'ok')::boolean, 'F must book with the referral credit: ' || v_result::text;
  ASSERT v_result ->> 'paymentSource' = 'referral_credit', 'booking paid by referral credit';
  ASSERT (v_result ->> 'referralCredits')::int = 0, 'referral credit spent';
  ASSERT public.my_referral_coach_credit_balance() = 0, 'F balance is 0 after booking';

  v_result := public.confirm_one_on_one_booking(
    (SELECT far_b FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT v_result ->> 'code' = 'premium_required',
    'without referral credits a Free user is back to the Premium rule';

  -- 2. Cancel 24h+ before: the referral credit comes back, once.
  v_booking := (SELECT id FROM public."coachBooking"
                WHERE "userId" = '00000000-0000-4000-8000-0000000058f1' AND status = 'confirmed');
  v_result := public.cancel_one_on_one_booking(v_booking);
  ASSERT (v_result ->> 'refunded')::boolean AND (v_result ->> 'refundedAmount')::int = 1,
    'early cancel refunds the referral credit: ' || v_result::text;
  v_result := public.cancel_one_on_one_booking(v_booking);
  ASSERT v_result ->> 'code' = 'already_cancelled' AND (v_result ->> 'refunded')::boolean,
    'repeat cancel reports the refund';
  ASSERT public.my_referral_coach_credit_balance() = 1, 'credit returned exactly once';

  -- 3. Cancel within 24h: no refund.
  v_result := public.confirm_one_on_one_booking(
    (SELECT near FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT (v_result ->> 'ok')::boolean, 'F books again with the returned credit: ' || v_result::text;
  v_result := public.cancel_one_on_one_booking((v_result ->> 'bookingId')::uuid);
  ASSERT NOT (v_result ->> 'refunded')::boolean, 'late cancel keeps the credit spent';
  ASSERT public.my_referral_coach_credit_balance() = 0, 'F balance stays 0';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Premium user: referral credit is spent first, Premium credits after.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.confirm_one_on_one_booking(
    (SELECT p_a FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT (v_result ->> 'ok')::boolean AND v_result ->> 'paymentSource' = 'referral_credit',
    'Premium user spends the referral credit first: ' || v_result::text;
  ASSERT (v_result ->> 'balance')::int = 2, 'Premium credits untouched';

  v_result := public.confirm_one_on_one_booking(
    (SELECT p_b FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT (v_result ->> 'ok')::boolean AND v_result ->> 'paymentSource' = 'premium_credits',
    'then Premium credits pay: ' || v_result::text;
  ASSERT (v_result ->> 'balance')::int = 0, 'two Premium credits spent';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. Isolation: X sees only own balance; anon cannot call; ledger rows are consistent.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f3","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f3', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  ASSERT public.my_referral_coach_credit_balance() = 0, 'X has no referral credits';
  v_result := public.confirm_one_on_one_booking(
    (SELECT far_b FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0');
  ASSERT v_result ->> 'code' = 'premium_required', 'X cannot book';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.my_referral_coach_credit_balance();
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'anon must not call my_referral_coach_credit_balance';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- ---------------------------------------------------------------------------
-- 6. Regression: a forged booking cannot be inserted directly (it could be cancelled for credits).
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public."coachBooking" ("userId", "scheduledAt", status, "paymentSource")
    VALUES ('00000000-0000-4000-8000-0000000058f2', now() + interval '3 days', 'confirmed', 'referral_credit');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'direct coachBooking INSERT must be denied';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- ---------------------------------------------------------------------------
-- 7. Regression: cancelling cannot launder a credit taken back by a dispute; a won dispute
--    still gives it back.
-- ---------------------------------------------------------------------------
INSERT INTO public."billingInvoicePayment"
  ("stripeInvoiceId", "userId", "stripeChargeId", "amountPaidCents", currency, "tierSlug", "paidAt")
VALUES ('in_proof_oo_l', '00000000-0000-4000-8000-0000000058f3', 'ch_proof_oo_l', 2900, 'usd', 'pro', now());

INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, "referredUserId", "stripeInvoiceId", note)
VALUES ('00000000-0000-4000-8000-0000000058f4', 1, 'referral_reward', '00000000-0000-4000-8000-0000000058f3',
        'in_proof_oo_l', 'proof');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f4","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

-- Users cannot create temp tables; carry the booking id in a transaction-local setting.
SELECT set_config('proof.l_booking', public.confirm_one_on_one_booking(
  (SELECT l_a FROM proof_slots), 30, '00000000-0000-4000-8000-0000000058c0') ->> 'bookingId', true);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- Friend's payment disputed while L's credit is spent → reversal recorded as 0.
SELECT public.referral_record_payment_reversal('in_proof_oo_l', 'ch_proof_oo_l', NULL, 2900);

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000058f4","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000058f4', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_result jsonb;
BEGIN
  ASSERT nullif(current_setting('proof.l_booking', true), '')::uuid IS NOT NULL, 'L booked with the referral credit';
  v_result := public.cancel_one_on_one_booking(nullif(current_setting('proof.l_booking', true), '')::uuid);
  ASSERT (v_result ->> 'ok')::boolean AND NOT (v_result ->> 'refunded')::boolean,
    'cancel must not return a credit already taken back: ' || v_result::text;
  ASSERT public.my_referral_coach_credit_balance() = 0, 'L balance stays 0 after cancel';

  v_result := public.cancel_one_on_one_booking(nullif(current_setting('proof.l_booking', true), '')::uuid);
  ASSERT NOT (v_result ->> 'refunded')::boolean, 'already_cancelled reports no refund';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

SELECT public.referral_record_payment_reversal('in_proof_oo_l', 'ch_proof_oo_l', NULL, 0);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000058f4') = 1,
    'won dispute gives L the credit back exactly once';
END $$;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralCoachCreditLedger"
          WHERE "userId" = '00000000-0000-4000-8000-0000000058f1' AND reason = 'redemption') = 2
     AND (SELECT count(*) FROM public."referralCoachCreditLedger"
          WHERE "userId" = '00000000-0000-4000-8000-0000000058f1' AND reason = 'cancel_refund') = 1,
    'F ledger: two redemptions, one cancel refund';
  ASSERT NOT EXISTS (SELECT 1 FROM public."premiumCreditLedger"
                     WHERE "userId" = '00000000-0000-4000-8000-0000000058f1'),
    'referral bookings never touch the Premium ledger';
  ASSERT (SELECT count(*) FROM public."coachBooking"
          WHERE "userId" = '00000000-0000-4000-8000-0000000058f2'
            AND "paymentSource" = 'premium_credits' AND "creditsRequired" = 2) = 1
     AND (SELECT count(*) FROM public."coachBooking"
          WHERE "userId" = '00000000-0000-4000-8000-0000000058f2'
            AND "paymentSource" = 'referral_credit' AND "creditsRequired" = 0) = 1,
    'paymentSource / creditsRequired recorded per booking';
END $$;

SELECT 'one-on-one referral credit proof: ALL PASS' AS result;

ROLLBACK;
