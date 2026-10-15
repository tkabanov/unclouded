-- Proof for AI Usage session duration: 20261015151739_ai_usage_duration_from_first_call and
-- 20261015170000_ai_usage_duration_capped_gaps (sum of gaps between AI calls, each <= 600 s).
-- Run AFTER the migration, as postgres (SQL editor).
-- Self-contained: throwaway users and rows dated 2026-01-06 (before any real ledger data), ends in
-- ROLLBACK. Every check is an ASSERT; success ends with 'ai usage duration proof: ALL PASS'.
--
-- Conversations of user A (all AI calls on 2026-01-06):
--   V1 voice, created 5 days earlier, never finalized: calls 10:00:00, 10:00:30      -> 30 s
--      (old formula: from creation -> ~5 days)
--   V2 voice, created 09:00, calls 09:01 and 09:03, finalized 09:05                -> 240 s
--   V3 voice, calls 06:00, 06:02 and 20:00 (second visit), never finalized         -> 120 + 600 = 720 s
--      (first-call formula: 14 h)
--   V4 voice, a single call 15:00 (resumed and left)                               -> 0 s
--   T1 text, created 3 days earlier, calls 12:00 and 12:02                         -> 120 s

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000d0aa1', 'proof-dur-a@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000d0aad', 'proof-dur-admin@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-dur-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000d0aad';

INSERT INTO public."chatConversation" (id, "userId", "sessionType", title, "createdAt", "finalizedAt") VALUES
  ('00000000-0000-4000-8000-0000000d0c01', '00000000-0000-4000-8000-0000000d0aa1', 'voice', 'V1', '2026-01-01 08:00+00', NULL),
  ('00000000-0000-4000-8000-0000000d0c02', '00000000-0000-4000-8000-0000000d0aa1', 'voice', 'V2', '2026-01-06 09:00+00', '2026-01-06 09:05+00'),
  ('00000000-0000-4000-8000-0000000d0c03', '00000000-0000-4000-8000-0000000d0aa1', 'text', 'T1', '2026-01-03 08:00+00', NULL),
  ('00000000-0000-4000-8000-0000000d0c04', '00000000-0000-4000-8000-0000000d0aa1', 'voice', 'V3', '2026-01-06 05:59+00', NULL),
  ('00000000-0000-4000-8000-0000000d0c05', '00000000-0000-4000-8000-0000000d0aa1', 'voice', 'V4', '2026-01-02 08:00+00', NULL);

INSERT INTO public."aiUsageEvent"
  ("userId", "conversationId", mode, source, model, "costUsd", "planTierAtEvent", "createdAt")
VALUES
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c01', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 10:00:00+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c01', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 10:00:30+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c02', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 09:01+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c02', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 09:03+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c03', 'text', 'chat_turn',
   'gpt-4o-mini', 0.01, 'free', '2026-01-06 12:00+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c03', 'text', 'chat_turn',
   'gpt-4o-mini', 0.01, 'free', '2026-01-06 12:02+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c04', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 06:00+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c04', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 06:02+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c04', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 20:00+00'),
  ('00000000-0000-4000-8000-0000000d0aa1', '00000000-0000-4000-8000-0000000d0c05', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.01, 'free', '2026-01-06 15:00+00');

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000d0aad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000d0aad', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  r jsonb;
BEGIN
  r := public.admin_ai_usage_overview('2026-01-06', '2026-01-06');
  ASSERT (r ->> 'ok')::boolean, 'overview ok';
  ASSERT (r -> 'avgDurationSeconds' ->> 'voice')::numeric = 247.5,
    'voice avg of 30 / 240 / 720 / 0 s: ' || (r -> 'avgDurationSeconds' ->> 'voice');
  ASSERT (r -> 'avgDurationSeconds' ->> 'text')::numeric = 120,
    'text duration between calls: ' || (r -> 'avgDurationSeconds' ->> 'text');
  ASSERT (r -> 'byVoiceSurface' -> 'voice_messages' ->> 'avgDurationSeconds')::numeric = 247.5,
    'voice messages avg of 30 / 240 / 720 / 0 s: ' || (r -> 'byVoiceSurface' -> 'voice_messages' ->> 'avgDurationSeconds');
  ASSERT (r -> 'kpis' ->> 'sessions')::int = 5, 'sessions unchanged';
END $$;

RESET ROLE;

SELECT 'ai usage duration proof: ALL PASS' AS result;

ROLLBACK;
