-- Proof for NCLDD-57 S1 (20261014130000_realtime_voice_conversation).
-- Run AFTER the migration, as postgres (SQL editor).
-- Self-contained: throwaway users inside the transaction, ends in ROLLBACK.
-- Every check is an ASSERT; success ends with 'realtime voice session proof: ALL PASS'.
--
-- Users: A (owner), B (other user), D (settings admin).
-- Sessions of A:
--   S1 active, fresh heartbeat                         -> untouched by the sweep
--   S2 active, stale heartbeat, 2 usage events reported -> ended/abandoned, partial
--   S3 active, stale heartbeat, nothing reported        -> ended/abandoned, unknown
--   S4 connecting, never connected, started 10 min ago  -> ended/abandoned, complete, duration 0
--   S5 active, fresh heartbeat but expired 6 min ago    -> ended/abandoned (expiry rule)
--   S6 already ended (user_ended, complete)             -> untouched

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('00000000-0000-4000-8000-0000000057a1', 'proof-rt-a@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000057b1', 'proof-rt-b@unclouded.invalid', now()),
  ('00000000-0000-4000-8000-0000000057ad', 'proof-rt-admin@unclouded.invalid', now());

INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u WHERE u.email LIKE 'proof-rt-%@unclouded.invalid'
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles SET "roleType" = 'admin' WHERE id = '00000000-0000-4000-8000-0000000057ad';

-- ---------------------------------------------------------------------------
-- sessionType CHECKs
-- ---------------------------------------------------------------------------

INSERT INTO public."chatConversation" (id, "userId", "sessionType", title) VALUES
  ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'voice_conversation', 'Proof RT A'),
  ('00000000-0000-4000-8000-0000000057c2', '00000000-0000-4000-8000-0000000057a1', 'voice', 'Proof RT A voice');

INSERT INTO public."coachingSessionArchive" ("userId", "conversationId", "sessionType") VALUES
  ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1', 'voice_conversation');

DO $$
BEGIN
  BEGIN
    INSERT INTO public."chatConversation" ("userId", "sessionType")
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'bogus');
    ASSERT false, 'chatConversation accepted sessionType bogus';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public."coachingSessionArchive" ("userId", "sessionType")
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'bogus');
    ASSERT false, 'coachingSessionArchive accepted sessionType bogus';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Not widened on purpose (server maps voice_conversation -> voice). Checked on the constraint
  -- itself: an insert would be silently dropped by the consent trigger before the CHECK runs.
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public."aiInsightSessionFact"'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%"sessionType"%'
  ), 'aiInsightSessionFact sessionType CHECK is missing';
  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid IN ('public."aiInsightSessionFact"'::regclass, 'public."aiMessageFeedback"'::regclass)
      AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%voice_conversation%'
  ), 'aiInsightSessionFact / aiMessageFeedback were widened with voice_conversation';
END $$;

-- ---------------------------------------------------------------------------
-- chatMessage.realtimeItemId idempotency
-- ---------------------------------------------------------------------------

INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId") VALUES
  ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'hi', true, 'user', 'item_001'),
  -- Same item id in another conversation is fine.
  ('00000000-0000-4000-8000-0000000057c2', '00000000-0000-4000-8000-0000000057a1', 'hi', true, 'user', 'item_001'),
  -- Rows without an item id never collide.
  ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'a', true, 'user', NULL),
  ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'b', true, 'user', NULL);

DO $$
BEGIN
  BEGIN
    INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
    VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'dup', true, 'user', 'item_001');
    ASSERT false, 'duplicate realtimeItemId accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- The upsert target the edge function uses is inferable.
  INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
  VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'hi again', true, 'user', 'item_001')
  ON CONFLICT ("conversationId", "realtimeItemId") DO UPDATE SET content = EXCLUDED.content;

  ASSERT (SELECT content FROM public."chatMessage"
          WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1' AND "realtimeItemId" = 'item_001') = 'hi again',
    'upsert on (conversationId, realtimeItemId) did not update';
END $$;

-- ---------------------------------------------------------------------------
-- Sessions (as postgres = service-role-like writer)
-- ---------------------------------------------------------------------------

INSERT INTO public."realtimeVoiceSession"
  (id, "userId", "conversationId", "openaiCallId", model, voice, "transcriptionModel", status, "endReason",
   "usageStatus", "responsesSeen", "responsesReported", "transcriptionsSeen", "transcriptionsReported",
   "startedAt", "connectedAt", "lastHeartbeatAt", "endedAt", "expiresAt", "durationSeconds")
VALUES
  ('00000000-0000-4000-8000-0000000057e1', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   'rtc_u2_s1', 'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'active', NULL, 'pending', 1, 1, 1, 1,
   now() - interval '5 minutes', now() - interval '5 minutes', now() - interval '30 seconds', NULL,
   now() + interval '55 minutes', NULL),
  ('00000000-0000-4000-8000-0000000057e2', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   'rtc_u2_s2', 'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'active', NULL, 'pending', 3, 1, 3, 1,
   now() - interval '20 minutes', now() - interval '19 minutes', now() - interval '10 minutes', NULL,
   now() + interval '40 minutes', NULL),
  ('00000000-0000-4000-8000-0000000057e3', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   'rtc_u2_s3', 'gpt-realtime-2.1', 'cedar', 'gpt-4o-mini-transcribe', 'active', NULL, 'pending', 2, 0, 2, 0,
   now() - interval '20 minutes', now() - interval '19 minutes', now() - interval '4 minutes', NULL,
   now() + interval '40 minutes', NULL),
  ('00000000-0000-4000-8000-0000000057e4', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   NULL, 'gpt-realtime-2.1', 'marin', NULL, 'connecting', NULL, 'pending', 0, 0, 0, 0,
   now() - interval '10 minutes', NULL, NULL, NULL,
   now() + interval '50 minutes', NULL),
  ('00000000-0000-4000-8000-0000000057e5', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   'rtc_u2_s5', 'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'active', NULL, 'pending', 4, 4, 4, 4,
   now() - interval '66 minutes', now() - interval '66 minutes', now() - interval '1 minute', NULL,
   now() - interval '6 minutes', NULL),
  ('00000000-0000-4000-8000-0000000057e6', '00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
   'rtc_u2_s6', 'gpt-realtime-2.1', 'marin', 'gpt-4o-mini-transcribe', 'ended', 'user_ended', 'complete', 1, 1, 1, 1,
   now() - interval '2 hours', now() - interval '2 hours', now() - interval '110 minutes', now() - interval '110 minutes',
   now() - interval '1 hour', 600);

DO $$
BEGIN
  BEGIN
    INSERT INTO public."realtimeVoiceSession" ("userId", "conversationId", model, voice, "expiresAt", status)
    VALUES ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
            'gpt-realtime-2.1', 'marin', now() + interval '1 hour', 'bogus');
    ASSERT false, 'realtimeVoiceSession accepted status bogus';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public."realtimeVoiceSession" ("userId", "conversationId", model, voice, "expiresAt", "usageStatus")
    VALUES ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
            'gpt-realtime-2.1', 'marin', now() + interval '1 hour', 'bogus');
    ASSERT false, 'realtimeVoiceSession accepted usageStatus bogus';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- aiUsageEvent: realtime sources, idempotency, pricing units
-- ---------------------------------------------------------------------------

INSERT INTO public."aiUsageEvent"
  ("userId", "conversationId", mode, source, model, "inputTokens", "cachedInputTokens", "outputTokens",
   "audioInputTokens", "cachedAudioInputTokens", "audioOutputTokens", "costUsd", "realtimeSessionId", "externalEventId")
VALUES
  ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1', 'voice', 'realtime_response',
   'gpt-realtime-2.1', 12000, 11000, 40, 300, 0, 600, 0.05, '00000000-0000-4000-8000-0000000057e2', 'resp_001'),
  ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1', 'voice', 'realtime_transcription',
   'gpt-4o-mini-transcribe', 0, 0, 20, 300, 0, 0, 0.0005, '00000000-0000-4000-8000-0000000057e2', 'item_001'),
  -- Same external id on another session is fine.
  ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1', 'voice', 'realtime_response',
   'gpt-realtime-2.1', 1, 0, 1, 0, 0, 0, 0, '00000000-0000-4000-8000-0000000057e1', 'resp_001'),
  -- Non-realtime rows (both NULL) never collide.
  ('00000000-0000-4000-8000-0000000057a1', NULL, 'text', 'chat_turn', 'gpt-4o-mini', 1, 0, 1, 0, 0, 0, 0, NULL, NULL),
  ('00000000-0000-4000-8000-0000000057a1', NULL, 'text', 'chat_turn', 'gpt-4o-mini', 1, 0, 1, 0, 0, 0, 0, NULL, NULL);

DO $$
BEGIN
  BEGIN
    INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "realtimeSessionId", "externalEventId")
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'voice', 'realtime_response', 'gpt-realtime-2.1',
            '00000000-0000-4000-8000-0000000057e2', 'resp_001');
    ASSERT false, 'duplicate (realtimeSessionId, externalEventId) accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Idempotent insert form the edge function can use.
  INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "realtimeSessionId", "externalEventId")
  VALUES ('00000000-0000-4000-8000-0000000057a1', 'voice', 'realtime_response', 'gpt-realtime-2.1',
          '00000000-0000-4000-8000-0000000057e2', 'resp_001')
  ON CONFLICT ("realtimeSessionId", "externalEventId") DO NOTHING;

  ASSERT (SELECT count(*) FROM public."aiUsageEvent"
          WHERE "realtimeSessionId" = '00000000-0000-4000-8000-0000000057e2') = 2,
    'ON CONFLICT DO NOTHING inserted a duplicate usage row';

  BEGIN
    INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "audioOutputTokens")
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'voice', 'realtime_response', 'gpt-realtime-2.1', -1);
    ASSERT false, 'negative audioOutputTokens accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public."aiUsageEvent" ("userId", mode, source, model)
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'voice', 'realtime_bogus', 'gpt-realtime-2.1');
    ASSERT false, 'unknown usage source accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  ASSERT (SELECT count(*) FROM public."aiModelPricing"
          WHERE model = 'gpt-realtime-2.1'
            AND unit IN ('token_in_1m', 'token_cached_in_1m', 'token_out_1m',
                         'audio_token_in_1m', 'audio_token_cached_in_1m', 'audio_token_out_1m')) = 6,
    'gpt-realtime-2.1 price rows missing';
  ASSERT (SELECT count(*) FROM public."aiModelPricing" WHERE model = 'gpt-realtime-2.1-mini') = 6,
    'gpt-realtime-2.1-mini price rows missing';
  ASSERT (SELECT count(*) FROM public."aiModelPricing" WHERE model = 'gpt-4o-mini-transcribe') = 3,
    'gpt-4o-mini-transcribe price rows missing';
  -- Existing models keep their prices.
  ASSERT (SELECT "usdPerUnit" FROM public."aiModelPricing"
          WHERE model = 'gpt-4o-mini' AND unit = 'token_in_1m' ORDER BY "effectiveFrom" DESC LIMIT 1) IS NOT NULL,
    'gpt-4o-mini price lost';

  BEGIN
    INSERT INTO public."aiModelPricing" (model, unit, "usdPerUnit") VALUES ('x', 'bogus_unit', 1);
    ASSERT false, 'unknown pricing unit accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- RLS / grants: user A sees own sessions only, cannot write
-- ---------------------------------------------------------------------------

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057a1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057a1', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."realtimeVoiceSession") = 6,
    'owner A should see own 6 sessions, sees ' || (SELECT count(*) FROM public."realtimeVoiceSession");

  BEGIN
    INSERT INTO public."realtimeVoiceSession" ("userId", "conversationId", model, voice, "expiresAt")
    VALUES ('00000000-0000-4000-8000-0000000057a1', '00000000-0000-4000-8000-0000000057c1',
            'gpt-realtime-2.1', 'marin', now() + interval '1 hour');
    ASSERT false, 'authenticated inserted realtimeVoiceSession';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public."realtimeVoiceSession" SET "usageStatus" = 'complete'
    WHERE id = '00000000-0000-4000-8000-0000000057e3';
    ASSERT false, 'authenticated updated realtimeVoiceSession';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e3';
    ASSERT false, 'authenticated deleted realtimeVoiceSession';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public."aiUsageEvent" ("userId", mode, source, model, "realtimeSessionId", "externalEventId")
    VALUES ('00000000-0000-4000-8000-0000000057a1', 'voice', 'realtime_response', 'gpt-realtime-2.1',
            '00000000-0000-4000-8000-0000000057e3', 'resp_forged');
    ASSERT false, 'authenticated inserted aiUsageEvent';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM count(*) FROM public."aiUsageEvent";
    ASSERT false, 'authenticated read aiUsageEvent';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.realtime_voice_sweep();
    ASSERT false, 'authenticated executed realtime_voice_sweep';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Transcript write path of realtime-voice `transcript` (user client, existing chatMessage RLS).
  INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
  VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'kota says', false, 'kota', 'item_002')
  ON CONFLICT ("conversationId", "realtimeItemId") DO UPDATE SET content = EXCLUDED.content;
  INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
  VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'kota said', false, 'kota', 'item_002')
  ON CONFLICT ("conversationId", "realtimeItemId") DO UPDATE SET content = EXCLUDED.content;
  ASSERT (SELECT content FROM public."chatMessage"
          WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1' AND "realtimeItemId" = 'item_002') = 'kota said',
    'owner upsert of own transcript item failed';
END $$;

RESET ROLE;

-- User B sees none of A's sessions and cannot touch A's transcript.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057b1","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057b1', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."realtimeVoiceSession") = 0,
    'user B sees A''s sessions: ' || (SELECT count(*) FROM public."realtimeVoiceSession");

  BEGIN
    INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
    VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057b1', 'forged', true, 'user', 'item_002')
    ON CONFLICT ("conversationId", "realtimeItemId") DO UPDATE SET content = EXCLUDED.content;
    ASSERT false, 'user B upserted into A''s conversation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public."chatMessage" ("conversationId", "userId", content, "isFromUser", sender, "realtimeItemId")
    VALUES ('00000000-0000-4000-8000-0000000057c1', '00000000-0000-4000-8000-0000000057a1', 'forged', true, 'user', 'item_002')
    ON CONFLICT ("conversationId", "realtimeItemId") DO NOTHING;
    ASSERT false, 'user B inserted into A''s conversation with A''s userId';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  ASSERT (SELECT count(*) FROM public."chatMessage"
          WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1') = 0,
    'user B can read A''s transcript';
END $$;

RESET ROLE;

-- A's transcript is intact after B's attempts.
DO $$
BEGIN
  ASSERT (SELECT content FROM public."chatMessage"
          WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1' AND "realtimeItemId" = 'item_002') = 'kota said'
     AND (SELECT "userId" FROM public."chatMessage"
          WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1' AND "realtimeItemId" = 'item_002')
         = '00000000-0000-4000-8000-0000000057a1',
    'A''s transcript item was changed by B';
END $$;

RESET ROLE;

-- Settings admin reads all sessions.
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000057ad","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000057ad', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public."realtimeVoiceSession"
          WHERE "userId" = '00000000-0000-4000-8000-0000000057a1') = 6,
    'admin cannot read A''s sessions';

  BEGIN
    UPDATE public."realtimeVoiceSession" SET "usageStatus" = 'complete'
    WHERE id = '00000000-0000-4000-8000-0000000057e3';
    ASSERT false, 'admin updated realtimeVoiceSession';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.realtime_voice_sweep();
    ASSERT false, 'admin executed realtime_voice_sweep';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;

-- anon sees nothing and cannot read the table at all.
SELECT set_config('request.jwt.claims', '', true);
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM count(*) FROM public."realtimeVoiceSession";
    ASSERT false, 'anon read realtimeVoiceSession';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.realtime_voice_sweep();
    ASSERT false, 'anon executed realtime_voice_sweep';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;

-- ---------------------------------------------------------------------------
-- Sweep (as postgres; pg_cron runs it the same way)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_closed integer;
  r record;
BEGIN
  -- Other stale rows may exist in a live DB; only assert on the proof's rows.
  v_closed := public.realtime_voice_sweep();
  ASSERT v_closed >= 4, 'sweep closed fewer than 4 sessions: ' || v_closed;

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e1';
  ASSERT r.status = 'active' AND r."usageStatus" = 'pending' AND r."endedAt" IS NULL,
    'S1 (fresh) was swept: ' || row_to_json(r)::text;

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e2';
  ASSERT r.status = 'ended' AND r."endReason" = 'abandoned' AND r."usageStatus" = 'partial',
    'S2 should be ended/abandoned/partial: ' || row_to_json(r)::text;
  ASSERT r."endedAt" = r."lastHeartbeatAt", 'S2 endedAt should be the last heartbeat';
  ASSERT r."durationSeconds" BETWEEN 539 AND 541, 'S2 duration should be ~540 s: ' || r."durationSeconds";

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e3';
  ASSERT r.status = 'ended' AND r."endReason" = 'abandoned' AND r."usageStatus" = 'unknown',
    'S3 should be ended/abandoned/unknown: ' || row_to_json(r)::text;

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e4';
  ASSERT r.status = 'ended' AND r."endReason" = 'abandoned' AND r."usageStatus" = 'complete'
         AND r."durationSeconds" = 0 AND r."connectedAt" IS NULL,
    'S4 (never connected) should be ended/complete/0 s: ' || row_to_json(r)::text;

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e5';
  ASSERT r.status = 'ended' AND r."endReason" = 'abandoned' AND r."usageStatus" = 'partial',
    'S5 (expired) should be ended/abandoned/partial: ' || row_to_json(r)::text;
  ASSERT r."endedAt" = r."expiresAt", 'S5 endedAt should be capped at expiresAt';

  SELECT * INTO r FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e6';
  ASSERT r."endReason" = 'user_ended' AND r."usageStatus" = 'complete' AND r."durationSeconds" = 600,
    'S6 (already ended) was changed: ' || row_to_json(r)::text;

  -- Idempotent: a second run touches none of the proof rows.
  PERFORM public.realtime_voice_sweep();
  ASSERT (SELECT status FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e1') = 'active',
    'second sweep closed the fresh session';
END $$;

-- ---------------------------------------------------------------------------
-- Cascades
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  DELETE FROM public."realtimeVoiceSession" WHERE id = '00000000-0000-4000-8000-0000000057e2';
  ASSERT (SELECT count(*) FROM public."aiUsageEvent" WHERE "externalEventId" = 'item_001'
            AND "userId" = '00000000-0000-4000-8000-0000000057a1' AND "realtimeSessionId" IS NULL) = 1,
    'deleting a session should keep its usage rows with realtimeSessionId = NULL';

  -- Deleting the conversation keeps the call records (cost audit), detached from it.
  DELETE FROM public."chatMessage" WHERE "conversationId" = '00000000-0000-4000-8000-0000000057c1';
  DELETE FROM public."chatConversation" WHERE id = '00000000-0000-4000-8000-0000000057c1';
  ASSERT (SELECT count(*) FROM public."realtimeVoiceSession"
          WHERE "userId" = '00000000-0000-4000-8000-0000000057a1' AND "conversationId" IS NULL) = 5,
    'deleting the conversation should keep its 5 remaining sessions with conversationId = NULL';
END $$;

SELECT 'realtime voice session proof: ALL PASS' AS result;

ROLLBACK;
