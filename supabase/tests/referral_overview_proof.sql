-- Proof for NCLDD-56 slice 4 (20261013180000_referral_overview_rpc).
-- Run AFTER 20261013150000..20261013180000, as postgres (SQL editor).
-- Self-contained: throwaway users inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral overview proof: ALL PASS'.
--
-- R = referrer; A, B, C = signed up with R's code (C converted); O = someone else's referral.

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000059a1', 'proof-ov-r@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000059a9', 'proof-ov-other@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-ov-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "referralCode" = 'PRFOVR22' WHERE id = '00000000-0000-4000-8000-0000000059a1';
UPDATE public.profiles SET "referralCode" = 'PRFOVX22' WHERE id = '00000000-0000-4000-8000-0000000059a9';

INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000059b1', 'proof-ov-a@unclouded.invalid', now(),
   '{"referral_code":"PRFOVR22","first_name":"Anna Maria","last_name":"Smithson"}'),
  ('00000000-0000-4000-8000-0000000059b2', 'proof-ov-b@unclouded.invalid', NULL,
   '{"referral_code":"PRFOVR22"}'),
  ('00000000-0000-4000-8000-0000000059b3', 'proof-ov-c@unclouded.invalid', now(),
   '{"referral_code":"PRFOVR22","first_name":"Carl","last_name":"Zimmerwald"}'),
  ('00000000-0000-4000-8000-0000000059b9', 'proof-ov-o@unclouded.invalid', now(),
   '{"referral_code":"PRFOVX22","first_name":"Olga","last_name":"Outsider"}');

-- C converted: reward, then R spent it on a session.
INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, "referredUserId", "stripeInvoiceId", note)
VALUES ('00000000-0000-4000-8000-0000000059a1', 1, 'referral_reward',
        '00000000-0000-4000-8000-0000000059b3', 'in_proof_ov_c', 'proof');
INSERT INTO public."referralCoachCreditLedger" ("userId", delta, reason, note)
VALUES ('00000000-0000-4000-8000-0000000059a1', -1, 'redemption', 'proof');

-- ---------------------------------------------------------------------------
-- 1. R sees own code, own invitees (masked), own credits and history.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000059a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000059a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_overview();
  v_text text := v::text;
BEGIN
  ASSERT v ->> 'code' = 'PRFOVR22', 'own code';
  ASSERT (v ->> 'totalInvited')::int = 3, 'three invitees: ' || v_text;
  ASSERT jsonb_array_length(v -> 'invitees') = 3, 'three invitee rows';

  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'invitees') e
                 WHERE e ->> 'displayName' = 'Anna S.' AND e ->> 'status' = 'signed_up'),
    'first word of first name + last initial; confirmed => signed_up';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'invitees') e
                 WHERE e ->> 'displayName' = 'Friend' AND e ->> 'status' = 'pending_confirmation'),
    'no name => Friend; unconfirmed email => pending_confirmation';
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'invitees') e
                 WHERE e ->> 'displayName' = 'Carl Z.' AND e ->> 'status' = 'rewarded'
                   AND e ->> 'rewardedAt' IS NOT NULL),
    'converted friend shows the reward';

  ASSERT position('Smithson' IN v_text) = 0 AND position('Zimmerwald' IN v_text) = 0
     AND position('Maria' IN v_text) = 0,
    'full last names / extra name parts must never leave the database';
  ASSERT position('@' IN v_text) = 0, 'no emails';
  ASSERT position('00000000-0000-4000-8000-0000000059b' IN v_text) = 0, 'no invitee user ids';
  ASSERT position('Olga' IN v_text) = 0, 'other referrers'' invitees are not listed';

  ASSERT (v -> 'credits' ->> 'earned')::int = 1
     AND (v -> 'credits' ->> 'used')::int = 1
     AND (v -> 'credits' ->> 'available')::int = 0,
    'credit totals: ' || (v -> 'credits')::text;
  ASSERT jsonb_array_length(v -> 'history') = 2
     AND (v -> 'history' -> 0 ->> 'reason') = 'redemption'
     AND (v -> 'history' -> 1 ->> 'friendName') = 'Carl Z.',
    'history newest first, reward names the friend: ' || (v -> 'history')::text;
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Another user sees only their own data; anon is rejected; helper is not exposed.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000059a9","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000059a9', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_overview();
  v_blocked boolean := false;
BEGIN
  ASSERT v ->> 'code' = 'PRFOVX22' AND (v ->> 'totalInvited')::int = 1, 'other user: own data only';
  ASSERT (v -> 'invitees' -> 0 ->> 'displayName') = 'Olga O.', 'other user sees own invitee';
  ASSERT (v -> 'credits' ->> 'earned')::int = 0 AND jsonb_array_length(v -> 'history') = 0,
    'other user has no credits';

  BEGIN
    PERFORM public.referral_mask_name('a', 'b');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'referral_mask_name is internal';
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
    PERFORM public.get_my_referral_overview();
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'anon must not call get_my_referral_overview';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Masking holds for hostile free-text names.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ASSERT public.referral_mask_name(E'John\u00A0Smith', 'X') = 'John X.', 'NBSP separates';
  ASSERT public.referral_mask_name(E'John\tSmith', 'X') = 'John X.', 'tab separates';
  ASSERT public.referral_mask_name(E'John\nSmith', NULL) = 'John', 'newline separates; no last name';
  ASSERT public.referral_mask_name(E'J\u3000Smith', 'Q') = 'J Q.', 'ideographic space separates';
  ASSERT public.referral_mask_name('john.smith@gmail.com', 'D') = 'Friend', 'email-like first name hidden';
  ASSERT public.referral_mask_name('Jo', E'\u00A0Smith') = 'Jo S.', 'initial is the first letter';
  ASSERT public.referral_mask_name(E'\u00A0', 'Smith') = 'Friend', 'blank first name';
END $$;

-- 4. An invitee moved to a partner is no longer the referrer's invitee.
INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode")
VALUES ('00000000-0000-4000-8000-0000000059e0', 'Proof OV Partner', 'other',
        'proof-ov-partner@unclouded.invalid', 'active', 'PRFQVP22');
SELECT set_config('app.referral_sync', 'true', true);
UPDATE public.profiles SET "referralPartnerId" = '00000000-0000-4000-8000-0000000059e0'
WHERE id = '00000000-0000-4000-8000-0000000059b1';
SELECT set_config('app.referral_sync', '', true);

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000059a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000059a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.get_my_referral_overview();
BEGIN
  ASSERT (v ->> 'totalInvited')::int = 2
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v -> 'invitees') e
                     WHERE e ->> 'displayName' = 'Anna S.'),
    'partner-moved invitee is hidden: ' || v::text;
END $$;

RESET ROLE;

SELECT 'referral overview proof: ALL PASS' AS result;

ROLLBACK;
