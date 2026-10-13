-- Proof for NCLDD-56 slice 2 (20261013160000_referral_rewards_ledgers).
-- Run AFTER 20261013150000 and 20261013160000, as postgres (SQL editor).
-- Self-contained: throwaway auth users inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral rewards proof: ALL PASS'.
--
-- R  = organic referrer; U, U2, U3, U4, U5 = referred by R
--      (U4 is later also attached to P1 by an admin; U5 converted before the program).
-- P1 = partner (lifetime terms later), W  = client of P1.
-- P2 = partner (months terms),         W2 = client of P2.
-- P3 = partner (first_payment terms),  W3 = client of P3.
-- A  = admin, X = plain user.

BEGIN;

INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode") VALUES
  ('00000000-0000-4000-8000-0000000057b1', 'Proof P1', 'other', 'proof-rw-p1@unclouded.invalid', 'active', 'PRWPRTA2'),
  ('00000000-0000-4000-8000-0000000057b2', 'Proof P2', 'other', 'proof-rw-p2@unclouded.invalid', 'active', 'PRWPRTB2'),
  ('00000000-0000-4000-8000-0000000057b3', 'Proof P3', 'other', 'proof-rw-p3@unclouded.invalid', 'active', 'PRWPRTC2');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000057a1', 'proof-rw-r@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000057ad', 'proof-rw-admin@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000057a9', 'proof-rw-x@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-rw-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "referralCode" = 'PRWREF22' WHERE id = '00000000-0000-4000-8000-0000000057a1';
UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000057ad';

-- Signups through handle_new_user, so attribution lands in the registry the real way.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000057a2', 'proof-rw-u@unclouded.invalid',  '{"referral_code":"PRWREF22"}'),
  ('00000000-0000-4000-8000-0000000057a3', 'proof-rw-u2@unclouded.invalid', '{"referral_code":"PRWREF22"}'),
  ('00000000-0000-4000-8000-0000000057a4', 'proof-rw-u3@unclouded.invalid', '{"referral_code":"PRWREF22"}'),
  ('00000000-0000-4000-8000-0000000057a5', 'proof-rw-u4@unclouded.invalid', '{"referral_code":"PRWREF22"}'),
  ('00000000-0000-4000-8000-0000000057a6', 'proof-rw-u5@unclouded.invalid', '{"referral_code":"PRWREF22"}'),
  ('00000000-0000-4000-8000-0000000057c1', 'proof-rw-w@unclouded.invalid',  '{"referral_code":"PRWPRTA2"}'),
  ('00000000-0000-4000-8000-0000000057c2', 'proof-rw-w2@unclouded.invalid', '{"referral_code":"PRWPRTB2"}'),
  ('00000000-0000-4000-8000-0000000057c3', 'proof-rw-w3@unclouded.invalid', '{"referral_code":"PRWPRTC2"}'),
  ('00000000-0000-4000-8000-0000000057c4', 'proof-rw-w4@unclouded.invalid', '{"referral_code":"PRWPRTC2"}');

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralAttribution"
          WHERE "referredByUserId" = '00000000-0000-4000-8000-0000000057a1') = 5,
    'setup: U..U5 must be attributed to R';
  ASSERT (SELECT "referralPartnerId" = '00000000-0000-4000-8000-0000000057b1'
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000057c1'),
    'setup: W must be attributed to P1';
END $$;

-- ---------------------------------------------------------------------------
-- 1. B2C: one credit on the first qualifying payment; redelivery and renewals add nothing.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_invoice_payment('in_proof_u1', '00000000-0000-4000-8000-0000000057a2',
  'sub_u', 'ch_proof_u1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '20 days');
SELECT public.referral_record_invoice_payment('in_proof_u1', '00000000-0000-4000-8000-0000000057a2',
  'sub_u', 'ch_proof_u1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '20 days');
SELECT public.referral_record_invoice_payment('in_proof_u2', '00000000-0000-4000-8000-0000000057a2',
  'sub_u', 'ch_proof_u2', 2900, 'usd', 'pro', 'subscription_cycle', now());

-- U2: $0 trial invoice first (no reward), then a Premium payment (reward).
SELECT public.referral_record_invoice_payment('in_proof_u2_trial', '00000000-0000-4000-8000-0000000057a3',
  'sub_u2', NULL, 0, 'usd', 'premium', 'subscription_create', now() - interval '10 days');

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 1,
    'R must have exactly one credit after U paid twice (+ redelivery) and U2 only trialed';
  ASSERT (SELECT count(*) FROM public."billingInvoicePayment"
          WHERE "stripeInvoiceId" LIKE 'in_proof_u%') = 3,
    'payments must be recorded once each';
END $$;

SELECT public.referral_record_invoice_payment('in_proof_u2_paid', '00000000-0000-4000-8000-0000000057a3',
  'sub_u2', 'ch_proof_u2_paid', 7900, 'usd', 'premium', 'subscription_cycle', now() - interval '3 days');

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 2,
    'U2 first paid Premium invoice must grant the second credit';
  ASSERT (SELECT "referredUserId" = '00000000-0000-4000-8000-0000000057a3'
                 AND "stripeInvoiceId" = 'in_proof_u2_paid'
          FROM public."referralCoachCreditLedger"
          WHERE reason = 'referral_reward' AND "referredUserId" = '00000000-0000-4000-8000-0000000057a3'),
    'reward must link the referred user and the qualifying invoice';
  ASSERT NOT EXISTS (SELECT 1 FROM public."referralPartnerCommission"
                     WHERE "referredUserId" IN ('00000000-0000-4000-8000-0000000057a2',
                                                '00000000-0000-4000-8000-0000000057a3')),
    'organic referrals must not create partner commissions';
END $$;

-- ---------------------------------------------------------------------------
-- 2. B2B without terms: commission row waits, no amount.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_invoice_payment('in_proof_w1', '00000000-0000-4000-8000-0000000057c1',
  'sub_w', 'ch_proof_w1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '30 days');

DO $$
BEGIN
  ASSERT (SELECT status = 'pending_terms' AND "commissionCents" IS NULL
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w1'),
    'no terms: commission must be pending without an amount';
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057c1') = 0
     AND NOT EXISTS (SELECT 1 FROM public."referralCoachCreditLedger"
                     WHERE "referredUserId" = '00000000-0000-4000-8000-0000000057c1'),
    'partner referrals must not create B2C credits';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Terms: non-admin is rejected; admin confirms; waiting rows are evaluated.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057a9","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057a9', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  v_blocked := false;
  BEGIN
    PERFORM public.admin_confirm_referral_partner_terms(
      '00000000-0000-4000-8000-0000000057b1', 20, 'lifetime', NULL, now() - interval '1 year', NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin must not confirm terms';

  -- 10. Isolation for a plain user.
  ASSERT (SELECT count(*) FROM public."billingInvoicePayment") = 0, 'user must not read payments';
  ASSERT (SELECT count(*) FROM public."referralCoachCreditLedger") = 0, 'user must not read credit ledger';
  ASSERT (SELECT count(*) FROM public."referralPartnerTerms") = 0, 'user must not read terms';
  ASSERT (SELECT count(*) FROM public."referralPartnerCommission") = 0, 'user must not read commissions';

  v_blocked := false;
  BEGIN
    PERFORM public.referral_record_invoice_payment('in_proof_fake', '00000000-0000-4000-8000-0000000057a9',
      'sub_x', NULL, 999999, 'usd', 'premium', 'subscription_create', now());
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not call the webhook RPC';

  v_blocked := false;
  BEGIN
    PERFORM public.referral_record_payment_reversal('in_proof_w1', NULL, 2900, NULL);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not call the reversal RPC';

  v_blocked := false;
  BEGIN
    PERFORM public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not read another user credit balance';

  v_blocked := false;
  BEGIN
    INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason)
    VALUES ('00000000-0000-4000-8000-0000000057a9', 1, 'admin_adjustment');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not write the credit ledger';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_confirm_referral_partner_terms(
  '00000000-0000-4000-8000-0000000057b1', 20, 'lifetime', NULL, now() - interval '1 year', 'Proof lifetime 20%');
SELECT public.admin_confirm_referral_partner_terms(
  '00000000-0000-4000-8000-0000000057b2', 10, 'months', 1, now() - interval '1 year', 'Proof 1 month 10%');
SELECT public.admin_confirm_referral_partner_terms(
  '00000000-0000-4000-8000-0000000057b3', 50, 'first_payment', NULL, now() - interval '1 year', 'Proof first 50%');

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralPartnerCommission") >= 1,
    'admin must read commissions (control)';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

DO $$
BEGIN
  ASSERT (SELECT status = 'accrued' AND "commissionCents" = 580 AND "commissionPercent" = 20
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w1'),
    'confirming terms must accrue the waiting payment (20% of 2900)';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Scopes: lifetime keeps accruing; months stops after N months; first_payment once.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_invoice_payment('in_proof_w2', '00000000-0000-4000-8000-0000000057c1',
  'sub_w', 'ch_proof_w2', 2900, 'usd', 'pro', 'subscription_cycle', now());

SELECT public.referral_record_invoice_payment('in_proof_w2a', '00000000-0000-4000-8000-0000000057c2',
  'sub_w2', 'ch_proof_w2a', 2900, 'usd', 'pro', 'subscription_create', now() - interval '60 days');
SELECT public.referral_record_invoice_payment('in_proof_w2b', '00000000-0000-4000-8000-0000000057c2',
  'sub_w2', 'ch_proof_w2b', 2900, 'usd', 'pro', 'subscription_cycle', now() - interval '45 days');
SELECT public.referral_record_invoice_payment('in_proof_w2c', '00000000-0000-4000-8000-0000000057c2',
  'sub_w2', 'ch_proof_w2c', 2900, 'usd', 'pro', 'subscription_cycle', now());

SELECT public.referral_record_invoice_payment('in_proof_w3a', '00000000-0000-4000-8000-0000000057c3',
  'sub_w3', 'ch_proof_w3a', 7900, 'usd', 'premium', 'subscription_create', now() - interval '40 days');
SELECT public.referral_record_invoice_payment('in_proof_w3b', '00000000-0000-4000-8000-0000000057c3',
  'sub_w3', 'ch_proof_w3b', 7900, 'usd', 'premium', 'subscription_cycle', now());
SELECT public.referral_record_invoice_payment('in_proof_w4_cycle', '00000000-0000-4000-8000-0000000057c4',
  'sub_w4', 'ch_proof_w4_cycle', 7900, 'usd', 'premium', 'subscription_cycle', now());

DO $$
BEGIN
  ASSERT (SELECT status = 'accrued' AND "commissionCents" = 580
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'lifetime: renewal must accrue';
  ASSERT (SELECT status = 'accrued' AND "commissionCents" = 290
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2a'),
    'months: first payment accrues 10%';
  ASSERT (SELECT status = 'accrued'
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2b'),
    'months: payment inside the window accrues';
  ASSERT (SELECT status = 'out_of_scope' AND "commissionCents" IS NULL
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2c'),
    'months: payment after the window is out of scope';
  ASSERT (SELECT status = 'accrued' AND "commissionCents" = 3950
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w3a'),
    'first_payment: first invoice accrues 50%';
  ASSERT (SELECT status = 'out_of_scope'
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w3b'),
    'first_payment: later invoices are out of scope';
  ASSERT (SELECT status = 'out_of_scope'
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w4_cycle'),
    'first_payment: a first recorded renewal (client paid before history) is out of scope';
END $$;

-- ---------------------------------------------------------------------------
-- 5. New terms do not rewrite history; terms effective later leave payments waiting.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_confirm_referral_partner_terms(
  '00000000-0000-4000-8000-0000000057b1', 50, 'lifetime', NULL, now() + interval '1 day', 'Proof future terms');

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

SELECT public.referral_record_invoice_payment('in_proof_w3', '00000000-0000-4000-8000-0000000057c1',
  'sub_w', 'ch_proof_w3', 2900, 'usd', 'pro', 'subscription_cycle', now());

DO $$
BEGIN
  ASSERT (SELECT "commissionCents" = 580 AND "commissionPercent" = 20
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w1'),
    'replacing terms must not change an accrued commission';
  ASSERT (SELECT count(*) FROM public."referralPartnerTerms"
          WHERE "partnerId" = '00000000-0000-4000-8000-0000000057b1') = 2
     AND (SELECT count(*) FROM public."referralPartnerTerms"
          WHERE "partnerId" = '00000000-0000-4000-8000-0000000057b1' AND status = 'confirmed') = 1,
    'old terms must be archived, one confirmed version remains';
  ASSERT (SELECT status = 'pending_terms'
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w3'),
    'payment before effectiveFrom of the current terms must wait';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Refunds: proportional, cumulative, idempotent.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_payment_reversal('in_proof_w2', 'ch_proof_w2', 1450, NULL);
SELECT public.referral_record_payment_reversal('in_proof_w2', 'ch_proof_w2', 1450, NULL);

DO $$
BEGIN
  ASSERT (SELECT "reversedCents" = 290
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'half refund must reverse half the commission, once';
  ASSERT (SELECT status = 'partially_refunded' AND "refundedCents" = 1450
          FROM public."billingInvoicePayment" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'payment must show the partial refund';
END $$;

-- Lookup by charge only (charge.invoice missing).
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_w2', 2900, NULL);

DO $$
BEGIN
  ASSERT (SELECT "reversedCents" = 580
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'full refund must reverse the full commission';
  ASSERT (SELECT status = 'refunded'
          FROM public."billingInvoicePayment" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'payment must be marked refunded';
  ASSERT (SELECT (public.referral_record_payment_reversal('in_unknown', 'ch_unknown', 100, NULL) ->> 'code'))
         = 'payment_not_found',
    'unknown payments must be ignored, not raise';
END $$;

-- A stale / retried older refund snapshot must not shrink the refund.
SELECT public.referral_record_payment_reversal('in_proof_w2', 'ch_proof_w2', 1450, NULL);

DO $$
BEGIN
  ASSERT (SELECT "refundedCents" = 2900 AND status = 'refunded'
          FROM public."billingInvoicePayment" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'refunds only grow';
  ASSERT (SELECT "reversedCents" = 580
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_w2'),
    'stale refund must not give commission back';
END $$;

-- B2C: full refund of U's qualifying payment takes the credit back.
SELECT public.referral_record_payment_reversal('in_proof_u1', 'ch_proof_u1', 2900, NULL);
-- Refund of a non-qualifying renewal changes nothing for the credit.
SELECT public.referral_record_payment_reversal('in_proof_u2', 'ch_proof_u2', 2900, NULL);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 1,
    'refunding the qualifying payment must take one credit back';
  ASSERT (SELECT count(*) FROM public."referralCoachCreditLedger"
          WHERE "userId" = '00000000-0000-4000-8000-0000000057a1' AND reason = 'reversal') = 1,
    'exactly one reversal row';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Disputes: open dispute reverses; won dispute restores; repeat is idempotent.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 7900);
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 7900);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 0,
    'open dispute on the qualifying payment must take the credit back once';
  ASSERT (SELECT status = 'disputed'
          FROM public."billingInvoicePayment" WHERE "stripeInvoiceId" = 'in_proof_u2_paid'),
    'payment must be marked disputed';
END $$;

SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 0);
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 0);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 1,
    'won dispute must restore the credit once';
  ASSERT (SELECT status = 'paid'
          FROM public."billingInvoicePayment" WHERE "stripeInvoiceId" = 'in_proof_u2_paid'),
    'payment must be back to paid';
END $$;

-- A new dispute after a won one reverses again (state converges, no one-shot flags).
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 7900);
SELECT public.referral_record_payment_reversal(NULL, 'ch_proof_u2_paid', NULL, 7900);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 0,
    'a second dispute after a restore must reverse once more';
  ASSERT (SELECT count(*) FROM public."referralCoachCreditLedger"
          WHERE "stripeInvoiceId" = 'in_proof_u2_paid' AND reason = 'reversal') = 2,
    'two reversal rows, one per dispute';
END $$;

-- ---------------------------------------------------------------------------
-- 8. Spent credit: a full refund records delta 0 and the balance never goes negative.
-- ---------------------------------------------------------------------------
SELECT public.referral_record_invoice_payment('in_proof_u3', '00000000-0000-4000-8000-0000000057a4',
  'sub_u3', 'ch_proof_u3', 2900, 'usd', 'pro', 'subscription_create', now());

-- Simulate a booking spending the credit (slice 3 writes these rows).
INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, note)
VALUES ('00000000-0000-4000-8000-0000000057a1', -1, 'redemption', 'proof: simulated booking');

SELECT public.referral_record_payment_reversal('in_proof_u3', 'ch_proof_u3', 2900, NULL);
SELECT public.referral_record_payment_reversal('in_proof_u3', 'ch_proof_u3', 2900, NULL);

DO $$
BEGIN
  ASSERT public.available_referral_coach_credits('00000000-0000-4000-8000-0000000057a1') = 0,
    'balance must not go below zero';
  ASSERT (SELECT count(*) = 1 AND min(delta) = 0
          FROM public."referralCoachCreditLedger"
          WHERE "stripeInvoiceId" = 'in_proof_u3' AND reason = 'reversal'),
    'reversal of an already spent credit is recorded once with delta 0';
END $$;

-- ---------------------------------------------------------------------------
-- 9. Partner attribution wins over organic; pre-program converters earn nothing;
--    late invoices use the terms that governed their payment date.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_set_user_referral_partner(
  '00000000-0000-4000-8000-0000000057a5'::uuid,
  '00000000-0000-4000-8000-0000000057b1'::uuid
);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

UPDATE public."referralAttribution" SET "paidBeforeRewards" = true
WHERE "userId" = '00000000-0000-4000-8000-0000000057a6';

-- P1 terms: 20% (archived at "now") then 50% effective tomorrow. A late invoice.paid for a
-- payment made 5 days ago must use the 20% version.
SELECT public.referral_record_invoice_payment('in_proof_u4', '00000000-0000-4000-8000-0000000057a5',
  'sub_u4', 'ch_proof_u4', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_invoice_payment('in_proof_u5', '00000000-0000-4000-8000-0000000057a6',
  'sub_u5', 'ch_proof_u5', 2900, 'usd', 'pro', 'subscription_cycle', now());
-- Unknown plan price: recorded, but not a qualifying payment for anyone.
SELECT public.referral_record_invoice_payment('in_proof_w_notier', '00000000-0000-4000-8000-0000000057c1',
  'sub_w', 'ch_proof_w_notier', 2900, 'usd', NULL, 'subscription_cycle', now());

DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public."referralCoachCreditLedger"
                     WHERE "referredUserId" IN ('00000000-0000-4000-8000-0000000057a5',
                                                '00000000-0000-4000-8000-0000000057a6')),
    'no B2C credit for a partner-attributed user or a pre-program converter';
  ASSERT (SELECT status = 'accrued' AND "commissionPercent" = 20 AND "commissionCents" = 580
          FROM public."referralPartnerCommission" WHERE "stripeInvoiceId" = 'in_proof_u4'),
    'late invoice must use the terms that governed its payment date';
  ASSERT NOT EXISTS (SELECT 1 FROM public."referralPartnerCommission"
                     WHERE "stripeInvoiceId" = 'in_proof_w_notier')
     AND EXISTS (SELECT 1 FROM public."billingInvoicePayment"
                 WHERE "stripeInvoiceId" = 'in_proof_w_notier'),
    'payment without a plan tier is recorded but earns no commission';
END $$;

-- ---------------------------------------------------------------------------
-- 10. anon has no access at all; internal helpers are not callable by users.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM count(*) FROM public."referralPartnerCommission";
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'anon must have no privilege on commissions';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057a9","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057a9', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  v_blocked := false;
  BEGIN
    PERFORM public.referral_apply_payment_reversal('in_proof_w1');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not call referral_apply_payment_reversal';

  v_blocked := false;
  BEGIN
    PERFORM public.referral_evaluate_partner_commission(gen_random_uuid());
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user must not call referral_evaluate_partner_commission';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

SELECT 'referral rewards proof: ALL PASS' AS result;

ROLLBACK;
