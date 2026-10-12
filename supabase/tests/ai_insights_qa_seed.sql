-- NCLDD-55 QA seed for the admin AI Insights tab (persistent; remove with ai_insights_qa_cleanup.sql).
-- Run as postgres: npx supabase db query --linked -f supabase/tests/ai_insights_qa_seed.sql
--
-- Facts are dated in CLOSED weeks before the current one, because admin_ai_insights_overview()
-- only reports whole closed weeks/months. Users have no password (they never sign in).
--
--   c1..c6  consent v1 (since -60 days), 2 facts each (text + voice)
--   n1      had consent when its facts were written, then declined  -> must never count
--   v0      consent for an outdated terms version                   -> must never count
--
-- Planted "near-k" items (4 consenting people + 1 excluded source => must stay hidden):
--   topic team_conflict        c1..c4 + n1
--   topic career_growth        c1..c4 + v0
--   request manage_up          c1..c4 + n1
--   feedback reason not_relevant  c1..c4 + n1
--   feedback reason too_long      c2..c5 after consent + c6 BEFORE its consent
-- Visible items (>= 5 consenting people): topics work_stress / burnout_energy,
-- requests prioritize_workload / set_boundaries, concern overwhelm, the catalog resource,
-- crisis line (c1..c5), reasons helpful_advice / too_generic.

BEGIN;

CREATE TEMP TABLE qa55_user (tag text PRIMARY KEY, id uuid NOT NULL) ON COMMIT DROP;
INSERT INTO qa55_user (tag, id)
SELECT tag, md5('qa55-user-' || tag)::uuid
FROM unnest(ARRAY['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'n1', 'v0']) AS tag;

INSERT INTO auth.users (id, email)
SELECT id, 'qa55-' || tag || '@unclouded.invalid' FROM qa55_user
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email)
SELECT id, 'qa55-' || tag || '@unclouded.invalid' FROM qa55_user
ON CONFLICT (id) DO NOTHING;

-- Everyone consents first (postgres bypasses the consent column guard), so all facts insert.
UPDATE public.profiles p
SET "aiInsightsConsent" = true,
    "aiInsightsConsentVersion" = 1,
    "aiInsightsConsentUpdatedAt" = CASE u.tag
      WHEN 'c6' THEN date_trunc('week', now()) - interval '5 days'
      ELSE now() - interval '60 days'
    END
FROM qa55_user u
WHERE p.id = u.id;

-- Two conversations per user: text in the last closed week, voice in the week before.
CREATE TEMP TABLE qa55_conv (tag text, id uuid, session_type text, session_date date) ON COMMIT DROP;
INSERT INTO qa55_conv
SELECT u.tag, md5('qa55-conv-' || u.tag || '-' || s.t)::uuid, s.t,
       CASE s.t WHEN 'text' THEN (date_trunc('week', current_date) - interval '3 days')::date
                ELSE (date_trunc('week', current_date) - interval '10 days')::date END
FROM qa55_user u CROSS JOIN (VALUES ('text'), ('voice')) AS s(t);

INSERT INTO public."chatConversation" (id, "userId", title, "sessionType")
SELECT c.id, u.id, 'QA55-SECRET-TITLE', c.session_type
FROM qa55_conv c JOIN qa55_user u USING (tag)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."aiInsightSessionFact" (
  "userId", "conversationId", "sessionType", "sessionDate", topics, "requestTypes",
  "concernThemes", "resourceIds", "crisisLineMentioned", "classifierVersion"
)
SELECT
  u.id, c.id, c.session_type, c.session_date,
  ARRAY['work_stress', 'burnout_energy']
    || CASE WHEN u.tag IN ('c1', 'c2', 'c3', 'c4', 'n1') THEN ARRAY['team_conflict'] ELSE '{}' END
    || CASE WHEN u.tag IN ('c1', 'c2', 'c3', 'c4', 'v0') THEN ARRAY['career_growth'] ELSE '{}' END,
  ARRAY['prioritize_workload', 'set_boundaries']
    || CASE WHEN u.tag IN ('c1', 'c2', 'c3', 'c4', 'n1') THEN ARRAY['manage_up'] ELSE '{}' END,
  ARRAY['overwhelm'],
  coalesce((SELECT array_agg(r.id) FROM (SELECT id FROM public.resource ORDER BY id LIMIT 1) r), '{}'),
  c.session_type = 'text' AND u.tag IN ('c1', 'c2', 'c3', 'c4', 'c5'),
  1
FROM qa55_conv c JOIN qa55_user u USING (tag)
ON CONFLICT ("conversationId") DO NOTHING;

-- Two assistant replies per text conversation, rated inside the last closed week.
CREATE TEMP TABLE qa55_msg (tag text, n int, id uuid, conv uuid) ON COMMIT DROP;
INSERT INTO qa55_msg
SELECT c.tag, n, md5('qa55-msg-' || c.tag || '-' || n)::uuid, c.id
FROM qa55_conv c CROSS JOIN generate_series(1, 3) AS n
WHERE c.session_type = 'text';

INSERT INTO public."chatMessage" (id, "userId", "conversationId", content, sender, "isFromUser")
SELECT m.id, u.id, m.conv, 'QA55-SECRET-TEXT reply ' || m.n, 'assistant', false
FROM qa55_msg m JOIN qa55_user u USING (tag)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."aiMessageFeedback" (
  "userId", "messageId", "conversationId", "sessionType", rating, reasons, "createdAt", "updatedAt"
)
SELECT u.id, m.id, m.conv, 'text', f.rating, f.reasons, f.at, f.at
FROM qa55_msg m
JOIN qa55_user u USING (tag)
CROSS JOIN LATERAL (
  SELECT
    CASE m.n WHEN 1 THEN 1 ELSE -1 END::smallint AS rating,
    CASE m.n
      WHEN 1 THEN ARRAY['helpful_advice']
      WHEN 2 THEN ARRAY['too_generic']
        || CASE WHEN u.tag IN ('c1', 'c2', 'c3', 'c4', 'n1') THEN ARRAY['not_relevant'] ELSE '{}' END
      ELSE ARRAY['too_long']
    END AS reasons,
    CASE WHEN u.tag = 'c6' AND m.n = 3
      THEN date_trunc('week', now()) - interval '6 days'   -- before c6 consented
      ELSE date_trunc('week', now()) - interval '2 days'
    END AS at
) f
WHERE u.tag IN ('c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'n1')
  AND (m.n < 3 OR u.tag IN ('c2', 'c3', 'c4', 'c5', 'c6'))
ON CONFLICT ("userId", "messageId") DO NOTHING;

-- Now n1 declines (directly, so its facts stay in the table and must be filtered out on read)
-- and v0's consent becomes an outdated version.
UPDATE public.profiles SET "aiInsightsConsent" = false
WHERE id = (SELECT id FROM qa55_user WHERE tag = 'n1');
UPDATE public.profiles SET "aiInsightsConsentVersion" = 0
WHERE id = (SELECT id FROM qa55_user WHERE tag = 'v0');

SELECT json_build_object(
  'users', (SELECT count(*) FROM public.profiles WHERE email LIKE 'qa55-%@unclouded.invalid'),
  'facts', (SELECT count(*) FROM public."aiInsightSessionFact" f JOIN qa55_user u ON u.id = f."userId"),
  'feedback', (SELECT count(*) FROM public."aiMessageFeedback" f JOIN qa55_user u ON u.id = f."userId"),
  'resources', (SELECT count(*) FROM public.resource)
) AS seeded;

COMMIT;
