-- Proof for 20261020120000_profiles_entitlement_insert_null_guc.sql (NULL-safe INSERT guard).
-- Run AFTER the migration, as postgres (SQL editor / execute_sql). Self-contained: creates a
-- throwaway auth user inside the transaction and ends in ROLLBACK — nothing persists.
-- Every check is an ASSERT; success ends with 'entitlement insert guard proof: ALL PASS'.
-- Note: the NULL-GUC path only occurs in a session that never set app.billing_sync /
-- app.enterprise_sync; a pooled session may already hold '' (which the old code handled).

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'proof-entitlement-user@unclouded.invalid');

-- handle_new_user() normally creates the profile; remove it so the user can re-INSERT it.
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000b1';

-- ---------------------------------------------------------------------------
-- 1. As user U (authenticated JWT): INSERT own profile with entitlement values
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000b1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

-- 1a. subscribed/tier: rejected by the "Owner inserts profile" policy (defense in depth)
DO $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, subscribed, tier)
    VALUES ('00000000-0000-4000-8000-0000000000b1', 'proof-entitlement-user@unclouded.invalid', true, 'pro');
    ASSERT false, 'FAIL 1a: INSERT with subscribed=true tier=pro was accepted';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- expected: RLS WITH CHECK violation
  END;
END $$;

-- 1b. enterprise columns: policy does not cover them; trigger must reset them
INSERT INTO public.profiles (id, email, subscribed, tier, "accountType", "enterpriseTier", "enrollmentDate")
VALUES ('00000000-0000-4000-8000-0000000000b1', 'proof-entitlement-user@unclouded.invalid',
        false, 'free', 'enterprise', 'premium', now());

DO $$
DECLARE r public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.profiles WHERE id = auth.uid();
  ASSERT r."accountType" = 'individual', 'FAIL 1b: INSERT kept accountType=enterprise';
  ASSERT r."enterpriseTier" IS NULL, 'FAIL 1c: INSERT kept enterpriseTier';
  ASSERT r."enrollmentDate" IS NULL, 'FAIL 1d: INSERT kept enrollmentDate';
  ASSERT r.subscribed IS NOT TRUE AND r.tier = 'free', 'FAIL 1e: INSERT left non-free entitlement';
END $$;

-- 1c. UPDATE path still blocked (regression guard)
UPDATE public.profiles SET "accountType" = 'enterprise', "enterpriseTier" = 'pro'
WHERE id = '00000000-0000-4000-8000-0000000000b1';

DO $$
BEGIN
  ASSERT (SELECT "accountType" FROM public.profiles WHERE id = auth.uid()) = 'individual',
    'FAIL 1f: UPDATE changed accountType';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Privileged paths still work: enterprise_sync GUC may set enterprise values on INSERT
-- ---------------------------------------------------------------------------
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000b1';
SELECT set_config('app.enterprise_sync', 'true', true);

INSERT INTO public.profiles (id, email, "accountType", "enterpriseTier")
VALUES ('00000000-0000-4000-8000-0000000000b1', 'proof-entitlement-user@unclouded.invalid',
        'enterprise', 'pro');

DO $$
BEGIN
  ASSERT (SELECT "accountType" FROM public.profiles
          WHERE id = '00000000-0000-4000-8000-0000000000b1') = 'enterprise',
    'FAIL 2a: enterprise_sync INSERT was reset';
END $$;

SELECT 'entitlement insert guard proof: ALL PASS' AS result;

ROLLBACK;
