-- Proof for NCLDD-57 S6 (20261014150000_realtime_voice_feedback_session_type).
-- Run AFTER the migration, as postgres (SQL editor).
-- Self-contained: throwaway user inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'realtime voice feedback proof: ALL PASS'.

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000057f1', 'proof-rtfb-a@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-rtfb-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

-- One conversation + one assistant message per sessionType (as postgres).
INSERT INTO public."chatConversation" (id, "userId", title, "sessionType") VALUES
  ('00000000-0000-4000-8000-1000000057f1', '00000000-0000-4000-8000-0000000057f1', 'proof', 'text'),
  ('00000000-0000-4000-8000-1000000057f2', '00000000-0000-4000-8000-0000000057f1', 'proof', 'voice'),
  ('00000000-0000-4000-8000-1000000057f3', '00000000-0000-4000-8000-0000000057f1', 'proof', 'voice_conversation');

INSERT INTO public."chatMessage" (id, "userId", "conversationId", content, sender, "isFromUser") VALUES
  ('00000000-0000-4000-8000-2000000057f1', '00000000-0000-4000-8000-0000000057f1',
   '00000000-0000-4000-8000-1000000057f1', 'assistant reply', 'assistant', false),
  ('00000000-0000-4000-8000-2000000057f2', '00000000-0000-4000-8000-0000000057f1',
   '00000000-0000-4000-8000-1000000057f2', 'assistant reply', 'assistant', false),
  ('00000000-0000-4000-8000-2000000057f3', '00000000-0000-4000-8000-0000000057f1',
   '00000000-0000-4000-8000-1000000057f3', 'assistant reply', 'assistant', false);

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057f1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057f1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000057f1', 1, '{}') ->> 'ok')::boolean,
    'feedback on text message must succeed';
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000057f2', -1, '{}') ->> 'ok')::boolean,
    'feedback on voice message must succeed';
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000057f3', 1,
          ARRAY['felt_understood']) ->> 'ok')::boolean,
    'feedback on voice_conversation message must succeed';

  ASSERT (SELECT "sessionType" FROM public."aiMessageFeedback"
          WHERE "messageId" = '00000000-0000-4000-8000-2000000057f1') = 'text',
    'text conversation feedback must stay text';
  ASSERT (SELECT "sessionType" FROM public."aiMessageFeedback"
          WHERE "messageId" = '00000000-0000-4000-8000-2000000057f2') = 'voice',
    'voice conversation feedback must stay voice';
  ASSERT (SELECT "sessionType" FROM public."aiMessageFeedback"
          WHERE "messageId" = '00000000-0000-4000-8000-2000000057f3') = 'voice',
    'voice_conversation feedback must be stored as voice';

  -- Clearing still works for the new type.
  ASSERT (public.set_ai_message_feedback('00000000-0000-4000-8000-2000000057f3', 0, '{}') ->> 'ok')::boolean,
    'clearing voice_conversation feedback must succeed';
  ASSERT NOT EXISTS (SELECT 1 FROM public."aiMessageFeedback"
                     WHERE "messageId" = '00000000-0000-4000-8000-2000000057f3'),
    'cleared feedback row must be gone';
END $$;

RESET ROLE;

-- Grants unchanged by CREATE OR REPLACE.
DO $$
BEGIN
  ASSERT has_function_privilege('authenticated', 'public.set_ai_message_feedback(uuid, integer, text[])', 'EXECUTE'),
    'authenticated must keep EXECUTE';
  ASSERT NOT has_function_privilege('anon', 'public.set_ai_message_feedback(uuid, integer, text[])', 'EXECUTE'),
    'anon must not get EXECUTE';
END $$;

SELECT 'realtime voice feedback proof: ALL PASS' AS result;

ROLLBACK;
