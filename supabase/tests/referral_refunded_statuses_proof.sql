-- Proof for NCLDD-56 QA F-2 (20261014120000_referral_refunded_statuses).
-- Run AFTER 20261013150000..20261014120000, as postgres (SQL editor).
-- Self-contained: throwaway users / partner inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral refunded statuses proof: ALL PASS'.
--
-- Partner P (20% lifetime) is linked to account A. Clients:
--   W1 one payment, fully refunded            → refunded
--   W2 two payments, one fully refunded        → paying
--   W3 one payment, fully disputed, then won   → refunded, then paying
--   W4 one payment, half refunded              → paying
-- Referrer R (organic). Invitees:
--   C1 rewarded, payment fully refunded        → refunded
--   C2 rewarded, payment disputed, then won    → refunded, then rewarded
--   C3 rewarded, payment half refunded         → rewarded

BEGIN;

INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode") VALUES
  ('00000000-0000-4000-8000-0000000061b1', 'Proof Refund P', 'coach', 'proof-rf-p@unclouded.invalid', 'active', 'PRRFPA22');

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000061a1', 'proof-rf-a@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000061ad', 'proof-rf-admin@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000061e1', 'proof-rf-r@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-rf-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000061ad';
UPDATE public.profiles SET "referralCode" = 'PRRFRR22' WHERE id = '00000000-0000-4000-8000-0000000061e1';

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000061c1', 'proof-rf-w1@unclouded.invalid', now(),
   '{"referral_code":"PRRFPA22","first_name":"Wanda","last_name":"One"}'),
  ('00000000-0000-4000-8000-0000000061c2', 'proof-rf-w2@unclouded.invalid', now(),
   '{"referral_code":"PRRFPA22","first_name":"Wes","last_name":"Two"}'),
  ('00000000-0000-4000-8000-0000000061c3', 'proof-rf-w3@unclouded.invalid', now(),
   '{"referral_code":"PRRFPA22","first_name":"Wim","last_name":"Three"}'),
  ('00000000-0000-4000-8000-0000000061c4', 'proof-rf-w4@unclouded.invalid', now(),
   '{"referral_code":"PRRFPA22","first_name":"Wil","last_name":"Four"}'),
  ('00000000-0000-4000-8000-0000000061f1', 'proof-rf-c1@unclouded.invalid', now(),
   '{"referral_code":"PRRFRR22","first_name":"Cleo","last_name":"One"}'),
  ('00000000-0000-4000-8000-0000000061f2', 'proof-rf-c2@unclouded.invalid', now(),
   '{"referral_code":"PRRFRR22","first_name":"Cody","last_name":"Two"}'),
  ('00000000-0000-4000-8000-0000000061f3', 'proof-rf-c3@unclouded.invalid', now(),
   '{"referral_code":"PRRFRR22","first_name":"Cara","last_name":"Three"}');

-- Admin links P → A and confirms terms.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb;
BEGIN
  v := public.admin_link_referral_partner_user('00000000-0000-4000-8000-0000000061b1', 'proof-rf-a@unclouded.invalid');
  ASSERT (v ->> 'ok')::boolean, 'link P → A: ' || v::text;
  PERFORM public.admin_confirm_referral_partner_terms(
    '00000000-0000-4000-8000-0000000061b1', 20, 'lifetime', NULL, now() - interval '1 year', 'proof');
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- Payments (as the webhook would record them).
SELECT public.referral_record_invoice_payment('in_proof_rf_w1', '00000000-0000-4000-8000-0000000061c1',
  'sub_rf_w1', 'ch_proof_rf_w1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_w1', 'ch_proof_rf_w1', 2900, NULL);

SELECT public.referral_record_invoice_payment('in_proof_rf_w2a', '00000000-0000-4000-8000-0000000061c2',
  'sub_rf_w2', 'ch_proof_rf_w2a', 2900, 'usd', 'pro', 'subscription_create', now() - interval '40 days');
SELECT public.referral_record_invoice_payment('in_proof_rf_w2b', '00000000-0000-4000-8000-0000000061c2',
  'sub_rf_w2', 'ch_proof_rf_w2b', 2900, 'usd', 'pro', 'subscription_cycle', now() - interval '10 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_w2b', 'ch_proof_rf_w2b', 2900, NULL);

SELECT public.referral_record_invoice_payment('in_proof_rf_w3', '00000000-0000-4000-8000-0000000061c3',
  'sub_rf_w3', 'ch_proof_rf_w3', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_w3', 'ch_proof_rf_w3', 0, 2900);

SELECT public.referral_record_invoice_payment('in_proof_rf_w4', '00000000-0000-4000-8000-0000000061c4',
  'sub_rf_w4', 'ch_proof_rf_w4', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_w4', 'ch_proof_rf_w4', 1450, NULL);

SELECT public.referral_record_invoice_payment('in_proof_rf_c1', '00000000-0000-4000-8000-0000000061f1',
  'sub_rf_c1', 'ch_proof_rf_c1', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_c1', 'ch_proof_rf_c1', 2900, NULL);

SELECT public.referral_record_invoice_payment('in_proof_rf_c2', '00000000-0000-4000-8000-0000000061f2',
  'sub_rf_c2', 'ch_proof_rf_c2', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_c2', 'ch_proof_rf_c2', 0, 2900);

SELECT public.referral_record_invoice_payment('in_proof_rf_c3', '00000000-0000-4000-8000-0000000061f3',
  'sub_rf_c3', 'ch_proof_rf_c3', 2900, 'usd', 'pro', 'subscription_create', now() - interval '5 days');
SELECT public.referral_record_payment_reversal('in_proof_rf_c3', 'ch_proof_rf_c3', 1450, NULL);

-- ---------------------------------------------------------------------------
-- 1. Partner portal: fully reversed clients are "refunded", totals follow.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_partner_portal();
  v_status jsonb;
BEGIN
  SELECT jsonb_object_agg(e ->> 'displayName', e ->> 'status') INTO v_status
  FROM jsonb_array_elements(v -> 'clients') e;

  ASSERT v_status ->> 'Wanda O.' = 'refunded', 'W1 fully refunded: ' || v_status::text;
  ASSERT v_status ->> 'Wes T.' = 'paying', 'W2 has a live payment: ' || v_status::text;
  ASSERT v_status ->> 'Wim T.' = 'refunded', 'W3 held dispute: ' || v_status::text;
  ASSERT v_status ->> 'Wil F.' = 'paying', 'W4 half refunded: ' || v_status::text;

  ASSERT (v -> 'totals' ->> 'signups')::int = 4, 'four clients: ' || (v -> 'totals')::text;
  ASSERT (v -> 'totals' ->> 'payingClients')::int = 2, 'paying = live clients: ' || (v -> 'totals')::text;
  ASSERT (v -> 'totals' ->> 'payments')::int = 5, 'payment count unchanged: ' || (v -> 'totals')::text;
  -- W2a 580 + W4 580 - 290; refunded / disputed payments earn nothing.
  ASSERT (v -> 'totals' -> 'earned' -> 0 ->> 'cents')::int = 870, 'net earnings: ' || (v -> 'totals')::text;
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'clients') e
                 WHERE e ->> 'displayName' = 'Wanda O.' AND (e ->> 'payments')::int = 1
                   AND (e -> 'earned' -> 0 ->> 'cents')::int = 0),
    'refunded client keeps payment count and zero earnings';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Invite a friend: a taken-back reward is "refunded".
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061e1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061e1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_overview();
  v_status jsonb;
BEGIN
  SELECT jsonb_object_agg(e ->> 'displayName', e ->> 'status') INTO v_status
  FROM jsonb_array_elements(v -> 'invitees') e;

  ASSERT v_status ->> 'Cleo O.' = 'refunded', 'C1 fully refunded: ' || v_status::text;
  ASSERT v_status ->> 'Cody T.' = 'refunded', 'C2 held dispute: ' || v_status::text;
  ASSERT v_status ->> 'Cara T.' = 'rewarded', 'C3 half refunded keeps the credit: ' || v_status::text;
  ASSERT (v -> 'credits' ->> 'earned')::int = 3 AND (v -> 'credits' ->> 'available')::int = 1,
    'ledger unchanged: ' || (v -> 'credits')::text;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

-- ---------------------------------------------------------------------------
-- 3. Won disputes restore "paying" / "rewarded".
-- ---------------------------------------------------------------------------
SELECT public.referral_record_payment_reversal('in_proof_rf_w3', 'ch_proof_rf_w3', 0, 0);
SELECT public.referral_record_payment_reversal('in_proof_rf_c2', 'ch_proof_rf_c2', 0, 0);

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_partner_portal();
BEGIN
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'clients') e
                 WHERE e ->> 'displayName' = 'Wim T.' AND e ->> 'status' = 'paying'),
    'W3 dispute won: ' || (v -> 'clients')::text;
  ASSERT (v -> 'totals' ->> 'payingClients')::int = 3, 'three paying after won dispute';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000061e1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000061e1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_overview();
BEGIN
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'invitees') e
                 WHERE e ->> 'displayName' = 'Cody T.' AND e ->> 'status' = 'rewarded'),
    'C2 dispute won: ' || (v -> 'invitees')::text;
END $$;

RESET ROLE;

SELECT 'referral refunded statuses proof: ALL PASS' AS result;

ROLLBACK;
