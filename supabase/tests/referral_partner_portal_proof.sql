-- Proof for NCLDD-56 slice 5 (20261013190000_referral_partner_portal).
-- Run AFTER 20261013150000..20261013190000, as postgres (SQL editor).
-- Self-contained: throwaway users / partners inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral partner portal proof: ALL PASS'.
--
-- P1 (terms 20% lifetime) is linked to account A1; clients W1 (paid), W2 (signed up only).
-- P2 (no terms) is linked to account A2; client W3 (paid, waiting for terms).
-- ADM = settings admin, N = plain user.

BEGIN;

INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode") VALUES
  ('00000000-0000-4000-8000-0000000060b1', 'Proof Portal P1', 'coach', 'proof-pp-p1@unclouded.invalid', 'active', 'PRPPTA22'),
  ('00000000-0000-4000-8000-0000000060b2', 'Proof Portal P2', 'coach', 'proof-pp-p2@unclouded.invalid', 'active', 'PRPPTB22');

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000060a1', 'proof-pp-a1@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000060a2', 'Proof-PP-A2@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000060ad', 'proof-pp-admin@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000060a9', 'proof-pp-n@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000060a8', 'proof-pp-unconfirmed@unclouded.invalid', NULL);

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email ILIKE 'proof-pp-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000060ad';

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000060c1', 'proof-pp-w1@unclouded.invalid', now(),
   '{"referral_code":"PRPPTA22","first_name":"Wendy","last_name":"Wallaby"}'),
  ('00000000-0000-4000-8000-0000000060c2', 'proof-pp-w2@unclouded.invalid', now(),
   '{"referral_code":"PRPPTA22","first_name":"Walter","last_name":"Wombat"}'),
  ('00000000-0000-4000-8000-0000000060c3', 'proof-pp-w3@unclouded.invalid', now(),
   '{"referral_code":"PRPPTB22","first_name":"Xena","last_name":"Xylophone"}');

-- ---------------------------------------------------------------------------
-- 1. Linking accounts: admin only; unknown / double links rejected; email is case-insensitive.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060a9","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060a9', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    PERFORM public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b1',
                                                    'proof-pp-n@unclouded.invalid');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin must not link partner accounts';
  ASSERT NOT public.is_my_referral_partner(), 'plain user is not a partner';
  ASSERT public.get_my_referral_partner_portal() IS NULL, 'plain user gets no portal';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb;
BEGIN
  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b1', 'nobody@unclouded.invalid');
  ASSERT v ->> 'code' = 'user_not_found', 'unknown email: ' || v::text;

  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b1', 'proof-pp-unconfirmed@unclouded.invalid');
  ASSERT v ->> 'code' = 'user_not_found', 'unconfirmed email must not be linkable: ' || v::text;

  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b1', ' proof-pp-a1@unclouded.invalid ');
  ASSERT (v ->> 'ok')::boolean, 'link P1 → A1: ' || v::text;
  ASSERT (SELECT "userLinkedBy" = '00000000-0000-4000-8000-0000000060ad' AND "userLinkedAt" IS NOT NULL
          FROM public."referralPartner" WHERE id = '00000000-0000-4000-8000-0000000060b1'),
    'link is audited';

  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b2', 'proof-pp-a1@unclouded.invalid');
  ASSERT v ->> 'code' = 'already_linked', 'one partner per account: ' || v::text;

  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b2', 'proof-pp-a2@unclouded.invalid');
  ASSERT (v ->> 'ok')::boolean, 'link P2 → A2 (email case-insensitive): ' || v::text;

  PERFORM public.admin_confirm_referral_partner_terms(
    '00000000-0000-4000-8000-0000000060b1', 20, 'lifetime', NULL, now() - interval '1 year', 'proof');
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

SELECT public.referral_record_invoice_payment('in_proof_pp_w1a', '00000000-0000-4000-8000-0000000060c1',
  'sub_pp_w1', 'ch_proof_pp_w1a', 2900, 'usd', 'pro', 'subscription_create', now() - interval '40 days');
SELECT public.referral_record_invoice_payment('in_proof_pp_w1b', '00000000-0000-4000-8000-0000000060c1',
  'sub_pp_w1', 'ch_proof_pp_w1b', 2900, 'usd', 'pro', 'subscription_cycle', now() - interval '10 days');
SELECT public.referral_record_payment_reversal('in_proof_pp_w1b', 'ch_proof_pp_w1b', 1450, NULL);
SELECT public.referral_record_invoice_payment('in_proof_pp_w3', '00000000-0000-4000-8000-0000000060c3',
  'sub_pp_w3', 'ch_proof_pp_w3', 7900, 'usd', 'premium', 'subscription_create', now());

-- ---------------------------------------------------------------------------
-- 2. A1 sees P1 only: terms, masked clients, net earnings.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_partner_portal();
  v_text text := v::text;
BEGIN
  ASSERT public.is_my_referral_partner(), 'A1 is a partner';
  ASSERT v -> 'partner' ->> 'code' = 'PRPPTA22' AND v -> 'partner' ->> 'name' = 'Proof Portal P1', 'own partner';
  ASSERT v ->> 'termsStatus' = 'confirmed' AND (v -> 'terms' ->> 'commissionPercent')::numeric = 20,
    'confirmed terms shown';

  ASSERT (v -> 'totals' ->> 'signups')::int = 2, 'two clients: ' || v_text;
  ASSERT (v -> 'totals' ->> 'payingClients')::int = 1, 'one paying client';
  -- 580 on the first payment + 580 - 290 (half refunded) on the second.
  ASSERT (v -> 'totals' -> 'earned' -> 0 ->> 'cents')::int = 870
     AND v -> 'totals' -> 'earned' -> 0 ->> 'currency' = 'usd',
    'net earnings: ' || (v -> 'totals')::text;

  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'clients') e
                 WHERE e ->> 'displayName' = 'Wendy W.' AND e ->> 'status' = 'paying'
                   AND (e ->> 'payments')::int = 2
                   AND (e -> 'earned' -> 0 ->> 'cents')::int = 870
                   AND e -> 'earned' -> 0 ->> 'currency' = 'usd'),
    'paying client with per-client earnings';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'clients') e
                 WHERE e ->> 'displayName' = 'Walter W.' AND e ->> 'status' = 'signed_up'
                   AND jsonb_array_length(e -> 'earned') = 0),
    'signed-up client without payments';

  ASSERT position('Xena' IN v_text) = 0 AND position('PRPPTB22' IN v_text) = 0,
    'no data from another partner';
  ASSERT position('Wallaby' IN v_text) = 0 AND position('Wombat' IN v_text) = 0, 'no last names';
  ASSERT position('@' IN v_text) = 0, 'no emails';
  ASSERT position('00000000-0000-4000-8000-0000000060c' IN v_text) = 0, 'no client ids';
  ASSERT position('2900' IN v_text) = 0, 'no client payment amounts';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'clients') e
                     WHERE (e ->> 'joinedAt')::timestamptz <> date_trunc('day', (e ->> 'joinedAt')::timestamptz)),
    'join dates are day precision';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. A2 (no terms): payments are counted but never priced.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_partner_portal();
BEGIN
  ASSERT v ->> 'termsStatus' = 'not_configured' AND v -> 'terms' = 'null'::jsonb,
    'terms not configured: ' || v::text;
  ASSERT (v -> 'totals' ->> 'pendingTermsPayments')::int = 1
     AND jsonb_array_length(v -> 'totals' -> 'earned') = 0,
    'waiting payment counted, no earnings: ' || (v -> 'totals')::text;
  ASSERT (v -> 'clients' -> 0 ->> 'displayName') = 'Xena X.'
     AND (v -> 'clients' -> 0 ->> 'pendingTermsPayments')::int = 1
     AND jsonb_array_length(v -> 'clients' -> 0 -> 'earned') = 0,
    'client row: waiting for terms';
  ASSERT position('Wendy' IN v::text) = 0, 'no data from P1';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 4. Unlink removes access; anon is rejected; partners still cannot read partner tables.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000060b2', NULL);

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000060a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000060a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT NOT public.is_my_referral_partner() AND public.get_my_referral_partner_portal() IS NULL,
    'unlinked account loses the portal';
  ASSERT (SELECT count(*) FROM public."referralPartner") = 0
     AND (SELECT count(*) FROM public."referralPartnerCommission") = 0,
    'partner tables stay admin-only';
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
    PERFORM public.get_my_referral_partner_portal();
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'anon must not call get_my_referral_partner_portal';
END $$;

RESET ROLE;

SELECT 'referral partner portal proof: ALL PASS' AS result;

ROLLBACK;
