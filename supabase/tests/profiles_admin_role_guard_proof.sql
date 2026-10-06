-- Proof for 20261006120000_protect_profiles_admin_role.sql (admin self-promotion guard).
-- Run AFTER the migration, as postgres (SQL editor / execute_sql). Fully self-contained:
-- creates two throwaway auth users inside the transaction and ends in ROLLBACK — nothing persists.
-- Every check is an ASSERT; any failure aborts with the failing message. Success ends with
-- the final SELECT returning 'admin role guard proof: ALL PASS'.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, no JWT): U = normal user, A = admin made via direct SQL (privileged path)
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'proof-normal-user@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000000a2', 'proof-admin-user@unclouded.invalid');

-- handle_new_user() normally creates the profile; make it explicit in case it is absent.
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
WHERE u.id IN ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'pro', "roleTypes" = ARRAY['pro']
WHERE id = '00000000-0000-4000-8000-0000000000a1';

UPDATE public.profiles SET "roleType" = 'admin', "roleTypes" = '{}'
WHERE id = '00000000-0000-4000-8000-0000000000a2';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000a2') = 'admin',
    'FAIL 0: direct SQL (postgres, no JWT) could not create an admin';
END $$;

-- ---------------------------------------------------------------------------
-- 1. As normal user U (authenticated JWT): self-promotion does not stick
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

-- Equivalent of PATCH /rest/v1/profiles?id=eq.<self> {"roleType":"admin"}
UPDATE public.profiles SET "roleType" = 'admin'
WHERE id = '00000000-0000-4000-8000-0000000000a1';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'pro',
    'FAIL 1a: authenticated user promoted self to admin';
  ASSERT public.is_settings_admin() = false,
    'FAIL 1b: is_settings_admin() true after self-promotion attempt';
END $$;

-- Case / whitespace variants and the roleTypes array
UPDATE public.profiles SET "roleType" = ' ADMIN ', "roleTypes" = ARRAY['pro', 'admin', 'Admin']
WHERE id = '00000000-0000-4000-8000-0000000000a1';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'pro',
    'FAIL 1c: case-variant admin roleType stuck';
  ASSERT (SELECT "roleTypes" FROM public.profiles WHERE id = auth.uid()) = ARRAY['pro'],
    'FAIL 1d: admin entries stuck in roleTypes';
  ASSERT public.is_settings_admin() = false, 'FAIL 1e: is_settings_admin() true';
END $$;

-- Legit non-admin role edits (onboarding / Settings → Profile) still work
UPDATE public.profiles SET "roleType" = 'student', "roleTypes" = ARRAY['student', 'caregiver']
WHERE id = '00000000-0000-4000-8000-0000000000a1';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'student',
    'FAIL 1f: normal roleType edit blocked';
  ASSERT (SELECT "roleTypes" FROM public.profiles WHERE id = auth.uid()) = ARRAY['student', 'caregiver'],
    'FAIL 1g: normal roleTypes edit blocked';
END $$;

-- INSERT path: recreate own profile with admin values
RESET ROLE;
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000000a1';
SET LOCAL ROLE authenticated;

INSERT INTO public.profiles (id, email, "roleType", "roleTypes")
VALUES ('00000000-0000-4000-8000-0000000000a1', 'proof-normal-user@unclouded.invalid',
        'admin', ARRAY['admin', 'pro']);

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) IS NULL,
    'FAIL 1h: INSERT with roleType admin stuck';
  ASSERT (SELECT "roleTypes" FROM public.profiles WHERE id = auth.uid()) = ARRAY['pro'],
    'FAIL 1i: INSERT with admin in roleTypes stuck';
  ASSERT public.is_settings_admin() = false, 'FAIL 1j: is_settings_admin() true after INSERT';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. As existing admin A (authenticated JWT): Settings → Profile save keeps admin silently
--    (saveProfileForm writes roleType = syncLegacyRoleType(roleTypes), i.e. a customer slug)
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a2', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

UPDATE public.profiles
SET "firstName" = 'Proof', "roleType" = 'pro', "roleTypes" = ARRAY['pro']
WHERE id = '00000000-0000-4000-8000-0000000000a2';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'admin',
    'FAIL 2a: admin demoted by own profile save';
  ASSERT (SELECT "firstName" FROM public.profiles WHERE id = auth.uid()) = 'Proof',
    'FAIL 2b: admin profile save rejected other columns';
  ASSERT (SELECT "roleTypes" FROM public.profiles WHERE id = auth.uid()) = ARRAY['pro'],
    'FAIL 2c: admin customer roleTypes not saved';
  ASSERT public.is_settings_admin() = true, 'FAIL 2d: admin lost is_settings_admin()';
END $$;

-- Clearing roles (syncLegacyRoleType([]) = null) also keeps admin
UPDATE public.profiles SET "roleType" = NULL, "roleTypes" = '{}'
WHERE id = '00000000-0000-4000-8000-0000000000a2';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'admin',
    'FAIL 2e: admin demoted by NULL roleType';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. As service_role (admin-users edge / seed script): promotion works
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;

UPDATE public.profiles SET "roleType" = 'admin', "roleTypes" = '{}'
WHERE id = '00000000-0000-4000-8000-0000000000a1';

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000000a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'admin',
    'FAIL 3a: service_role could not promote to admin';
  ASSERT public.is_settings_admin() = true, 'FAIL 3b: promoted user not is_settings_admin()';
END $$;

-- ...and the now-admin user still cannot demote themselves via a direct PATCH
UPDATE public.profiles SET "roleType" = 'pro' WHERE id = '00000000-0000-4000-8000-0000000000a1';

DO $$
BEGIN
  ASSERT (SELECT "roleType" FROM public.profiles WHERE id = auth.uid()) = 'admin',
    'FAIL 3c: authenticated admin changed own admin role';
END $$;

RESET ROLE;

SELECT 'admin role guard proof: ALL PASS' AS result;

ROLLBACK;
