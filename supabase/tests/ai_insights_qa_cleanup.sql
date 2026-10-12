-- Removes the NCLDD-55 QA seed (ai_insights_qa_seed.sql). Run as postgres:
-- npx supabase db query --linked -f supabase/tests/ai_insights_qa_cleanup.sql

BEGIN;

DELETE FROM public."chatConversation"
WHERE "userId" IN (SELECT id FROM auth.users WHERE email LIKE 'qa55-%@unclouded.invalid');

DELETE FROM public.profiles WHERE email LIKE 'qa55-%@unclouded.invalid';
DELETE FROM auth.users WHERE email LIKE 'qa55-%@unclouded.invalid';

SELECT json_build_object(
  'users', (SELECT count(*) FROM auth.users WHERE email LIKE 'qa55-%@unclouded.invalid'),
  'facts', (SELECT count(*) FROM public."aiInsightSessionFact"),
  'feedback', (SELECT count(*) FROM public."aiMessageFeedback")
) AS remaining;

COMMIT;
