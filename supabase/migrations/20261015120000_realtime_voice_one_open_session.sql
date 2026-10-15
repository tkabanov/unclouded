-- NCLDD-57 S3 (T-027 security review): at most one open realtime session per user.
-- `realtime-voice` start checks for an open session before inserting; two concurrent starts could
-- both pass that check and open two paid OpenAI calls. This partial unique index makes the second
-- insert fail (23505), which the function answers with 409 realtime_session_active.
-- Additive only. PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.

CREATE UNIQUE INDEX IF NOT EXISTS "realtimeVoiceSession_one_open_per_user_key"
  ON public."realtimeVoiceSession" ("userId")
  WHERE status IN ('connecting', 'active');
