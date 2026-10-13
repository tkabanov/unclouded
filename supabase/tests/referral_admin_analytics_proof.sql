-- Proof for NCLDD-56 slice 6 (20261013200000_referral_admin_analytics).
-- Run AFTER 20261013150000..20261013200000, as postgres (SQL editor).
-- Self-contained: throwaway users / partners inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral admin analytics proof: ALL PASS'.
--
-- R = organic referrer of I1 (paid), I2 (unconfirmed), I3 (later moved to partner P1 by admin).
-- P1 = partner with 10% lifetime terms, linked to account L; clients W1 (paid) + I3.
-- P2 = partner without terms; client W2 (paid). ADM = admin, N = plain user.

BEGIN;

INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode") VALUES
  ('00000000-0000-4000-8000-0000000061b1', 'Proof Admin P1', 'coach', 'proof-aa-p1@unclouded.invalid', 'active', 'PRAAPA22'),
  ('00000000-0000-4000-8000-0000000061b2', 'Proof Admin P2', 'coach', 'proof-aa-p2@unclouded.invalid', 'active', 'PRAAPB22');

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000061a1', 'proof-aa-r@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000061a7', 'proof-aa-l@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000061ad', 'proof-aa-admin@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000061a9', 'proof-aa-n@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-aa-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "referralCode" = 'PRAAREF2' WHERE id = '00000000-0000-4000-8000-0000000061a1';
UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000061ad';

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000061c1', 'proof-aa-i1@unclouded.invalid', now(), '{"referral_code":"PRAAREF2","first_name":"Ivy","last_name":"One"}'),
  ('00000000-0000-4000-8000-0000000061c2', 'proof-aa-i2@unclouded.invalid', NULL,  '{"referral_code":"PRAAREF2"}'),
  ('00000000-0000-4000-8000-0000000061c3', 'proof-aa-i3@unclouded.invalid', now(), '{"referral_code":"PRAAREF2"}'),
  ('00000000-0000-4000-8000-0000000061d1', 'proof-aa-w1@unclouded.invalid', now(), '{"referral_code":"PRAAPA22","first_name":"Wes","last_name":"Client"}'),
  ('00000000-0000-4000-8000-0000000061d2', 'proof-aa-w2@unclouded.invalid', now(), '{"referral_code":"PRAAPB22"}');

-- Admin actions: terms for P1, link P1 → L, move I3 to P1.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_confirm_referral_partner_terms(
  '00000000-0000-4000-8000-0000000061b1', 10, 'lifetime', NULL, now() - interval '1 year', 'proof');
SELECT public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000061b1', 'proof-aa-l@unclouded.invalid');
SELECT public.admin_set_user_referral_partner(
  '00000000-0000-4000-8000-0000000061c3'::uuid, '00000000-0000-4000-8000-0000000061b1'::uuid);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- Payments (webhook path).
SELECT public.referral_record_invoice_payment('in_proof_aa_i1', '00000000-0000-4000-8000-0000000061c1',
  'sub_aa_i1', 'ch_proof_aa_i1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_invoice_payment('in_proof_aa_w1', '00000000-0000-4000-8000-0000000061d1',
  'sub_aa_w1', 'ch_proof_aa_w1', 7900, 'usd', 'premium', 'subscription_create', now() - interval '3 days');
SELECT public.referral_record_invoice_payment('in_proof_aa_w2', '00000000-0000-4000-8000-0000000061d2',
  'sub_aa_w2', 'ch_proof_aa_w2', 2900, 'usd', 'pro', 'subscription_create', now() - interval '2 days');

-- R spends the credit on a booking that is then cancelled early (refund).
INSERT INTO public."coachBooking" (id, "userId", "scheduledAt", status, "creditsRequired", "paymentSource", "cancelledAt")
VALUES ('00000000-0000-4000-8000-0000000061e1', '00000000-0000-4000-8000-0000000061a1',
        now() + interval '5 days', 'cancelled', 0, 'referral_credit', now());
INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, "coachBookingId", note) VALUES
  ('00000000-0000-4000-8000-0000000061a1', -1, 'redemption', '00000000-0000-4000-8000-0000000061e1', 'proof'),
  ('00000000-0000-4000-8000-0000000061a1', 1, 'cancel_refund', '00000000-0000-4000-8000-0000000061e1', 'proof');

-- ---------------------------------------------------------------------------
-- 1. Non-admin and anon are rejected by every admin analytics RPC.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061a7","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061a7', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  -- L is a linked partner account, still not an admin.
  v_blocked := false;
  BEGIN PERFORM public.admin_get_user_referral_stats('00000000-0000-4000-8000-0000000061a1');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true; END;
  ASSERT v_blocked, 'partner account must not read user referral stats';

  v_blocked := false;
  BEGIN PERFORM public.admin_referral_partner_metrics();
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true; END;
  ASSERT v_blocked, 'partner account must not read partner comparison';

  v_blocked := false;
  BEGIN PERFORM public.admin_get_referral_partner_program('00000000-0000-4000-8000-0000000061b1');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true; END;
  ASSERT v_blocked, 'partner account must not read the admin partner program';

  ASSERT (public.admin_list_coaching_bookings() ->> 'code') = 'forbidden',
    'bookings list stays admin-only';
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
  BEGIN PERFORM public.admin_referral_partner_metrics();
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true; END;
  ASSERT v_blocked, 'anon must not call admin analytics';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Admin: user stats, partner comparison, partner program, bookings list.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb;
  m jsonb;
  p1 jsonb;
  p2 jsonb;
  b jsonb;
BEGIN
  v := public.admin_get_user_referral_stats('00000000-0000-4000-8000-0000000061a1');
  ASSERT (v -> 'invites' ->> 'invited')::int = 2
     AND (v -> 'invites' ->> 'registered')::int = 1
     AND (v -> 'invites' ->> 'paidProPremium')::int = 1
     AND (v -> 'invites' ->> 'movedToPartner')::int = 1,
    'user invites: ' || (v -> 'invites')::text;
  ASSERT (v -> 'credits' ->> 'earned')::int = 1
     AND (v -> 'credits' ->> 'used')::int = 0
     AND (v -> 'credits' ->> 'available')::int = 1,
    'user credits (spent then refunded): ' || (v -> 'credits')::text;

  m := public.admin_referral_partner_metrics();
  SELECT e INTO p1 FROM jsonb_array_elements(m) e WHERE e ->> 'partnerId' = '00000000-0000-4000-8000-0000000061b1';
  SELECT e INTO p2 FROM jsonb_array_elements(m) e WHERE e ->> 'partnerId' = '00000000-0000-4000-8000-0000000061b2';
  ASSERT (p1 ->> 'signups')::int = 2 AND (p1 ->> 'payingClients')::int = 1
     AND (p1 -> 'earned' -> 0 ->> 'cents')::int = 790
     AND p1 ->> 'termsStatus' = 'confirmed'
     AND p1 ->> 'linkedEmail' = 'proof-aa-l@unclouded.invalid',
    'P1 metrics: ' || p1::text;
  ASSERT (p2 ->> 'signups')::int = 1 AND (p2 ->> 'payingClients')::int = 1
     AND (p2 ->> 'pendingTermsPayments')::int = 1
     AND jsonb_array_length(p2 -> 'earned') = 0
     AND p2 ->> 'termsStatus' = 'not_configured',
    'P2 without terms shows no commission: ' || p2::text;

  v := public.admin_get_referral_partner_program('00000000-0000-4000-8000-0000000061b1');
  ASSERT v -> 'linkedAccount' ->> 'email' = 'proof-aa-l@unclouded.invalid', 'linked account shown';
  ASSERT jsonb_array_length(v -> 'terms') = 1
     AND v -> 'terms' -> 0 ->> 'confirmedByEmail' = 'proof-aa-admin@unclouded.invalid',
    'terms history with who confirmed';
  ASSERT jsonb_array_length(v -> 'clients') = 1
     AND v -> 'clients' -> 0 ->> 'name' = 'Wes Client'
     AND (v -> 'clients' -> 0 -> 'earned' -> 0 ->> 'cents')::int = 790,
    'per-client commissions: ' || (v -> 'clients')::text;
  ASSERT public.admin_get_referral_partner_program(gen_random_uuid()) IS NULL, 'unknown partner';

  b := public.admin_list_coaching_bookings();
  ASSERT (b ->> 'ok')::boolean, 'bookings list ok: ' || b::text;
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(b -> 'rows') r
                 WHERE r ->> 'id' = '00000000-0000-4000-8000-0000000061e1'
                   AND r ->> 'paymentSource' = 'referral_credit'
                   AND r ->> 'creditStatus' = 'refunded'),
    'referral booking shows source and refund';
END $$;

RESET ROLE;

SELECT 'referral admin analytics proof: ALL PASS' AS result;

ROLLBACK;
