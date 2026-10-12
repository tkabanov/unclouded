-- Proof for NCLDD-55 (20261013120000_ai_insights_consent, ..130000_ai_message_feedback,
-- ..140000_ai_insights_admin_reads). Run AFTER the three migrations, as postgres (SQL editor).
-- Self-contained: throwaway auth users inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'ai insights proof: ALL PASS'.
--
-- C1..C5 = consenting users, N = non-consenting user, A = admin.

BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000055c1', 'proof-ins-c1@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000055c2', 'proof-ins-c2@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000055c3', 'proof-ins-c3@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000055c4', 'proof-ins-c4@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000055c5', 'proof-ins-c5@unclouded.invalid'),
  ('00000000-0000-4000-8000-00000000550e', 'proof-ins-n@unclouded.invalid'),
  ('00000000-0000-4000-8000-0000000055ad', 'proof-ins-admin@unclouded.invalid');

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-ins-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin'
WHERE id = '00000000-0000-4000-8000-0000000055ad';

-- One finalized text conversation + one assistant message per user (as postgres).
INSERT INTO public."chatConversation" (id, "userId", title, "sessionType")
SELECT ('00000000-0000-4000-8000-1000000055' || right(u.id::text, 2))::uuid, u.id, 'proof', 'text'
FROM auth.users u WHERE u.email LIKE 'proof-ins-%@unclouded.invalid';

INSERT INTO public."chatMessage" (id, "userId", "conversationId", content, sender, "isFromUser")
SELECT ('00000000-0000-4000-8000-2000000055' || right(u.id::text, 2))::uuid, u.id,
       ('00000000-0000-4000-8000-1000000055' || right(u.id::text, 2))::uuid,
       'assistant reply', 'assistant', false
FROM auth.users u WHERE u.email LIKE 'proof-ins-%@unclouded.invalid';

-- ---------------------------------------------------------------------------
-- 1. Authenticated user cannot write consent columns directly; the RPC can.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000055c1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000055c1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

UPDATE public.profiles
SET "aiInsightsConsent" = true, "aiInsightsConsentVersion" = 99
WHERE id = '00000000-0000-4000-8000-0000000055c1';

DO $$
BEGIN
  ASSERT (SELECT "aiInsightsConsent" IS NULL AND "aiInsightsConsentVersion" IS NULL
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000055c1'),
    'direct UPDATE of consent columns must be ignored';

  ASSERT (public.set_ai_insights_consent(true, 1, 'first_use') ->> 'ok')::boolean,
    'set_ai_insights_consent must succeed for the owner';
  ASSERT (SELECT "aiInsightsConsent" AND "aiInsightsConsentVersion" = 1
          FROM public.profiles WHERE id = '00000000-0000-4000-8000-0000000055c1'),
    'consent must be stored by the RPC';
  ASSERT (SELECT count(*) FROM public."aiInsightsConsentEvent") = 1,
    'owner must see exactly their own consent event';
  ASSERT (public.set_ai_insights_consent(true, 1, 'bogus') ->> 'code') = 'invalid_source',
    'unknown source must be rejected';
  ASSERT (public.set_ai_insights_consent(true, 1000, 'first_use') ->> 'code') = 'invalid_version',
    'client must not pre-consent to a future terms version';
END $$;

-- 2. Facts table is closed to authenticated users.
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public."aiInsightSessionFact" LIMIT 1;
    ASSERT false, 'authenticated must not read aiInsightSessionFact';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- 3. Non-admin cannot call the admin RPC.
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_ai_insights_overview(current_date - 14, current_date);
    ASSERT false, 'non-admin must be rejected';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- 4. Feedback: own assistant message OK, someone else's message is invisible.
DO $$
BEGIN
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000055c1', 1,
          ARRAY['helpful_advice', 'too_long']) ->> 'ok')::boolean,
    'owner feedback must succeed';
  ASSERT (SELECT reasons = ARRAY['helpful_advice'] FROM public."aiMessageFeedback"),
    'reasons of the wrong polarity must be dropped';
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000055c2', -1, '{}')
          ->> 'code') = 'message_not_found',
    'feedback on another user''s message must be rejected';
END $$;

RESET ROLE;

-- Other users' consent through the RPC (C2..C4 grant, N declines).
DO $$
DECLARE
  v_id text;
BEGIN
  FOREACH v_id IN ARRAY ARRAY['c2', 'c3', 'c4', 'c5'] LOOP
    PERFORM set_config('request.jwt.claims',
      format('{"sub":"00000000-0000-4000-8000-0000000055%s","role":"authenticated"}', v_id), true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000055' || v_id, true);
    PERFORM public.set_ai_insights_consent(true, 1, 'first_use');
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000550e', true);
  PERFORM public.set_ai_insights_consent(false, 1, 'first_use');
END $$;

-- Facts (service path, as postgres), dated in the last closed week: C1..C4 + N first.
-- N declined, so the fact trigger silently drops N's row.
INSERT INTO public."aiInsightSessionFact"
  ("userId", "conversationId", "sessionType", "sessionDate", topics, "requestTypes", "classifierVersion")
SELECT u.id, ('00000000-0000-4000-8000-1000000055' || right(u.id::text, 2))::uuid, 'text',
       date_trunc('week', current_date)::date - 3, ARRAY['work_stress'], ARRAY['prioritize_workload'], 1
FROM auth.users u
WHERE u.id IN (
  '00000000-0000-4000-8000-0000000055c1', '00000000-0000-4000-8000-0000000055c2',
  '00000000-0000-4000-8000-0000000055c3', '00000000-0000-4000-8000-0000000055c4',
  '00000000-0000-4000-8000-00000000550e'
);

-- ---------------------------------------------------------------------------
-- 5. Admin: below k (4 consenting users, N excluded) → whole sample suppressed.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000055ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000055ad', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v jsonb := public.admin_ai_insights_overview(current_date - 14, current_date);
BEGIN
  ASSERT (v -> 'sample' ->> 'suppressed')::boolean, 'sample below k must be suppressed';
  ASSERT jsonb_array_length(v -> 'topics') = 0, 'no topics below k';
  ASSERT (v -> 'feedback' ->> 'suppressed')::boolean, 'feedback below k must be suppressed';
END $$;

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."aiInsightSessionFact"
          WHERE "userId" = '00000000-0000-4000-8000-00000000550e') = 0,
    'fact trigger must drop rows of users without consent';
END $$;

INSERT INTO public."aiInsightSessionFact"
  ("userId", "conversationId", "sessionType", "sessionDate", topics, "requestTypes", "classifierVersion")
VALUES ('00000000-0000-4000-8000-0000000055c5', '00000000-0000-4000-8000-1000000055c5', 'text',
        date_trunc('week', current_date)::date - 3, ARRAY['work_stress'], ARRAY['prioritize_workload'], 1);

SET LOCAL ROLE authenticated;

-- 6. Admin: 5 consenting users → visible, N excluded, no identifiers in the payload.
DO $$
DECLARE
  v jsonb := public.admin_ai_insights_overview(current_date - 14, current_date);
BEGIN
  ASSERT (v -> 'sample' ->> 'users')::int = 5, 'non-consenting user must be excluded';
  ASSERT (v -> 'sample' ->> 'sessions')::int = 5, 'sessions must count consenting users only';
  ASSERT (v -> 'topics' -> 0 ->> 'key') = 'work_stress', 'topic must be visible at k';
  ASSERT (v -> 'requestTypes' -> 0 ->> 'key') = 'prioritize_workload', 'request type must be visible at k';
  ASSERT v::text NOT LIKE '%00000000-0000-4000-8000-0000000055%', 'payload must not contain user ids';
  ASSERT v::text NOT LIKE '%00000000-0000-4000-8000-1000000055%', 'payload must not contain conversation ids';
  ASSERT (public.admin_ai_insights_overview(current_date, current_date - 1) ->> 'code') = 'invalid_period',
    'inverted period must be rejected';
  ASSERT (v -> 'sample' -> 'voiceSessions') = 'null'::jsonb, 'mode split below k must be hidden';
  ASSERT (public.admin_ai_insights_overview(current_date, current_date) -> 'period' ->> 'from') IS NULL,
    'today alone has no closed bucket';
  ASSERT public.admin_ai_insights_overview(current_date - 14, current_date) -> 'sample'
         = public.admin_ai_insights_overview(current_date - 14, current_date - 1) -> 'sample',
    'periods differing only by today must return identical numbers (anti-differencing)';
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 6b. Feedback counts only when given after consent (as postgres, explicit timestamps).
-- ---------------------------------------------------------------------------
SELECT set_config('app.ai_insights_consent_sync', 'true', true);
UPDATE public.profiles
SET "aiInsightsConsentUpdatedAt" = date_trunc('week', current_date) - interval '6 days'
WHERE email LIKE 'proof-ins-c%@unclouded.invalid';
SELECT set_config('app.ai_insights_consent_sync', 'false', true);

DELETE FROM public."aiMessageFeedback";
INSERT INTO public."aiMessageFeedback"
  ("userId", "messageId", "conversationId", "sessionType", rating, "createdAt")
SELECT u.id,
       ('00000000-0000-4000-8000-2000000055' || right(u.id::text, 2))::uuid,
       ('00000000-0000-4000-8000-1000000055' || right(u.id::text, 2))::uuid,
       'text', 1, date_trunc('week', current_date) - interval '3 days'
FROM auth.users u WHERE u.email LIKE 'proof-ins-c%@unclouded.invalid';

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (public.admin_ai_insights_overview(current_date - 14, current_date) -> 'feedback' ->> 'suppressed')::boolean = false,
    'feedback from 5 consenting raters must be visible';
END $$;
RESET ROLE;

-- C5 consented only after rating → its rating no longer counts → 4 raters → suppressed.
SELECT set_config('app.ai_insights_consent_sync', 'true', true);
UPDATE public.profiles
SET "aiInsightsConsentUpdatedAt" = date_trunc('week', current_date) - interval '1 day'
WHERE id = '00000000-0000-4000-8000-0000000055c5';
SELECT set_config('app.ai_insights_consent_sync', 'false', true);

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (public.admin_ai_insights_overview(current_date - 14, current_date) -> 'feedback' ->> 'suppressed')::boolean,
    'ratings given before consent must not count';
END $$;
RESET ROLE;

-- ---------------------------------------------------------------------------
-- 7. Revoke: C1 turns consent off → C1 facts deleted → sample drops below k again.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000055c1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000055c1', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (public.set_ai_insights_consent(false, 1, 'settings') ->> 'deletedFacts')::int = 1,
    'revoke must delete the user''s facts';
END $$;

RESET ROLE;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."aiInsightSessionFact"
          WHERE "userId" = '00000000-0000-4000-8000-0000000055c1') = 0,
    'no facts may remain after revoke';
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000055ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000055ad', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (public.admin_ai_insights_overview(current_date - 14, current_date) -> 'sample' ->> 'suppressed')::boolean,
    'after revoke the sample must fall below k';
END $$;

RESET ROLE;

-- 8. A user without a profile row gets profile_not_found and no audit event.
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-00000000550f', 'proof-ins-noprofile@unclouded.invalid');
DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000550f';
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000550f","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-00000000550f', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  ASSERT (public.set_ai_insights_consent(true, 1, 'first_use') ->> 'code') = 'profile_not_found',
    'missing profile must be reported';
  ASSERT (SELECT count(*) FROM public."aiInsightsConsentEvent") = 0,
    'no audit event without a profile';
END $$;
RESET ROLE;

SELECT 'ai insights proof: ALL PASS' AS result;

ROLLBACK;
