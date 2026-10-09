-- Proof for NCLDD-52 (20261008120000_ai_usage_ledger, ..130000_ai_usage_limits, ..140000_ai_usage_admin_reads).
-- Run AFTER the three migrations, as postgres (SQL editor / execute_sql). Self-contained:
-- creates throwaway auth users inside the transaction and ends in ROLLBACK — nothing persists.
-- Every check is an ASSERT; any failure aborts with the failing message. Success ends with
-- the final SELECT returning 'ai usage limits proof: ALL PASS'.
--
-- U1, U2 = normal (free) users, A = admin. IDs are fixed so the checks are readable.

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000052a1', 'proof-ai-u1@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000052a2', 'proof-ai-u2@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000052ad', 'proof-ai-admin@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
WHERE u.id IN (
  '00000000-0000-4000-8000-0000000052a1',
  '00000000-0000-4000-8000-0000000052a2',
  '00000000-0000-4000-8000-0000000052ad'
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin'
WHERE id = '00000000-0000-4000-8000-0000000052ad';

-- Ledger fixtures (service path, as postgres): U1 text $3.00 + voice $1.00, U2 text $4.00.
INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd", "planTierAtEvent")
VALUES
  ('00000000-0000-4000-8000-0000000052a1', 'text', 'chat_turn', 'gpt-4o-mini', 3.00, 'free'),
  ('00000000-0000-4000-8000-0000000052a1', 'voice', 'tts', 'tts-1', 1.00, 'free'),
  ('00000000-0000-4000-8000-0000000052a2', 'text', 'chat_turn', 'gpt-4o-mini', 4.00, 'free');

-- ---------------------------------------------------------------------------
-- 1. Non-admin (authenticated U1): every admin RPC is rejected, tables are closed
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000052a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000052a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_denied int := 0;
  v_rows int;
BEGIN
  BEGIN PERFORM public.admin_ai_usage_overview((now() AT TIME ZONE 'utc')::date - 1, (now() AT TIME ZONE 'utc')::date, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_ai_plan_limits();
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_ai_usage_users(NULL, NULL, NULL, 10, 0);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_ai_user_limit_detail('00000000-0000-4000-8000-0000000052a1');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_ai_limit_audit(10, 0, NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_set_ai_plan_limit('free', 'text', 1);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a1', 'text', 'unlimited', NULL);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.admin_restore_ai_user_limit('00000000-0000-4000-8000-0000000052a1', 'text');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  ASSERT v_denied = 8, format('FAIL 1a: only %s of 8 admin RPCs rejected a non-admin', v_denied);

  -- Internal functions are not executable by authenticated at all.
  v_denied := 0;
  BEGIN PERFORM public.check_ai_budget('00000000-0000-4000-8000-0000000052a1', 'text');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM public.ai_effective_limit('00000000-0000-4000-8000-0000000052a1', 'text');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  ASSERT v_denied = 2, 'FAIL 1b: authenticated can run internal budget functions';

  -- Tables: no grants for the ledger, limits, overrides and restores.
  v_denied := 0;
  BEGIN PERFORM 1 FROM public."aiUsageEvent" LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM 1 FROM public."aiUserLimitOverride" LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM 1 FROM public."aiUserLimitRestore" LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN PERFORM 1 FROM public."aiPlanLimit" LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  ASSERT v_denied = 4, 'FAIL 1c: a limits/ledger table is readable by authenticated';

  -- Audit log and price table are readable only through the admin policy: 0 rows for non-admin.
  SELECT count(*) INTO v_rows FROM public."aiLimitAuditLog";
  ASSERT v_rows = 0, 'FAIL 1d: non-admin sees audit log rows';
  SELECT count(*) INTO v_rows FROM public."aiModelPricing";
  ASSERT v_rows = 0, 'FAIL 1e: non-admin sees price rows';

  v_denied := 0;
  BEGIN
    INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
    VALUES ('00000000-0000-4000-8000-0000000052a1', 'text', 'chat_turn', 'gpt-4o-mini', 0);
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  BEGIN
    INSERT INTO public."aiLimitAuditLog" (action, mode) VALUES ('plan_limit_set', 'text');
  EXCEPTION WHEN insufficient_privilege THEN v_denied := v_denied + 1; END;
  ASSERT v_denied = 2, 'FAIL 1f: authenticated can insert into the ledger or audit log';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Helper: run one statement that returns jsonb as admin A (authenticated JWT), then drop back to
-- postgres so the proof can inspect tables directly.
-- ---------------------------------------------------------------------------
CREATE FUNCTION pg_temp.as_admin(q text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  r jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims',
    '{"sub":"00000000-0000-4000-8000-0000000052ad","role":"authenticated"}', true);
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000052ad', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
  EXECUTE q INTO r;
  RESET ROLE;
  RETURN r;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Admin A: plan limits, validation, no_change, audit actor
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r jsonb;
  v_audit_before int;
BEGIN
  -- Seeded plan limits are "not set" (NULL), never the example numbers from the ticket.
  ASSERT (SELECT count(*) FROM public."aiPlanLimit") = 6, 'FAIL 2a: expected 6 plan limit rows';
  ASSERT (SELECT count(*) FROM public."aiPlanLimit" WHERE "monthlyUsd" IS NOT NULL) = 0,
    'FAIL 2b: plan limits were seeded with values';

  r := pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', 5.00)$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'updated', 'FAIL 2c: set plan limit failed: ' || r::text;
  ASSERT (SELECT "monthlyUsd" FROM public."aiPlanLimit" WHERE "planTier" = 'free' AND mode = 'text') = 5.00,
    'FAIL 2d: plan limit not stored';

  SELECT count(*) INTO v_audit_before FROM public."aiLimitAuditLog";
  r := pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', 5.00)$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'no_change', 'FAIL 2e: unchanged value not reported as no_change';
  ASSERT (SELECT count(*) FROM public."aiLimitAuditLog") = v_audit_before,
    'FAIL 2f: no_change wrote an audit row';

  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', -1)$q$) ->> 'ok')::boolean,
    'FAIL 2g: negative accepted';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', 1.234)$q$) ->> 'ok')::boolean,
    'FAIL 2h: 3 decimals accepted';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', 100000.01)$q$) ->> 'ok')::boolean,
    'FAIL 2i: >100000 accepted';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('gold', 'text', 1)$q$) ->> 'ok')::boolean,
    'FAIL 2j: unknown tier accepted';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'other', 1)$q$) ->> 'ok')::boolean,
    'FAIL 2k: mode other accepted';
  ASSERT (SELECT "monthlyUsd" FROM public."aiPlanLimit" WHERE "planTier" = 'free' AND mode = 'text') = 5.00,
    'FAIL 2l: rejected input changed the stored limit';
  ASSERT (SELECT count(*) FROM public."aiLimitAuditLog") = v_audit_before,
    'FAIL 2m: rejected input wrote an audit row';

  ASSERT (SELECT "actorUserId" FROM public."aiLimitAuditLog" WHERE action = 'plan_limit_set'
          ORDER BY "createdAt" DESC LIMIT 1) = '00000000-0000-4000-8000-0000000052ad',
    'FAIL 2n: audit actor is not auth.uid()';
END $$;

-- ---------------------------------------------------------------------------
-- 3. Budget check (service path): plan limit, custom override, unlimited, isolation
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r jsonb;
  c_u1 constant uuid := '00000000-0000-4000-8000-0000000052a1';
  c_u2 constant uuid := '00000000-0000-4000-8000-0000000052a2';
  e jsonb;
BEGIN
  -- Free text limit $5: U1 used $3 -> allowed, U2 used $4 -> allowed.
  ASSERT (public.check_ai_budget(c_u1, 'text') ->> 'allowed')::boolean, 'FAIL 3a: U1 blocked under limit';
  ASSERT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean, 'FAIL 3b: U2 blocked under limit';
  -- Voice has no limit set -> allowed. `other` is never limited.
  ASSERT (public.check_ai_budget(c_u1, 'voice') ->> 'allowed')::boolean, 'FAIL 3c: unset voice limit blocked';
  ASSERT (public.check_ai_budget(c_u1, 'other') ->> 'allowed')::boolean, 'FAIL 3d: other mode blocked';

  -- Tighten free text to $3.50: U1 ($3) allowed, U2 ($4) blocked.
  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'text', 3.50)$q$);
  ASSERT (public.check_ai_budget(c_u1, 'text') ->> 'allowed')::boolean, 'FAIL 3e: U1 blocked below $3.50';
  r := public.check_ai_budget(c_u2, 'text');
  ASSERT NOT (r ->> 'allowed')::boolean AND r ->> 'code' = 'ai_monthly_limit_reached',
    'FAIL 3f: U2 over the plan limit not blocked: ' || r::text;
  ASSERT r ->> 'tier' = 'free', 'FAIL 3g: tier missing from block result';

  -- Custom override for U2 beats the plan; invalid custom values rejected.
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'custom', -5)$q$) ->> 'ok')::boolean,
    'FAIL 3h: negative custom accepted';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'custom', NULL)$q$) ->> 'ok')::boolean,
    'FAIL 3i: null custom accepted';
  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'custom', 10.00)$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'updated', 'FAIL 3j: custom override failed: ' || r::text;
  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'custom', 10.00)$q$);
  ASSERT r ->> 'code' = 'no_change', 'FAIL 3k: repeated custom override not no_change';

  e := public.ai_effective_limit(c_u2, 'text');
  ASSERT e ->> 'source' = 'custom' AND (e ->> 'limitUsd')::numeric = 10.00, 'FAIL 3l: custom did not win over plan';
  ASSERT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean, 'FAIL 3m: U2 blocked despite custom $10';
  -- Override is per user and per mode.
  ASSERT public.ai_effective_limit(c_u1, 'text') ->> 'source' = 'plan', 'FAIL 3n: override leaked to U1';
  ASSERT public.ai_effective_limit(c_u2, 'voice') ->> 'source' = 'unset', 'FAIL 3o: text override leaked to voice';

  -- Custom limit lower than usage blocks.
  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'custom', 1.00)$q$);
  ASSERT NOT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean, 'FAIL 3p: custom $1 below usage $4 not blocking';

  -- Unlimited unblocks but keeps counting usage.
  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'unlimited', NULL)$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'updated', 'FAIL 3q: unlimited failed: ' || r::text;
  e := public.ai_effective_limit(c_u2, 'text');
  ASSERT e ->> 'source' = 'unlimited' AND e -> 'limitUsd' = 'null'::jsonb, 'FAIL 3r: unlimited has a limit';
  ASSERT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean, 'FAIL 3s: unlimited user blocked';
  ASSERT (e ->> 'usedUsd')::numeric = 4.00, 'FAIL 3t: unlimited stopped counting usage';

  -- Back to the plan default.
  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'plan', NULL)$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'updated', 'FAIL 3u: reset to plan failed: ' || r::text;
  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text', 'plan', NULL)$q$);
  ASSERT r ->> 'code' = 'no_change', 'FAIL 3v: reset to plan twice not no_change';
  ASSERT NOT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean,
    'FAIL 3w: U2 not blocked again under plan limit $3.50 after reset';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Restore: remaining returns to the full limit; history and plan untouched
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r jsonb;
  c_u2 constant uuid := '00000000-0000-4000-8000-0000000052a2';
  v_events int;
  v_plan numeric;
  v_audit int;
  e jsonb;
BEGIN
  SELECT count(*) INTO v_events FROM public."aiUsageEvent";
  SELECT "monthlyUsd" INTO v_plan FROM public."aiPlanLimit" WHERE "planTier" = 'free' AND mode = 'text';

  r := pg_temp.as_admin($q$select public.admin_restore_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text')$q$);
  ASSERT (r ->> 'ok')::boolean AND r ->> 'code' = 'restored', 'FAIL 4a: restore failed: ' || r::text;

  e := pg_temp.as_admin($q$select public.admin_ai_user_limit_detail('00000000-0000-4000-8000-0000000052a2') -> 'text'$q$);
  ASSERT (e ->> 'usedUsd')::numeric = 0 AND (e ->> 'remainingUsd')::numeric = 3.50
    AND NOT (e ->> 'exceeded')::boolean, 'FAIL 4b: remaining is not the full limit after restore: ' || e::text;
  ASSERT (e ->> 'monthSpendUsd')::numeric = 4.00, 'FAIL 4c: restore altered the spend history';
  ASSERT (SELECT count(*) FROM public."aiUsageEvent") = v_events, 'FAIL 4d: restore deleted/added ledger rows';
  ASSERT (SELECT "monthlyUsd" FROM public."aiPlanLimit" WHERE "planTier" = 'free' AND mode = 'text') = v_plan,
    'FAIL 4e: restore changed the plan limit';
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiUserLimitOverride" WHERE "userId" = c_u2),
    'FAIL 4f: restore created an override';

  -- Other user and other mode unaffected.
  ASSERT (pg_temp.as_admin($q$select public.admin_ai_user_limit_detail('00000000-0000-4000-8000-0000000052a1') -> 'text'$q$) ->> 'usedUsd')::numeric = 3.00,
    'FAIL 4g: U1 usage changed';
  ASSERT (pg_temp.as_admin($q$select public.admin_ai_user_limit_detail('00000000-0000-4000-8000-0000000052a1') -> 'voice'$q$) ->> 'usedUsd')::numeric = 1.00,
    'FAIL 4h: voice usage changed';

  -- Restoring again with nothing used is a no_change and writes nothing.
  SELECT count(*) INTO v_audit FROM public."aiLimitAuditLog";
  r := pg_temp.as_admin($q$select public.admin_restore_ai_user_limit('00000000-0000-4000-8000-0000000052a2', 'text')$q$);
  ASSERT r ->> 'code' = 'no_change', 'FAIL 4i: second restore not no_change';
  ASSERT (SELECT count(*) FROM public."aiLimitAuditLog") = v_audit, 'FAIL 4j: no_change restore wrote an audit row';
  ASSERT (SELECT count(*) FROM public."aiUserLimitRestore" WHERE "userId" = c_u2) = 1,
    'FAIL 4k: extra restore baseline created';

  ASSERT (SELECT "actorUserId" FROM public."aiLimitAuditLog" WHERE action = 'user_limit_restored'
          ORDER BY "createdAt" DESC LIMIT 1) = '00000000-0000-4000-8000-0000000052ad',
    'FAIL 4l: restore audit actor is not auth.uid()';

  -- New spend after the restore counts again from the baseline.
  ASSERT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean, 'FAIL 4m: restored user still blocked';
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
  VALUES (c_u2, 'text', 'chat_turn', 'gpt-4o-mini', 3.50);
  ASSERT NOT (public.check_ai_budget(c_u2, 'text') ->> 'allowed')::boolean,
    'FAIL 4n: spend after restore is not counted';
END $$;

-- ---------------------------------------------------------------------------
-- 5. Admin read RPCs return sane shapes
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  o jsonb;
  u jsonb;
  a jsonb;
BEGIN
  o := pg_temp.as_admin($q$select public.admin_ai_usage_overview((now() AT TIME ZONE 'utc')::date, (now() AT TIME ZONE 'utc')::date, NULL)$q$);
  ASSERT (o ->> 'ok')::boolean, 'FAIL 5a: overview failed: ' || o::text;
  ASSERT (o -> 'kpis' ->> 'spendUsd')::numeric = 11.50, 'FAIL 5b: overview spend mismatch: ' || (o -> 'kpis')::text;
  ASSERT (o -> 'kpis' ->> 'activeUsers')::int >= 2, 'FAIL 5c: overview active users';
  ASSERT jsonb_array_length(o -> 'byMode') = 3, 'FAIL 5d: byMode must list text/voice/other';
  ASSERT jsonb_array_length(o -> 'byPlan') = 3, 'FAIL 5e: byPlan must list 3 tiers';
  ASSERT jsonb_array_length(o -> 'daily') = 1, 'FAIL 5f: one day expected';
  ASSERT (pg_temp.as_admin($q$select public.admin_ai_usage_overview((now() AT TIME ZONE 'utc')::date, (now() AT TIME ZONE 'utc')::date, 'premium')$q$) -> 'kpis' ->> 'spendUsd')::numeric = 0,
    'FAIL 5g: tier filter not applied';
  ASSERT NOT (pg_temp.as_admin($q$select public.admin_ai_usage_overview((now() AT TIME ZONE 'utc')::date, ((now() AT TIME ZONE 'utc')::date - 5), NULL)$q$) ->> 'ok')::boolean,
    'FAIL 5h: reversed period accepted';

  u := pg_temp.as_admin($q$select public.admin_ai_usage_users('proof-ai-u', NULL, NULL, 10, 0)$q$);
  ASSERT (u ->> 'ok')::boolean AND (u ->> 'total')::int = 2, 'FAIL 5i: users search/total: ' || u::text;
  u := pg_temp.as_admin($q$select public.admin_ai_usage_users('proof-ai-u', NULL, 'exceeded', 10, 0)$q$);
  ASSERT (u ->> 'total')::int = 1, 'FAIL 5j: exceeded filter: ' || u::text;
  u := pg_temp.as_admin($q$select public.admin_ai_usage_users('proof-ai-u', NULL, 'ok', 10, 0)$q$);
  ASSERT (u ->> 'total')::int = 1, 'FAIL 5k: ok filter: ' || u::text;

  a := pg_temp.as_admin($q$select public.admin_ai_limit_audit(50, 0, '00000000-0000-4000-8000-0000000052a2')$q$);
  ASSERT (a ->> 'total')::int >= 4, 'FAIL 5l: per-user audit missing rows: ' || a::text;
  ASSERT (SELECT bool_and(r ->> 'actorUserId' = '00000000-0000-4000-8000-0000000052ad')
          FROM jsonb_array_elements(a -> 'rows') r), 'FAIL 5m: audit rows with a foreign actor';
END $$;

-- ---------------------------------------------------------------------------
-- 6. Edge cases (docs/NCLDD-52-test-plan.md A-1…A-7). U3, U4 = fresh free users.
-- State from earlier sections: free text limit $3.50, free voice limit not set.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000052a3', 'proof-ai-u3@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000052a4', 'proof-ai-u4@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
WHERE u.id IN ('00000000-0000-4000-8000-0000000052a3', '00000000-0000-4000-8000-0000000052a4')
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET tier = 'free', subscribed = false
WHERE id IN ('00000000-0000-4000-8000-0000000052a3', '00000000-0000-4000-8000-0000000052a4');

-- A-1: month boundary (spend and Restore baselines of the previous UTC month do not count).
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  v_prev_month text := to_char(timezone('utc', now()) - interval '1 month', 'YYYY-MM');
  -- Last hour of the previous UTC month.
  v_prev_at timestamptz := (date_trunc('month', timezone('utc', now())) - interval '1 hour') AT TIME ZONE 'UTC';
  r jsonb;
  e jsonb;
BEGIN
  r := pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'voice', 2.00)$q$);
  ASSERT (r ->> 'ok')::boolean, 'FAIL 6a: set free voice limit: ' || r::text;

  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd", "monthKey", "createdAt")
  VALUES (c_u3, 'voice', 'tts', 'tts-1', 5.00, v_prev_month, v_prev_at);

  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT (e ->> 'monthSpendUsd')::numeric = 0 AND (e ->> 'usedUsd')::numeric = 0,
    'FAIL 6b: previous-month spend counted in the current month: ' || e::text;
  ASSERT (public.check_ai_budget(c_u3, 'voice') ->> 'allowed')::boolean,
    'FAIL 6c: previous-month spend blocks the current month';

  e := public.ai_effective_limit(c_u3, 'voice', v_prev_month);
  ASSERT (e ->> 'monthSpendUsd')::numeric = 5.00 AND (e ->> 'exceeded')::boolean,
    'FAIL 6d: previous month not evaluated on its own: ' || e::text;

  -- A baseline stored for the previous month must not reduce current-month usage.
  INSERT INTO public."aiUserLimitRestore" ("userId", mode, "monthKey", "spendBaselineUsd", "createdAt")
  VALUES (c_u3, 'voice', v_prev_month, 5.00, v_prev_at);
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
  VALUES (c_u3, 'voice', 'tts', 'tts-1', 2.50);

  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT (e ->> 'usedUsd')::numeric = 2.50 AND (e ->> 'baselineUsd')::numeric = 0,
    'FAIL 6e: previous-month Restore baseline applied to the current month: ' || e::text;
  ASSERT NOT (public.check_ai_budget(c_u3, 'voice') ->> 'allowed')::boolean,
    'FAIL 6f: $2.50 over the $2.00 voice limit not blocked';
END $$;

-- A-2: Restore and overrides are per mode.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  r jsonb;
  e jsonb;
BEGIN
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
  VALUES (c_u3, 'text', 'chat_turn', 'gpt-4o-mini', 1.00);
  ASSERT (public.check_ai_budget(c_u3, 'text') ->> 'allowed')::boolean,
    'FAIL 6g: exhausted voice blocks text';

  r := pg_temp.as_admin($q$select public.admin_restore_ai_user_limit('00000000-0000-4000-8000-0000000052a3', 'voice')$q$);
  ASSERT r ->> 'code' = 'restored', 'FAIL 6h: voice restore failed: ' || r::text;
  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT (e ->> 'usedUsd')::numeric = 0 AND (e ->> 'remainingUsd')::numeric = 2.00,
    'FAIL 6i: voice not restored to the full limit: ' || e::text;
  e := public.ai_effective_limit(c_u3, 'text');
  ASSERT (e ->> 'usedUsd')::numeric = 1.00 AND (e ->> 'baselineUsd')::numeric = 0,
    'FAIL 6j: voice restore changed text usage: ' || e::text;
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiUserLimitRestore" WHERE "userId" = c_u3 AND mode = 'text'),
    'FAIL 6k: voice restore wrote a text baseline';

  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a3', 'voice', 'custom', 0.50)$q$);
  ASSERT public.ai_effective_limit(c_u3, 'voice') ->> 'source' = 'custom', 'FAIL 6l: voice custom not applied';
  ASSERT public.ai_effective_limit(c_u3, 'text') ->> 'source' = 'plan', 'FAIL 6m: voice custom leaked to text';

  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a3', 'text', 'unlimited', NULL)$q$);
  ASSERT public.ai_effective_limit(c_u3, 'text') ->> 'source' = 'unlimited', 'FAIL 6n: text unlimited not applied';
  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT e ->> 'source' = 'custom' AND (e ->> 'limitUsd')::numeric = 0.50,
    'FAIL 6o: text unlimited changed the voice override: ' || e::text;
END $$;

-- A-4: Custom -> Plan default deletes the override, plan applies again, audit row written.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  r jsonb;
  e jsonb;
  v_cleared int;
  a public."aiLimitAuditLog"%ROWTYPE;
BEGIN
  SELECT count(*) INTO v_cleared FROM public."aiLimitAuditLog"
  WHERE "targetUserId" = c_u3 AND action = 'user_override_cleared';

  r := pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a3', 'voice', 'plan', NULL)$q$);
  ASSERT r ->> 'code' = 'updated', 'FAIL 6p: reset voice to plan failed: ' || r::text;
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiUserLimitOverride" WHERE "userId" = c_u3 AND mode = 'voice'),
    'FAIL 6q: plan default kept the override row';
  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT e ->> 'source' = 'plan' AND (e ->> 'limitUsd')::numeric = 2.00,
    'FAIL 6r: plan limit not applied after reset: ' || e::text;

  ASSERT (SELECT count(*) FROM public."aiLimitAuditLog"
          WHERE "targetUserId" = c_u3 AND action = 'user_override_cleared') = v_cleared + 1,
    'FAIL 6s: reset to plan wrote no audit row';
  SELECT * INTO a FROM public."aiLimitAuditLog"
  WHERE "targetUserId" = c_u3 AND action = 'user_override_cleared'
  ORDER BY "createdAt" DESC LIMIT 1;
  ASSERT a.mode = 'voice' AND a."oldValue" IS NOT NULL
    AND a."actorUserId" = '00000000-0000-4000-8000-0000000052ad',
    'FAIL 6t: reset audit row incomplete';

  ASSERT public.ai_effective_limit(c_u3, 'text') ->> 'source' = 'unlimited',
    'FAIL 6u: voice reset changed the text override';
END $$;

-- A-3: `other` spend is never part of the text/voice budgets.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  v_raised boolean := false;
BEGIN
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
  VALUES (c_u3, 'other', 'standalone_insight', 'gpt-4o-mini', 50.00);

  ASSERT (public.ai_effective_limit(c_u3, 'text') ->> 'monthSpendUsd')::numeric = 1.00,
    'FAIL 6v: other spend counted as text';
  ASSERT (public.ai_effective_limit(c_u3, 'voice') ->> 'usedUsd')::numeric = 0,
    'FAIL 6w: other spend counted as voice';
  ASSERT (public.check_ai_budget(c_u3, 'other') ->> 'allowed')::boolean, 'FAIL 6x: other blocked';

  BEGIN
    PERFORM public.ai_effective_limit(c_u3, 'other');
  EXCEPTION WHEN invalid_parameter_value THEN v_raised := true;
  END;
  ASSERT v_raised, 'FAIL 6y: ai_effective_limit accepted mode other';
END $$;

-- A-5: limit not set never blocks; limit 0 blocks the first call.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  c_u4 constant uuid := '00000000-0000-4000-8000-0000000052a4';
  r jsonb;
  e jsonb;
BEGIN
  r := pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'voice', NULL)$q$);
  ASSERT r ->> 'code' = 'updated', 'FAIL 6z: clearing the plan limit failed: ' || r::text;

  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd")
  VALUES (c_u3, 'voice', 'tts', 'tts-1', 100.00);
  e := public.ai_effective_limit(c_u3, 'voice');
  ASSERT e ->> 'source' = 'unset' AND e -> 'remainingUsd' = 'null'::jsonb AND NOT (e ->> 'exceeded')::boolean,
    'FAIL 6aa: unset limit reports a limit: ' || e::text;
  ASSERT (public.check_ai_budget(c_u3, 'voice') ->> 'allowed')::boolean, 'FAIL 6ab: unset limit blocked';

  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('free', 'voice', 0)$q$);
  e := public.ai_effective_limit(c_u4, 'voice');
  ASSERT (e ->> 'usedUsd')::numeric = 0 AND (e ->> 'exceeded')::boolean,
    'FAIL 6ac: $0 limit not exceeded with zero usage: ' || e::text;
  ASSERT NOT (public.check_ai_budget(c_u4, 'voice') ->> 'allowed')::boolean, 'FAIL 6ad: $0 limit allowed a call';
  ASSERT (public.check_ai_budget(c_u4, 'text') ->> 'allowed')::boolean, 'FAIL 6ae: $0 voice limit blocked text';
END $$;

-- A-7: plan change mid-month. Limits follow the current plan, all month spend still counts;
-- the dashboard keeps old events under the plan snapshot.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  e jsonb;
  r jsonb;
BEGIN
  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_plan_limit('pro', 'text', 0.50)$q$);
  PERFORM pg_temp.as_admin($q$select public.admin_set_ai_user_limit('00000000-0000-4000-8000-0000000052a3', 'text', 'plan', NULL)$q$);

  UPDATE public.profiles SET tier = 'pro' WHERE id = c_u3;
  ASSERT public.ai_limit_tier(c_u3) = 'pro', 'FAIL 6af: tier change not picked up';

  e := public.ai_effective_limit(c_u3, 'text');
  ASSERT e ->> 'tier' = 'pro' AND e ->> 'source' = 'plan' AND (e ->> 'limitUsd')::numeric = 0.50
    AND (e ->> 'usedUsd')::numeric = 1.00 AND (e ->> 'exceeded')::boolean,
    'FAIL 6ag: limit does not follow the new plan or dropped Free-time spend: ' || e::text;
  r := public.check_ai_budget(c_u3, 'text');
  ASSERT NOT (r ->> 'allowed')::boolean AND r ->> 'tier' = 'pro', 'FAIL 6ah: budget check after plan change: ' || r::text;

  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd", "planTierAtEvent")
  VALUES (c_u3, 'text', 'chat_turn', 'gpt-4o-mini', 0.20, 'pro');
  ASSERT (SELECT count(*) FROM public."aiUsageEvent" WHERE "userId" = c_u3 AND "planTierAtEvent" = 'free') > 0,
    'FAIL 6ai: plan change rewrote the event snapshot';
END $$;

-- A-6: Overview equals a direct sum over the ledger for every plan filter and period,
-- incl. an event in the last second of yesterday (inclusive end date) and the breakdowns.
DO $$
DECLARE
  c_u3 constant uuid := '00000000-0000-4000-8000-0000000052a3';
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_tiers text[] := ARRAY['free', 'pro', 'premium', NULL];
  v_tier text;
  v_from date;
  v_to date;
  v_period int;
  o jsonb;
  v_spend numeric;
  v_users int;
  v_sessions int;
BEGIN
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "costUsd", "planTierAtEvent", "monthKey", "createdAt")
  VALUES (
    c_u3, 'other', 'standalone_insight', 'gpt-4o-mini', 0.75, 'pro',
    to_char(v_today - 1, 'YYYY-MM'),
    (v_today::timestamp AT TIME ZONE 'UTC') - interval '1 second'
  );

  FOR v_period IN 1..3 LOOP
    v_from := CASE v_period WHEN 1 THEN v_today - 1 WHEN 2 THEN v_today - 1 ELSE v_today END;
    v_to := CASE v_period WHEN 1 THEN v_today - 1 ELSE v_today END;

    FOR i IN 1..array_length(v_tiers, 1) LOOP
      v_tier := v_tiers[i];

      SELECT coalesce(sum("costUsd"), 0), count(DISTINCT "userId"), count(DISTINCT "conversationId")
      INTO v_spend, v_users, v_sessions
      FROM public."aiUsageEvent"
      WHERE "createdAt" >= (v_from::timestamp AT TIME ZONE 'UTC')
        AND "createdAt" < ((v_to + 1)::timestamp AT TIME ZONE 'UTC')
        AND (v_tier IS NULL OR "planTierAtEvent" = v_tier);

      o := pg_temp.as_admin(format(
        'select public.admin_ai_usage_overview(%L::date, %L::date, %L::text)', v_from, v_to, v_tier));
      ASSERT (o ->> 'ok')::boolean, format('FAIL 6aj: overview %s..%s %s failed: %s', v_from, v_to, v_tier, o);

      ASSERT (o -> 'kpis' ->> 'spendUsd')::numeric = v_spend,
        format('FAIL 6ak: spend %s..%s %s: overview %s, ledger %s', v_from, v_to, v_tier, o -> 'kpis' ->> 'spendUsd', v_spend);
      ASSERT (o -> 'kpis' ->> 'activeUsers')::int = v_users,
        format('FAIL 6al: active users %s..%s %s', v_from, v_to, v_tier);
      ASSERT (o -> 'kpis' ->> 'sessions')::int = v_sessions,
        format('FAIL 6am: sessions %s..%s %s', v_from, v_to, v_tier);
      ASSERT jsonb_array_length(o -> 'daily') = (v_to - v_from) + 1,
        format('FAIL 6an: daily points %s..%s', v_from, v_to);

      ASSERT (SELECT coalesce(sum((x ->> 'spendUsd')::numeric), 0) FROM jsonb_array_elements(o -> 'daily') x) = v_spend,
        format('FAIL 6ao: daily spend does not add up %s..%s %s', v_from, v_to, v_tier);
      ASSERT (SELECT coalesce(sum((x ->> 'spendUsd')::numeric), 0) FROM jsonb_array_elements(o -> 'byMode') x) = v_spend,
        format('FAIL 6ap: byMode does not add up %s..%s %s', v_from, v_to, v_tier);
      ASSERT (SELECT coalesce(sum((x ->> 'spendUsd')::numeric), 0) FROM jsonb_array_elements(o -> 'byPlan') x) = v_spend,
        format('FAIL 6aq: byPlan does not add up %s..%s %s', v_from, v_to, v_tier);
      ASSERT (SELECT coalesce(sum((x ->> 'spendUsd')::numeric), 0) FROM jsonb_array_elements(o -> 'byModel') x) = v_spend,
        format('FAIL 6ar: byModel does not add up %s..%s %s', v_from, v_to, v_tier);
    END LOOP;
  END LOOP;

  -- The yesterday event is inside a one-day "yesterday" range and outside "today".
  ASSERT (pg_temp.as_admin(format(
            'select public.admin_ai_usage_overview(%L::date, %L::date, %L)', v_today - 1, v_today - 1, 'pro'))
          -> 'kpis' ->> 'spendUsd')::numeric >= 0.75,
    'FAIL 6as: inclusive end date dropped the last second of the day';

  -- A-7 (dashboard side): Pro filter shows only Pro-snapshot events, Free keeps U3's Free-time spend.
  ASSERT (SELECT (x ->> 'spendUsd')::numeric FROM jsonb_array_elements(
            pg_temp.as_admin(format('select public.admin_ai_usage_overview(%L::date, %L::date, NULL)', v_today, v_today))
            -> 'byPlan') x WHERE x ->> 'tier' = 'pro')
         = (SELECT coalesce(sum("costUsd"), 0) FROM public."aiUsageEvent"
            WHERE "planTierAtEvent" = 'pro' AND "createdAt" >= (v_today::timestamp AT TIME ZONE 'UTC')),
    'FAIL 6at: byPlan does not follow the event plan snapshot';
END $$;

SELECT 'ai usage limits proof: ALL PASS' AS result;

ROLLBACK;
