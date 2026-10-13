-- Proof for NCLDD-56 slice 1 (20261013150000_referral_attribution_protection).
-- Run AFTER the migration, as postgres (SQL editor).
-- Self-contained: throwaway auth users inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'referral attribution proof: ALL PASS'.
--
-- R = organic referrer, U = user referred by R (via handle_new_user), V = plain user, A = admin.
-- Claims are set with is_local = true and survive RESET ROLE, so every block sets or clears
-- them explicitly.

BEGIN;

-- Partner + referrer code first, so the signup below can resolve the organic code.
INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode")
VALUES ('00000000-0000-4000-8000-0000000056a0', 'Proof Partner', 'other',
        'proof-ref-partner@unclouded.invalid', 'active', 'PRFPART2');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000056a1', 'proof-ref-r@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000056a3', 'proof-ref-v@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000056ad', 'proof-ref-admin@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-ref-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "referralCode" = 'PRFREF22'
WHERE id = '00000000-0000-4000-8000-0000000056a1';
UPDATE public.profiles SET "roleType" = 'admin'
WHERE id = '00000000-0000-4000-8000-0000000056ad';

-- ---------------------------------------------------------------------------
-- 1. Signup path (handle_new_user, privileged) still writes attribution + registry.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-4000-8000-0000000056a2', 'proof-ref-u@unclouded.invalid',
   '{"referral_code":"prfref22","first_name":"Uma","last_name":"Proof"}'::jsonb);

DO $$
BEGIN
  ASSERT (SELECT "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
                 AND "referredByReferralCode" = 'PRFREF22'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'signup must still attribute the organic referrer';
  ASSERT (SELECT "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a2'),
    'registry must record the signup attribution';
  ASSERT (SELECT "referralCode" = 'PRFREF22'
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a1'),
    'registry must record the referrer share code';
END $$;

-- ---------------------------------------------------------------------------
-- 2. As U (authenticated): own code set once, attribution read-only, no cross-user writes.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

UPDATE public.profiles SET "referralCode" = ' prfusr22 '
WHERE id = '00000000-0000-4000-8000-0000000056a2';

DO $$
DECLARE
  v_blocked boolean;
  v_rows integer;
BEGIN
  ASSERT (SELECT "referralCode" = 'PRFUSR22'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'first code must be stored normalized';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralCode" = 'PRFNEW22'
    WHERE id = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'changing an existing code must be rejected';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralCode" = NULL
    WHERE id = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'clearing an existing code must be rejected';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referredByUserId" = NULL
    WHERE id = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'owner must not clear referredByUserId while the referrer exists';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralPartnerId" = '00000000-0000-4000-8000-0000000056a0'
    WHERE id = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'owner must not attach a partner';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralFirstPaidAt" = now()
    WHERE id = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'owner must not fake referralFirstPaidAt';

  -- Upsert carrying attribution on an existing row is neutralized (EXCLUDED is restored).
  INSERT INTO public.profiles (id, email, "referredByUserId")
  VALUES ('00000000-0000-4000-8000-0000000056a2', 'proof-ref-u@unclouded.invalid',
          '00000000-0000-4000-8000-0000000056a3')
  ON CONFLICT (id) DO UPDATE SET "referredByUserId" = EXCLUDED."referredByUserId";

  -- Second identity: U cannot touch V's row at all.
  UPDATE public.profiles SET "firstName" = 'hijack'
  WHERE id = '00000000-0000-4000-8000-0000000056a3';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  ASSERT v_rows = 0, 'owner RLS must still hide other users rows';

  -- Non-admin cannot use the correction RPC.
  v_blocked := false;
  BEGIN
    PERFORM public.admin_set_user_referral_partner(
      '00000000-0000-4000-8000-0000000056a2'::uuid,
      '00000000-0000-4000-8000-0000000056a0'::uuid);
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin must get 42501 from admin_set_user_referral_partner';

  -- Unrelated profile edits keep working and leave attribution intact.
  UPDATE public.profiles SET "firstName" = 'Uma2'
  WHERE id = '00000000-0000-4000-8000-0000000056a2';
  ASSERT (SELECT "firstName" = 'Uma2'
                 AND "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
                 AND "referralPartnerId" IS NULL
                 AND "referralCode" = 'PRFUSR22'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'ordinary updates work; upsert must not move attribution';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. As V: invalid format, partner-code and taken-code collisions are rejected.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a3","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a3', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralCode" = 'bad-code'
    WHERE id = '00000000-0000-4000-8000-0000000056a3';
  EXCEPTION WHEN SQLSTATE '22023' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'invalid code format must be rejected';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralCode" = 'prfpart2'
    WHERE id = '00000000-0000-4000-8000-0000000056a3';
  EXCEPTION WHEN SQLSTATE '23505' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user code must not collide with a partner code (RLS hides partners)';

  v_blocked := false;
  BEGIN
    UPDATE public.profiles SET "referralCode" = 'PRFUSR22'
    WHERE id = '00000000-0000-4000-8000-0000000056a3';
  EXCEPTION WHEN SQLSTATE '23505' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'user code must not reuse another user code';
END $$;

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT "referralCode" IS NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a3'),
    'rejected writes must leave the code empty';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Admin: correction RPC works; direct PATCH of own attribution does not.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT public.admin_set_user_referral_partner(
  '00000000-0000-4000-8000-0000000056a2'::uuid,
  '00000000-0000-4000-8000-0000000056a0'::uuid
);

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  ASSERT coalesce(current_setting('app.referral_sync', true), '') = '',
    'admin RPC must reset app.referral_sync';

  BEGIN
    UPDATE public.profiles SET "referralPartnerId" = '00000000-0000-4000-8000-0000000056a0'
    WHERE id = '00000000-0000-4000-8000-0000000056ad';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'admin must not hand-edit own attribution via PATCH';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER billing path under U's JWT: first-paid stamp still lands.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('app.billing_sync', 'true', true);

UPDATE public.profiles SET subscribed = true
WHERE id = '00000000-0000-4000-8000-0000000056a2';

SELECT set_config('app.billing_sync', '', true);

DO $$
BEGIN
  ASSERT (SELECT "referralPartnerId" = '00000000-0000-4000-8000-0000000056a0'
                 AND "referralPartnerCode" = 'PRFPART2'
                 AND "referralCorrectedBy" = '00000000-0000-4000-8000-0000000056ad'
                 AND "referralFirstPaidAt" IS NOT NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'admin correction and first-paid stamp must apply';
  ASSERT (SELECT "referralPartnerId" = '00000000-0000-4000-8000-0000000056a0'
                 AND "referralFirstPaidAt" IS NOT NULL
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a2'),
    'registry must follow the correction and the stamp';
END $$;

-- ---------------------------------------------------------------------------
-- 6. U deletes and recreates the profile: attribution and code come back.
-- ---------------------------------------------------------------------------
SET LOCAL ROLE authenticated;

DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2';
INSERT INTO public.profiles (id, email, "referralCode")
VALUES ('00000000-0000-4000-8000-0000000056a2', 'proof-ref-u@unclouded.invalid', 'PRFZZZ22');

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
                 AND "referralPartnerId" = '00000000-0000-4000-8000-0000000056a0'
                 AND "referralFirstPaidAt" IS NOT NULL
                 AND "referralCode" = 'PRFUSR22'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'recreated profile must get attribution and the permanent code back';
END $$;

-- ---------------------------------------------------------------------------
-- 7. Referrer R deletes the profile (FK SET NULL cascade), then comes back.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a1';

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT "referredByUserId" IS NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'referrer delete must cascade without error';
  ASSERT (SELECT "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a2'),
    'registry must keep the link after the referrer profile is gone';
END $$;

-- While R's profile is gone, nobody else can take R's code.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a3","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a3', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles SET "referralCode" = 'PRFREF22'
    WHERE id = '00000000-0000-4000-8000-0000000056a3';
  EXCEPTION WHEN SQLSTATE '23505' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'a deleted profile code must stay reserved in the registry';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

INSERT INTO public.profiles (id, email)
VALUES ('00000000-0000-4000-8000-0000000056a1', 'proof-ref-r@unclouded.invalid');

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT "referralCode" = 'PRFREF22'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a1'),
    'recreated referrer must get the code back';
  ASSERT (SELECT "referredByUserId" = '00000000-0000-4000-8000-0000000056a1'
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'referred user must be re-linked to the returning referrer';
END $$;

-- ---------------------------------------------------------------------------
-- 7b. Registry isolation: users and anon see nothing and cannot write; admin can read.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_blocked boolean;
BEGIN
  ASSERT (SELECT count(*) FROM public."referralAttribution") = 0,
    'non-admin must not read any registry row, including their own';

  v_blocked := false;
  BEGIN
    INSERT INTO public."referralAttribution" ("userId")
    VALUES ('00000000-0000-4000-8000-0000000056a3');
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin INSERT into registry must be denied';

  v_blocked := false;
  BEGIN
    UPDATE public."referralAttribution" SET "referredByUserId" = NULL
    WHERE "userId" = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin UPDATE of registry must be denied';

  v_blocked := false;
  BEGIN
    DELETE FROM public."referralAttribution"
    WHERE "userId" = '00000000-0000-4000-8000-0000000056a2';
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'non-admin DELETE from registry must be denied';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralAttribution") = 0,
    'anon must not read the registry';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000056ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000056ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralAttribution"
          WHERE "userId" IN ('00000000-0000-4000-8000-0000000056a1',
                             '00000000-0000-4000-8000-0000000056a2')) = 2,
    'admin must read registry rows (control)';
END $$;

-- ---------------------------------------------------------------------------
-- 7c. Admin deletes the partner: FK clean-up on profiles and registry, no error.
-- ---------------------------------------------------------------------------
DELETE FROM public."referralPartner" WHERE id = '00000000-0000-4000-8000-0000000056a0';

-- 7d. Admin corrects V, then deletes their own profile: referralCorrectedBy clean-up passes.
SELECT public.admin_set_user_referral_partner(
  '00000000-0000-4000-8000-0000000056a3'::uuid,
  NULL::uuid
);

DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056ad';

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT "referralPartnerId" IS NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a2'),
    'partner delete must clear profiles.referralPartnerId';
  ASSERT (SELECT "referralPartnerId" IS NULL
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a2'),
    'partner delete must clear registry.referralPartnerId';
  ASSERT (SELECT "referralCorrectedBy" IS NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000056a3'),
    'admin profile delete must clear referralCorrectedBy without error';
END $$;

-- ---------------------------------------------------------------------------
-- 8. service_role may rewrite a code (scripts / support tooling).
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);

UPDATE public.profiles SET "referralCode" = 'PRFSVC22'
WHERE id = '00000000-0000-4000-8000-0000000056a2';

DO $$
BEGIN
  ASSERT (SELECT "referralCode" = 'PRFSVC22'
          FROM public."referralAttribution" WHERE "userId" = '00000000-0000-4000-8000-0000000056a2'),
    'service_role code rewrite must reach the registry';
END $$;

-- ---------------------------------------------------------------------------
-- 9. Self-referral is rejected even for privileged writers (no JWT).
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  ASSERT nullif(auth.role(), '') IS NULL, 'claims must be cleared for the privileged check';
  BEGIN
    UPDATE public.profiles SET "referredByUserId" = id
    WHERE id = '00000000-0000-4000-8000-0000000056a3';
  EXCEPTION WHEN check_violation THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'self-referral must violate profiles_no_self_referral';
END $$;

SELECT 'referral attribution proof: ALL PASS' AS result;

ROLLBACK;
