-- NCLDD-55 QA smoke on the seeded data (run ai_insights_qa_seed.sql first). Ends in ROLLBACK.
-- Run as postgres: npx supabase db query --linked -f supabase/tests/ai_insights_qa_smoke.sql
-- Calls admin_ai_insights_overview() as admin-qa@test.com and checks k-anonymity, exclusion of
-- declined / outdated-consent users, no identifiers in the payload, period normalization,
-- rounding and revoke. Success ends with 'ai insights qa smoke: ALL PASS'.

BEGIN;

-- Fact trigger: a fact for a user without current consent is silently dropped.
DO $$
DECLARE
  v_n1 uuid := md5('qa55-user-n1')::uuid;
  v_conv uuid := md5('qa55-smoke-conv')::uuid;
BEGIN
  INSERT INTO public."chatConversation" (id, "userId", title, "sessionType")
  VALUES (v_conv, v_n1, 'smoke', 'text');
  INSERT INTO public."aiInsightSessionFact" ("userId", "conversationId", "sessionType", "sessionDate", "classifierVersion")
  VALUES (v_n1, v_conv, 'text', current_date - 1, 1);
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiInsightSessionFact" WHERE "conversationId" = v_conv),
    'fact for a declined user must be dropped by the trigger';
END $$;

SELECT set_config('request.jwt.claims',
  json_build_object('sub', id, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', id::text, true),
       set_config('request.jwt.claim.role', 'authenticated', true)
FROM public.profiles WHERE email = 'admin-qa@test.com';
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  r jsonb := public.admin_ai_insights_overview(current_date - 30, current_date);
  r_shift jsonb := public.admin_ai_insights_overview(current_date - 29, current_date - 1);
  txt text := r::text;
  keys text[];
  n numeric;
BEGIN
  ASSERT (r ->> 'ok')::boolean, 'overview must succeed for admin';

  -- Period: whole closed weeks, ending before today.
  ASSERT r #>> '{period,bucket}' = 'week', 'bucket must be week for 30 days';
  ASSERT extract(isodow FROM (r #>> '{period,from}')::date) = 1, 'period must start on Monday';
  ASSERT extract(isodow FROM (r #>> '{period,to}')::date) = 7, 'period must end on Sunday';
  ASSERT (r #>> '{period,to}')::date < current_date, 'period must end before today';

  -- Anti-differencing: a one-day shift gives identical numbers.
  ASSERT (r - 'period') = (r_shift - 'period'), 'one-day shift must not change any number';

  -- Sample: c1..c6 only (6 people -> 5, 12 sessions -> 10).
  ASSERT NOT (r #>> '{sample,suppressed}')::boolean, 'sample must be shown';
  ASSERT (r #>> '{sample,users}')::int = 5, 'users must be 6 rounded to 5';
  ASSERT (r #>> '{sample,sessions}')::int = 10, 'sessions must be 12 rounded to 10';
  ASSERT r #> '{sample,textSessions}' IS NOT NULL AND r #> '{sample,voiceSessions}' IS NOT NULL,
    'text/voice split must be shown (6 people each)';

  -- Visible items.
  SELECT array_agg(e ->> 'key') INTO keys FROM jsonb_array_elements(r -> 'topics') e;
  ASSERT keys @> ARRAY['work_stress', 'burnout_energy'], 'common topics must be listed';
  -- Near-k items: 4 consenting people + 1 excluded source must stay hidden.
  ASSERT NOT keys && ARRAY['team_conflict', 'career_growth'],
    'topics backed by 4 consenting people must be hidden (n1 / v0 must not count)';

  SELECT array_agg(e ->> 'key') INTO keys FROM jsonb_array_elements(r -> 'requestTypes') e;
  ASSERT keys @> ARRAY['prioritize_workload', 'set_boundaries'], 'common requests must be listed';
  ASSERT NOT keys && ARRAY['manage_up'], 'manage_up (4 people + n1) must be hidden';
  ASSERT jsonb_array_length(r -> 'requestTypes') <= 20, 'top 20 max';

  SELECT array_agg(e ->> 'key') INTO keys FROM jsonb_array_elements(r -> 'concerns') e;
  ASSERT keys @> ARRAY['overwhelm'], 'overwhelm must be listed';

  ASSERT (SELECT count(*) FROM public.resource) = 0 OR jsonb_array_length(r -> 'resources') >= 1,
    'seeded catalog resource must be listed';
  ASSERT NOT (r #>> '{crisisLines,suppressed}')::boolean, 'crisis line (c1..c5) must be shown';
  ASSERT (r #>> '{crisisLines,users}')::int = 5, 'crisis line users must be 5';

  -- Feedback: c1..c6 rated after consent.
  ASSERT NOT (r #>> '{feedback,suppressed}')::boolean, 'feedback must be shown';
  SELECT array_agg(e ->> 'key') INTO keys FROM jsonb_array_elements(r #> '{feedback,reasons}') e;
  ASSERT keys @> ARRAY['helpful_advice', 'too_generic'], 'common reasons must be listed';
  ASSERT NOT keys && ARRAY['not_relevant'], 'not_relevant (4 people + declined n1) must be hidden';
  ASSERT NOT keys && ARRAY['too_long'], 'too_long (4 people + c6 before consent) must be hidden';
  ASSERT (r #>> '{feedback,upShare}')::numeric BETWEEN 0 AND 1, 'upShare must be a share';

  -- Every count is a multiple of 5.
  FOR n IN
    SELECT (v #>> '{}')::numeric
    FROM jsonb_path_query(r, 'strict $.**') v
    WHERE jsonb_typeof(v) = 'number'
  LOOP
    ASSERT n = 5 OR n <= 1 OR n % 5 = 0, format('count %s is not a multiple of 5', n);
  END LOOP;

  -- No identifiers or text in the payload.
  ASSERT position('QA55-SECRET' IN txt) = 0, 'no message text or titles';
  ASSERT position('@' IN txt) = 0, 'no emails';
  -- The only uuids allowed are public catalog resource ids.
  ASSERT NOT EXISTS (
    SELECT 1
    FROM regexp_matches(txt, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'g') m
    WHERE m[1] NOT IN (SELECT e ->> 'resourceId' FROM jsonb_array_elements(r -> 'resources') e)
  ), 'no user or conversation ids';
  ASSERT NOT (r ?| ARRAY['userId', 'userIds', 'conversationId', 'messages', 'names']),
    'no identifier keys';

  -- Validation.
  ASSERT public.admin_ai_insights_overview(current_date - 400, current_date) ->> 'code' = 'period_too_long',
    '> 366 days must be rejected';
  ASSERT public.admin_ai_insights_overview(current_date, current_date - 5) ->> 'code' = 'invalid_period',
    'inverted period must be rejected';
  ASSERT (public.admin_ai_insights_overview(current_date, current_date) #>> '{sample,suppressed}')::boolean,
    'today-only period has no closed bucket and must be suppressed';
END $$;

RESET ROLE;

-- Revoke: c1 and c2 turn consent off in Settings -> their facts are deleted and the sample
-- (now 4 people) falls below k.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', md5('qa55-user-c1')::uuid, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', md5('qa55-user-c1')::uuid::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (public.set_ai_insights_consent(false, 1, 'settings') ->> 'deletedFacts')::int = 2,
    'revoke must delete both c1 facts';
  ASSERT public.set_ai_insights_consent(true, 2, 'settings') ->> 'code' = 'invalid_version',
    'future version must be rejected';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  json_build_object('sub', md5('qa55-user-c2')::uuid, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', md5('qa55-user-c2')::uuid::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (public.set_ai_insights_consent(false, 1, 'settings') ->> 'ok')::boolean, 'c2 revoke';
END $$;
RESET ROLE;

DO $$
BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiInsightSessionFact"
                     WHERE "userId" IN (md5('qa55-user-c1')::uuid, md5('qa55-user-c2')::uuid)),
    'revoked users must have no facts';
  ASSERT (SELECT count(*) FROM public."aiInsightsConsentEvent"
          WHERE "userId" = md5('qa55-user-c1')::uuid AND source = 'settings' AND NOT granted) = 1,
    'revoke must be audited';
END $$;

SELECT set_config('request.jwt.claims',
  json_build_object('sub', id, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', id::text, true)
FROM public.profiles WHERE email = 'admin-qa@test.com';
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  r jsonb := public.admin_ai_insights_overview(current_date - 30, current_date);
BEGIN
  ASSERT (r #>> '{sample,suppressed}')::boolean, 'after 2 revokes the sample (4 people) must be hidden';
  ASSERT jsonb_array_length(r -> 'topics') = 0, 'no topics below k';
  ASSERT (r #>> '{feedback,suppressed}')::boolean, 'feedback of 4 consenting people must be hidden';
END $$;
RESET ROLE;

-- Non-admin is refused.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', md5('qa55-user-c3')::uuid, 'role', 'authenticated')::text, true),
       set_config('request.jwt.claim.sub', md5('qa55-user-c3')::uuid::text, true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_ai_insights_overview(current_date - 30, current_date);
    ASSERT false, 'non-admin must be refused';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  ASSERT NOT has_table_privilege('public."aiInsightSessionFact"', 'SELECT'),
    'facts must be invisible to users';
END $$;
RESET ROLE;

SELECT 'ai insights qa smoke: ALL PASS' AS result;

ROLLBACK;
