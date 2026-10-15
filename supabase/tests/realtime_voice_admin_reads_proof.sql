-- Proof for NCLDD-57 S7 (20261015130000_realtime_voice_admin_reads).
-- Run AFTER the migration, as postgres (SQL editor).
-- Self-contained: throwaway users and rows dated 2026-01-05 (before any real ledger data), ends in
-- ROLLBACK. Every check is an ASSERT; success ends with 'realtime voice admin reads proof: ALL PASS'.
--
-- User A sessions on 2026-01-05:
--   S1 connected, complete: response $0.50 + transcription $0.10
--   S2 connected, partial:  response $0.20
--   S3 connected, unknown:  no usage rows (must not be shown as a confirmed $0)
--   S4 never connected:     no usage, usageStatus complete, notConnected
-- Plus one Voice-messages TTS event ($0.05) and one text event ($1.00) for A.

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000575a1', 'proof-rtadm-a@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000575ad', 'proof-rtadm-admin@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-rtadm-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000575ad';

INSERT INTO public."chatConversation" (id, "userId", "sessionType", title, "createdAt") VALUES
  ('00000000-0000-4000-8000-0000000575c1', '00000000-0000-4000-8000-0000000575a1', 'voice_conversation', 'RT', '2026-01-05 10:00+00'),
  ('00000000-0000-4000-8000-0000000575c2', '00000000-0000-4000-8000-0000000575a1', 'voice', 'VM', '2026-01-05 09:00+00');

INSERT INTO public."realtimeVoiceSession"
  (id, "userId", "conversationId", model, voice, "transcriptionModel", status, "endReason", "usageStatus",
   "responsesSeen", "responsesReported", "transcriptionsSeen", "transcriptionsReported",
   "startedAt", "connectedAt", "endedAt", "expiresAt", "durationSeconds", "planTierAtStart")
VALUES
  ('00000000-0000-4000-8000-0000000575e1', '00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1',
   'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'ended', 'user_ended', 'complete', 1, 1, 1, 1,
   '2026-01-05 10:00+00', '2026-01-05 10:00:05+00', '2026-01-05 10:10:05+00', '2026-01-05 10:58+00', 600, 'free'),
  ('00000000-0000-4000-8000-0000000575e2', '00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1',
   'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'ended', 'network_lost', 'partial', 3, 1, 0, 0,
   '2026-01-05 11:00+00', '2026-01-05 11:00:05+00', '2026-01-05 11:05:05+00', '2026-01-05 11:58+00', 300, 'free'),
  ('00000000-0000-4000-8000-0000000575e3', '00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1',
   'gpt-realtime-2.1', 'cedar', 'gpt-4o-mini-transcribe', 'ended', 'abandoned', 'unknown', 2, 0, 1, 0,
   '2026-01-05 12:00+00', '2026-01-05 12:00:05+00', '2026-01-05 12:04:05+00', '2026-01-05 12:58+00', 240, 'pro'),
  ('00000000-0000-4000-8000-0000000575e4', '00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1',
   'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'failed', 'connect_failed', 'complete', 0, 0, 0, 0,
   '2026-01-05 13:00+00', NULL, '2026-01-05 13:00:10+00', '2026-01-05 13:58+00', 0, 'free');

INSERT INTO public."aiUsageEvent"
  ("userId", "conversationId", mode, source, model, "costUsd", "planTierAtEvent", "createdAt",
   "realtimeSessionId", "externalEventId", "inputTokens", "audioInputTokens", "audioOutputTokens")
VALUES
  ('00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1', 'voice', 'realtime_response',
   'gpt-realtime-2.1', 0.50, 'free', '2026-01-05 10:01+00', '00000000-0000-4000-8000-0000000575e1', 'resp_1', 100, 200, 300),
  ('00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1', 'voice', 'realtime_transcription',
   'gpt-4o-mini-transcribe', 0.10, 'free', '2026-01-05 10:01+00', '00000000-0000-4000-8000-0000000575e1', 'item_1', 0, 50, 0),
  ('00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1', 'voice', 'realtime_response',
   'gpt-realtime-2.1', 0.20, 'free', '2026-01-05 11:01+00', '00000000-0000-4000-8000-0000000575e2', 'resp_2', 10, 20, 30),
  ('00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c2', 'voice', 'tts',
   'gpt-4o-mini-tts', 0.05, 'free', '2026-01-05 09:01+00', NULL, NULL, 0, 0, 0),
  ('00000000-0000-4000-8000-0000000575a1', NULL, 'text', 'chat_turn',
   'gpt-4o-mini', 1.00, 'free', '2026-01-05 08:00+00', NULL, NULL, 0, 0, 0),
  -- Conversation-mode finalize via chat: no realtime session, but a voice_conversation conversation.
  ('00000000-0000-4000-8000-0000000575a1', '00000000-0000-4000-8000-0000000575c1', 'voice', 'session_finalize',
   'gpt-4o-mini', 0.02, 'free', '2026-01-05 10:11+00', NULL, NULL, 0, 0, 0);

-- ---------------------------------------------------------------------------
-- 1. Non-admin is refused (42501) by both RPCs.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000575a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000575a1', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05');
    ASSERT false, 'non-admin must not read realtime sessions';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.admin_ai_usage_overview('2026-01-05', '2026-01-05');
    ASSERT false, 'non-admin must not read the overview';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- 2. Admin reads.
-- ---------------------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000575ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000575ad', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  r jsonb;
  row1 jsonb;
  row3 jsonb;
  row4 jsonb;
  surface jsonb;
BEGIN
  r := public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05');
  ASSERT (r ->> 'ok')::boolean, 'admin read must succeed';
  ASSERT (r ->> 'total')::int = 4, 'four sessions on the day';
  ASSERT jsonb_array_length(r -> 'rows') = 4, 'four rows';
  ASSERT (r -> 'rows' -> 0 ->> 'id') = '00000000-0000-4000-8000-0000000575e4', 'newest first';

  SELECT x INTO row1 FROM jsonb_array_elements(r -> 'rows') x WHERE x ->> 'id' = '00000000-0000-4000-8000-0000000575e1';
  ASSERT (row1 ->> 'totalCostUsd')::numeric = 0.60, 'S1 total = ledger sum';
  ASSERT (row1 ->> 'responseCostUsd')::numeric = 0.50, 'S1 response cost';
  ASSERT (row1 ->> 'transcriptionCostUsd')::numeric = 0.10, 'S1 transcription cost';
  ASSERT (row1 ->> 'audioOutputTokens')::int = 300, 'S1 response audio tokens only';
  ASSERT (row1 ->> 'audioInputTokens')::int = 200, 'transcription audio not counted as response tokens';
  ASSERT (row1 ->> 'email') = 'proof-rtadm-a@unclouded.invalid', 'email like the Users panel';

  SELECT x INTO row3 FROM jsonb_array_elements(r -> 'rows') x WHERE x ->> 'id' = '00000000-0000-4000-8000-0000000575e3';
  ASSERT (row3 ->> 'usageStatus') = 'unknown' AND NOT (row3 ->> 'notConnected')::boolean,
    'unknown usage of a connected call is reported as unknown, not a confirmed $0';

  SELECT x INTO row4 FROM jsonb_array_elements(r -> 'rows') x WHERE x ->> 'id' = '00000000-0000-4000-8000-0000000575e4';
  ASSERT (row4 ->> 'notConnected')::boolean AND (row4 ->> 'totalCostUsd')::numeric = 0,
    'never-connected call: $0 with the not-connected flag';

  ASSERT (row3 -> 'totalCostUsd') = 'null'::jsonb, 'unknown usage returns a null total, not $0';

  -- Totals match the ledger.
  ASSERT (SELECT sum(coalesce((x ->> 'totalCostUsd')::numeric, 0)) FROM jsonb_array_elements(r -> 'rows') x) =
         (SELECT sum("costUsd") FROM public."aiUsageEvent"
          WHERE "realtimeSessionId"::text LIKE '00000000-0000-4000-8000-0000000575e%'),
    'row totals = aiUsageEvent sums';

  -- Filters and paging.
  ASSERT (public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05', NULL, 'partial') ->> 'total')::int = 1, 'status filter';
  ASSERT (public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05', 'pro') ->> 'total')::int = 1, 'plan filter';
  ASSERT jsonb_array_length(public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05', NULL, NULL, 2, 2) -> 'rows') = 2, 'paging';
  ASSERT (public.admin_ai_realtime_sessions('2026-01-05', '2026-01-05', NULL, 'bogus') ->> 'code') = 'invalid_status', 'bad status';
  ASSERT (public.admin_ai_realtime_sessions('2026-01-06', '2026-01-05') ->> 'code') = 'invalid_period', 'bad period';

  -- Overview: old keys unchanged, new split added.
  r := public.admin_ai_usage_overview('2026-01-05', '2026-01-05');
  ASSERT (r ->> 'ok')::boolean, 'overview ok';
  ASSERT r ? 'kpis' AND r ? 'daily' AND r ? 'byMode' AND r ? 'byPlan' AND r ? 'byModel'
     AND r ? 'topUsers' AND r ? 'avgDurationSeconds', 'existing keys kept';
  ASSERT (r -> 'kpis' ->> 'spendUsd')::numeric = 1.87, 'total spend unchanged by the split';
  surface := r -> 'byVoiceSurface';
  ASSERT (surface -> 'realtime_conversation' ->> 'spendUsd')::numeric = 0.82, 'realtime spend incl. its finalize';
  ASSERT (surface -> 'realtime_conversation' ->> 'events')::int = 4, 'realtime events incl. its finalize';
  ASSERT (surface -> 'realtime_conversation' ->> 'sessions')::int = 3, 'connected realtime sessions';
  ASSERT (surface -> 'realtime_conversation' ->> 'unconfirmedSessions')::int = 2, 'partial + unknown';
  ASSERT (surface -> 'realtime_conversation' ->> 'avgDurationSeconds')::numeric = 380, 'avg of 600/300/240';
  ASSERT (surface -> 'voice_messages' ->> 'spendUsd')::numeric = 0.05, 'voice messages spend (no Conversation finalize)';
  ASSERT (surface -> 'voice_messages' ->> 'sessions')::int = 1, 'voice messages sessions';
  ASSERT (surface -> 'voice_messages' ->> 'unconfirmedSessions')::int = 0, 'voice messages always confirmed';
END $$;

RESET ROLE;

-- 3. anon has no EXECUTE on either RPC.
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.admin_ai_realtime_sessions(date,date,text,text,integer,integer)', 'EXECUTE'),
    'anon must not execute admin_ai_realtime_sessions';
  ASSERT NOT has_function_privilege('anon', 'public.admin_ai_usage_overview(date,date,text)', 'EXECUTE'),
    'anon must not execute admin_ai_usage_overview';
END $$;

SELECT 'realtime voice admin reads proof: ALL PASS' AS result;

ROLLBACK;
