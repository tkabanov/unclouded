-- Proof for NCLDD-56 link-visit tracking (record_referral_link_click + "linkVisits" counters in
-- 20261013180000 / 190000 / 200000). Run AFTER 20261013150000..20261013200000, as postgres.
-- Self-contained, ends in ROLLBACK. Success ends with 'referral link clicks proof: ALL PASS'.
--
-- R = user with a share code, P = active partner linked to account L, Q = inactive partner,
-- ADM = admin.

BEGIN;

INSERT INTO public."referralPartner" (id, name, type, email, status, "referralCode") VALUES
  ('00000000-0000-4000-8000-0000000062b1', 'Proof Click P', 'coach', 'proof-lc-p@unclouded.invalid', 'active', 'PRLCPA22'),
  ('00000000-0000-4000-8000-0000000062b2', 'Proof Click Q', 'coach', 'proof-lc-q@unclouded.invalid', 'inactive', 'PRLCQA22');

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000062a1', 'proof-lc-r@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000062a7', 'proof-lc-l@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000062ad', 'proof-lc-admin@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-lc-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "referralCode" = 'PRLCREF2' WHERE id = '00000000-0000-4000-8000-0000000062a1';
UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000062ad';
UPDATE public."referralPartner" SET "userId" = '00000000-0000-4000-8000-0000000062a7'
WHERE id = '00000000-0000-4000-8000-0000000062b1';

-- ---------------------------------------------------------------------------
-- 1. Anonymous visitors: counted once per browser and day; junk ignored; table not readable.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

DO $$
DECLARE
  v_blocked boolean := false;
BEGIN
  ASSERT public.record_referral_link_click('prlcref2', '00000000-0000-4000-8000-00000000f001'), 'first visit counts';
  ASSERT NOT public.record_referral_link_click('PRLCREF2', '00000000-0000-4000-8000-00000000f001'), 'same browser same day: once';
  ASSERT public.record_referral_link_click('PRLCREF2', '00000000-0000-4000-8000-00000000f002'), 'another browser counts';
  ASSERT public.record_referral_link_click('PRLCPA22', '00000000-0000-4000-8000-00000000f001'), 'partner link counts';
  ASSERT NOT public.record_referral_link_click('PRLCQA22', '00000000-0000-4000-8000-00000000f001'), 'inactive partner: ignored';
  ASSERT NOT public.record_referral_link_click('ZZZZ2222', '00000000-0000-4000-8000-00000000f001'), 'unknown code: ignored';
  ASSERT NOT public.record_referral_link_click('bad-code', '00000000-0000-4000-8000-00000000f001'), 'invalid code: ignored';
  ASSERT NOT public.record_referral_link_click('PRLCREF2', NULL), 'no visitor id: ignored';

  BEGIN
    PERFORM count(*) FROM public."referralLinkClick";
  EXCEPTION WHEN SQLSTATE '42501' THEN v_blocked := true;
  END;
  ASSERT v_blocked, 'anon cannot read link visits';
END $$;

RESET ROLE;

-- 2. Owners' own visits are not counted.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000062a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000062a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT NOT public.record_referral_link_click('PRLCREF2', '00000000-0000-4000-8000-00000000f003'), 'own link';
  ASSERT (public.get_my_referral_overview() ->> 'linkVisits')::int = 2, 'R sees 2 link visits';
  ASSERT (SELECT count(*) FROM public."referralLinkClick") = 0, 'users cannot read the visit table';
END $$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000062a7","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000062a7', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT NOT public.record_referral_link_click('PRLCPA22', '00000000-0000-4000-8000-00000000f004'), 'partner own link';
  ASSERT (public.get_my_referral_partner_portal() -> 'totals' ->> 'linkVisits')::int = 1, 'partner sees 1 visit';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 3. Admin counters; per-code daily cap.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000062ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000062ad', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb;
BEGIN
  ASSERT (public.admin_get_user_referral_stats('00000000-0000-4000-8000-0000000062a1') -> 'invites' ->> 'linkVisits')::int = 2,
    'admin user stats: link visits';
  SELECT e INTO v FROM jsonb_array_elements(public.admin_referral_partner_metrics()) e
  WHERE e ->> 'partnerId' = '00000000-0000-4000-8000-0000000062b1';
  ASSERT (v ->> 'linkVisits')::int = 1, 'admin partner metrics: link visits';
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);

INSERT INTO public."referralLinkClick" (code, "referrerUserId", "visitorHash")
SELECT 'PRLCREF2', '00000000-0000-4000-8000-0000000062a1', 'cap-' || g
FROM generate_series(1, 2000) AS g;

DO $$
BEGIN
  ASSERT NOT public.record_referral_link_click('PRLCREF2', '00000000-0000-4000-8000-00000000f009'),
    'daily cap per code';
END $$;

-- 4. Owners with visits can still be deleted (visits go with them).
DELETE FROM public."referralPartner" WHERE id = '00000000-0000-4000-8000-0000000062b1';
DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000000062a1';

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."referralLinkClick"
          WHERE code IN ('PRLCREF2', 'PRLCPA22')) = 0, 'visits removed with their owner';
END $$;

SELECT 'referral link clicks proof: ALL PASS' AS result;

ROLLBACK;
