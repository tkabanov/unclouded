-- NCLDD-57 realtime voice conversation. Additive only.
-- Schema for the Conversation mode on /coaching/voice (OpenAI Realtime over WebRTC):
--   * sessionType 'voice_conversation' for chatConversation / coachingSessionArchive;
--   * idempotent transcript writes (chatMessage."realtimeItemId");
--   * realtimeVoiceSession: one row per realtime call, written only by the realtime-voice edge function;
--   * aiUsageEvent: realtime session link, external event id (idempotency), audio token columns,
--     sources realtime_response / realtime_transcription;
--   * aiModelPricing: audio-token units + realtime / transcription prices;
--   * realtime_voice_sweep(): closes stale sessions without inventing $0 usage (pg_cron, every 5 min).
-- Admin read RPCs ship separately (NCLDD-57 S7). Design: docs/NCLDD-57-implementation-plan.md §4, §7.3.

-- ---------------------------------------------------------------------------
-- sessionType: add 'voice_conversation'
-- ---------------------------------------------------------------------------
-- aiInsightSessionFact / aiMessageFeedback are NOT widened: the server maps
-- voice_conversation -> 'voice' when writing there.
-- coachingSessionArchive's CHECK was declared inline, so drop it by lookup instead of by name.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS tbl, c.conname
    FROM pg_constraint c
    WHERE c.contype = 'c'
      AND c.conrelid IN ('public."chatConversation"'::regclass, 'public."coachingSessionArchive"'::regclass)
      AND pg_get_constraintdef(c.oid) LIKE '%"sessionType"%'
  LOOP
    RAISE NOTICE 'NCLDD-57: dropping % . %', r.tbl, r.conname;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public."chatConversation"
  ADD CONSTRAINT chat_conversation_session_type_check
  CHECK ("sessionType" IN ('text', 'voice', 'quick_checkin', 'voice_conversation'));

ALTER TABLE public."coachingSessionArchive"
  ADD CONSTRAINT "coachingSessionArchive_sessionType_check"
  CHECK ("sessionType" IN ('text', 'voice', 'quick_checkin', 'voice_conversation'));

-- ---------------------------------------------------------------------------
-- chatMessage: realtime item id (idempotent transcript upsert)
-- ---------------------------------------------------------------------------
-- A plain (non-partial) unique index: NULLs stay distinct, so existing rows are unaffected,
-- and PostgREST upsert (on_conflict=conversationId,realtimeItemId) can infer it — it cannot
-- infer a partial index.

ALTER TABLE public."chatMessage"
  ADD COLUMN IF NOT EXISTS "realtimeItemId" text NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "chatMessage_conversation_realtimeItem_key"
  ON public."chatMessage" ("conversationId", "realtimeItemId");

-- ---------------------------------------------------------------------------
-- realtimeVoiceSession
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."realtimeVoiceSession" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- SET NULL, not CASCADE: the user may delete the conversation (even mid-call); the call and its
  -- cost record must survive for budget checks and the admin per-session view.
  "conversationId" uuid NULL REFERENCES public."chatConversation"(id) ON DELETE SET NULL,
  -- OpenAI call id (last segment of the Location header, rtc_…); null until the call is created.
  "openaiCallId" text NULL,
  model text NOT NULL,
  voice text NOT NULL,
  "transcriptionModel" text NULL,
  status text NOT NULL DEFAULT 'connecting'
    CHECK (status IN ('connecting', 'active', 'ended', 'failed')),
  "endReason" text NULL CHECK (
    "endReason" IN (
      'user_ended', 'max_duration', 'idle_timeout', 'network_lost', 'connect_failed',
      'mic_lost', 'budget_reached', 'crisis', 'error', 'abandoned'
    )
  ),
  -- complete | partial | unknown per plan §7.3; never reported as $0 unless the call never connected.
  "usageStatus" text NOT NULL DEFAULT 'pending'
    CHECK ("usageStatus" IN ('pending', 'complete', 'partial', 'unknown')),
  "responsesSeen" integer NOT NULL DEFAULT 0 CHECK ("responsesSeen" >= 0),
  "responsesReported" integer NOT NULL DEFAULT 0 CHECK ("responsesReported" >= 0),
  "transcriptionsSeen" integer NOT NULL DEFAULT 0 CHECK ("transcriptionsSeen" >= 0),
  "transcriptionsReported" integer NOT NULL DEFAULT 0 CHECK ("transcriptionsReported" >= 0),
  "startedAt" timestamptz NOT NULL DEFAULT now(),
  "connectedAt" timestamptz NULL,
  "lastHeartbeatAt" timestamptz NULL,
  "endedAt" timestamptz NULL,
  -- startedAt + 60 min (OpenAI max session length).
  "expiresAt" timestamptz NOT NULL,
  -- connectedAt -> endedAt; 0 when the call never connected.
  "durationSeconds" numeric(10, 3) NULL CHECK ("durationSeconds" >= 0),
  "planTierAtStart" text NOT NULL DEFAULT 'free'
    CHECK ("planTierAtStart" IN ('free', 'pro', 'premium'))
);

CREATE INDEX IF NOT EXISTS "realtimeVoiceSession_user_startedAt_idx"
  ON public."realtimeVoiceSession" ("userId", "startedAt");
CREATE INDEX IF NOT EXISTS "realtimeVoiceSession_status_heartbeat_idx"
  ON public."realtimeVoiceSession" (status, "lastHeartbeatAt");
CREATE INDEX IF NOT EXISTS "realtimeVoiceSession_conversation_idx"
  ON public."realtimeVoiceSession" ("conversationId");

ALTER TABLE public."realtimeVoiceSession" ENABLE ROW LEVEL SECURITY;
-- Clients only read; every write goes through the realtime-voice edge function (service role).
REVOKE ALL ON public."realtimeVoiceSession" FROM anon, authenticated;
GRANT SELECT ON public."realtimeVoiceSession" TO authenticated;
GRANT ALL ON public."realtimeVoiceSession" TO service_role;

DROP POLICY IF EXISTS "Owner selects realtimeVoiceSession" ON public."realtimeVoiceSession";
CREATE POLICY "Owner selects realtimeVoiceSession" ON public."realtimeVoiceSession"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Admin reads realtimeVoiceSession" ON public."realtimeVoiceSession";
CREATE POLICY "Admin reads realtimeVoiceSession" ON public."realtimeVoiceSession"
  FOR SELECT TO authenticated USING (public.is_settings_admin());

COMMENT ON TABLE public."realtimeVoiceSession" IS
  'NCLDD-57: one row per OpenAI Realtime call. Written by the realtime-voice edge function only.';

-- ---------------------------------------------------------------------------
-- aiUsageEvent: realtime columns + sources
-- ---------------------------------------------------------------------------
-- inputTokens / cachedInputTokens / outputTokens keep meaning TEXT tokens for realtime rows;
-- audio tokens go to the new columns so both can be priced with their own units.

ALTER TABLE public."aiUsageEvent"
  ADD COLUMN IF NOT EXISTS "realtimeSessionId" uuid NULL
    REFERENCES public."realtimeVoiceSession"(id) ON DELETE SET NULL,
  -- response.id (resp_…) for realtime_response, item_id for realtime_transcription.
  ADD COLUMN IF NOT EXISTS "externalEventId" text NULL,
  ADD COLUMN IF NOT EXISTS "audioInputTokens" integer NOT NULL DEFAULT 0
    CHECK ("audioInputTokens" >= 0),
  ADD COLUMN IF NOT EXISTS "cachedAudioInputTokens" integer NOT NULL DEFAULT 0
    CHECK ("cachedAudioInputTokens" >= 0),
  ADD COLUMN IF NOT EXISTS "audioOutputTokens" integer NOT NULL DEFAULT 0
    CHECK ("audioOutputTokens" >= 0);

-- Idempotent usage reports. Non-partial on purpose (NULLs distinct; ON CONFLICT can infer it).
CREATE UNIQUE INDEX IF NOT EXISTS "aiUsageEvent_realtimeSession_externalEvent_key"
  ON public."aiUsageEvent" ("realtimeSessionId", "externalEventId");

ALTER TABLE public."aiUsageEvent" DROP CONSTRAINT IF EXISTS "aiUsageEvent_source_check";
ALTER TABLE public."aiUsageEvent" ADD CONSTRAINT "aiUsageEvent_source_check" CHECK (
  source IN (
    'chat_turn', 'title', 'session_close', 'session_close_ack', 'session_finalize',
    'memory_extract', 'arc_summary', 'stt', 'tts', 'standalone_insight',
    'journal_reflection', 'coaching_summary', 'trajectory_statement', 'path_closing',
    'kota_read', 'pup_pdf', 'prompt_test', 'insights_classify',
    'realtime_response', 'realtime_transcription'
  )
);

-- ---------------------------------------------------------------------------
-- aiModelPricing: audio-token units + realtime prices
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.contype = 'c'
      AND c.conrelid = 'public."aiModelPricing"'::regclass
      AND pg_get_constraintdef(c.oid) LIKE '%unit%token_in_1m%'
  LOOP
    RAISE NOTICE 'NCLDD-57: dropping public."aiModelPricing" . %', r.conname;
    EXECUTE format('ALTER TABLE public."aiModelPricing" DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public."aiModelPricing" ADD CONSTRAINT "aiModelPricing_unit_check" CHECK (
  unit IN (
    'token_in_1m', 'token_out_1m', 'token_cached_in_1m', 'audio_minute', 'tts_1m_chars',
    'audio_token_in_1m', 'audio_token_cached_in_1m', 'audio_token_out_1m'
  )
);

-- USD per 1M tokens from https://developers.openai.com/api/docs/pricing (checked 2026-10-14,
-- recorded in docs/NCLDD-57-realtime-limitations.md §2). token_* = text tokens.
-- gpt-4o-mini-transcribe audio_minute (0.003) is the pricing page's per-minute estimate; it is
-- only used when the API reports transcription usage as {type:"duration"}.
INSERT INTO public."aiModelPricing" (provider, model, unit, "usdPerUnit") VALUES
  ('openai', 'gpt-realtime-2.1', 'token_in_1m', 4.00),
  ('openai', 'gpt-realtime-2.1', 'token_cached_in_1m', 0.40),
  ('openai', 'gpt-realtime-2.1', 'token_out_1m', 24.00),
  ('openai', 'gpt-realtime-2.1', 'audio_token_in_1m', 32.00),
  ('openai', 'gpt-realtime-2.1', 'audio_token_cached_in_1m', 0.40),
  ('openai', 'gpt-realtime-2.1', 'audio_token_out_1m', 64.00),
  ('openai', 'gpt-realtime-2.1-mini', 'token_in_1m', 0.60),
  ('openai', 'gpt-realtime-2.1-mini', 'token_cached_in_1m', 0.06),
  ('openai', 'gpt-realtime-2.1-mini', 'token_out_1m', 2.40),
  ('openai', 'gpt-realtime-2.1-mini', 'audio_token_in_1m', 10.00),
  ('openai', 'gpt-realtime-2.1-mini', 'audio_token_cached_in_1m', 0.30),
  ('openai', 'gpt-realtime-2.1-mini', 'audio_token_out_1m', 20.00),
  ('openai', 'gpt-4o-mini-transcribe', 'audio_token_in_1m', 1.25),
  ('openai', 'gpt-4o-mini-transcribe', 'token_out_1m', 5.00),
  ('openai', 'gpt-4o-mini-transcribe', 'audio_minute', 0.003)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sweeper: close stale sessions
-- ---------------------------------------------------------------------------
-- Stale = still connecting/active and no heartbeat for 3 min (or never heartbeated and started
-- 3+ min ago), or 5+ min past expiresAt. These never sent `end`, so usage cannot be confirmed:
--   never connected            -> complete (nothing was billed; UI labels it "not connected")
--   connected, nothing reported -> unknown
--   connected, some reported    -> partial
-- Returns the number of sessions closed. Called by pg_cron and lazily by realtime-voice `start`.

CREATE OR REPLACE FUNCTION public.realtime_voice_sweep()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH stale AS (
    SELECT s.id,
           s."connectedAt",
           LEAST(COALESCE(s."lastHeartbeatAt", s."connectedAt", s."startedAt"), s."expiresAt") AS ended_at,
           (s."responsesReported" + s."transcriptionsReported") > 0 AS has_reports
    FROM public."realtimeVoiceSession" s
    WHERE s.status IN ('connecting', 'active')
      AND (
        COALESCE(s."lastHeartbeatAt", s."startedAt") < now() - interval '3 minutes'
        OR s."expiresAt" < now() - interval '5 minutes'
      )
    FOR UPDATE OF s SKIP LOCKED
  )
  UPDATE public."realtimeVoiceSession" t
  SET status = 'ended',
      "endReason" = 'abandoned',
      "endedAt" = stale.ended_at,
      "durationSeconds" = CASE
        WHEN stale."connectedAt" IS NULL THEN 0
        ELSE GREATEST(0, EXTRACT(EPOCH FROM (stale.ended_at - stale."connectedAt")))
      END,
      "usageStatus" = CASE
        WHEN stale."connectedAt" IS NULL THEN 'complete'
        WHEN stale.has_reports THEN 'partial'
        ELSE 'unknown'
      END
  FROM stale
  WHERE t.id = stale.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.realtime_voice_sweep() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.realtime_voice_sweep() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'realtime-voice-sweep';

    PERFORM cron.schedule(
      'realtime-voice-sweep',
      '*/5 * * * *',
      $cron$ SELECT public.realtime_voice_sweep(); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip realtime-voice-sweep schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule realtime-voice-sweep: %', SQLERRM;
END $$;
