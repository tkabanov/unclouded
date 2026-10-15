-- Auto-finalize abandoned AI sessions.
--
-- Text chats, voice messages and realtime conversations were finalized only when the user
-- pressed End, so most conversations stayed open forever: no session memory, no archive,
-- no insights, and AI Usage durations had no end point. The `auto-finalize-sessions` edge
-- function (cron every 15 min) finalizes conversations idle longer than a threshold with the
-- same `session_finalize` logic as the chat edge.
--
-- Schedule (UTC): auto-finalize-idle-sessions */15 * * * *

/**
 * Unfinalized conversations with at least one user message whose last activity
 * (latest message or conversation update) is older than `p_idle`. Crisis conversations
 * are skipped: chat never finalizes them either.
 */
CREATE OR REPLACE FUNCTION public.list_idle_unfinalized_conversations(
  p_idle INTERVAL DEFAULT interval '24 hours',
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  "conversationId" UUID,
  "userId" UUID,
  "sessionType" TEXT,
  "lastActivityAt" TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c."userId", c."sessionType", a."lastActivityAt"
  FROM public."chatConversation" c
  CROSS JOIN LATERAL (
    SELECT greatest(c."updatedAt", max(m."createdAt")) AS "lastActivityAt",
           bool_or(m."isFromUser") AS "hasUserMessage"
    FROM public."chatMessage" m
    WHERE m."conversationId" = c.id
  ) a
  WHERE c."finalizedAt" IS NULL
    AND coalesce(c."hadCrisisEscalation", false) = false
    AND a."hasUserMessage" IS TRUE
    AND a."lastActivityAt" < now() - p_idle
  ORDER BY a."lastActivityAt"
  LIMIT greatest(1, least(coalesce(p_limit, 10), 50));
$$;

REVOKE ALL ON FUNCTION public.list_idle_unfinalized_conversations(INTERVAL, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_idle_unfinalized_conversations(INTERVAL, INTEGER) TO service_role;

-- Auth is the service-role bearer added by invoke_scheduled_edge_function (no extra cron secret).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-finalize-idle-sessions') THEN
    PERFORM cron.schedule(
      'auto-finalize-idle-sessions',
      '*/15 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('auto-finalize-sessions'); $cron$
    );
  END IF;
END;
$$;
