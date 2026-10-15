-- NCLDD-57 S7 (T-032): AI Usage — realtime Conversation split and per-session reads.
--   * admin_ai_usage_overview: same signature and keys + `byVoiceSurface`
--     { voice_messages, realtime_conversation }: spend, events, sessions, avg cost/session,
--     avg duration, unconfirmed sessions (realtime usageStatus partial/unknown).
--   * admin_ai_realtime_sessions(...): one row per realtime call (plan §4.7).
-- Both SECURITY DEFINER, is_settings_admin() guard (42501). Additive only.
-- Applied 2026-10-15 after user go; proof: supabase/tests/realtime_voice_admin_reads_proof.sql (ALL PASS).

CREATE OR REPLACE FUNCTION public.admin_ai_usage_overview(
  p_from date,
  p_to date,
  p_tier text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_prev_start timestamptz;
  v_days integer;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_period', 'error', 'Invalid period.');
  END IF;
  IF p_to - p_from > 366 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'period_too_long', 'error', 'Period is too long.');
  END IF;
  IF p_tier IS NOT NULL AND p_tier NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_tier', 'error', 'Unknown plan.');
  END IF;

  v_days := (p_to - p_from) + 1;
  v_start := p_from::timestamp AT TIME ZONE 'UTC';
  v_end := (p_to + 1)::timestamp AT TIME ZONE 'UTC';
  v_prev_start := v_start - make_interval(days => v_days);

  WITH ev AS (
    SELECT e.*
    FROM public."aiUsageEvent" e
    WHERE e."createdAt" >= v_prev_start
      AND e."createdAt" < v_end
      AND (p_tier IS NULL OR e."planTierAtEvent" = p_tier)
  ),
  cur AS (SELECT * FROM ev WHERE "createdAt" >= v_start),
  prev AS (SELECT * FROM ev WHERE "createdAt" < v_start),
  kpi_cur AS (
    SELECT
      count(DISTINCT "conversationId")::int AS sessions,
      count(DISTINCT "userId")::int AS active_users,
      coalesce(sum("costUsd"), 0) AS spend,
      coalesce(sum("costUsd") FILTER (WHERE "conversationId" IS NOT NULL), 0) AS session_spend
    FROM cur
  ),
  kpi_prev AS (
    SELECT
      count(DISTINCT "conversationId")::int AS sessions,
      count(DISTINCT "userId")::int AS active_users,
      coalesce(sum("costUsd"), 0) AS spend,
      coalesce(sum("costUsd") FILTER (WHERE "conversationId" IS NOT NULL), 0) AS session_spend
    FROM prev
  ),
  days AS (
    SELECT d::date AS day FROM generate_series(p_from, p_to, interval '1 day') AS d
  ),
  daily AS (
    SELECT
      days.day,
      count(DISTINCT c."conversationId")::int AS sessions,
      coalesce(sum(c."costUsd"), 0) AS spend
    FROM days
    LEFT JOIN cur c ON (c."createdAt" AT TIME ZONE 'UTC')::date = days.day
    GROUP BY days.day
    ORDER BY days.day
  ),
  modes AS (SELECT unnest(ARRAY['text', 'voice', 'other']) AS mode),
  by_mode AS (
    SELECT m.mode,
      count(DISTINCT c."conversationId")::int AS sessions,
      coalesce(sum(c."costUsd"), 0) AS spend
    FROM modes m LEFT JOIN cur c ON c.mode = m.mode
    GROUP BY m.mode
  ),
  tiers AS (SELECT unnest(ARRAY['free', 'pro', 'premium']) AS tier),
  by_plan AS (
    SELECT t.tier,
      count(DISTINCT c."conversationId")::int AS sessions,
      coalesce(sum(c."costUsd"), 0) AS spend
    FROM tiers t LEFT JOIN cur c ON c."planTierAtEvent" = t.tier
    GROUP BY t.tier
  ),
  by_model AS (
    SELECT provider, model,
      count(DISTINCT "conversationId")::int AS sessions,
      coalesce(sum("costUsd"), 0) AS spend,
      bool_or("pricingMissing") AS pricing_missing
    FROM cur
    GROUP BY provider, model
  ),
  top_users AS (
    SELECT c."userId",
      count(DISTINCT c."conversationId")::int AS sessions,
      sum(c."costUsd") AS spend
    FROM cur c
    GROUP BY c."userId"
    ORDER BY sum(c."costUsd") DESC, c."userId"
    LIMIT 10
  ),
  durations AS (
    SELECT
      CASE WHEN bool_or(e.mode = 'voice') THEN 'voice' ELSE 'text' END AS mode,
      greatest(
        extract(epoch FROM (coalesce(cc."finalizedAt", max(e."createdAt")) - cc."createdAt")),
        0
      ) AS seconds
    FROM cur e
    JOIN public."chatConversation" cc ON cc.id = e."conversationId" AND cc."userId" = e."userId"
    WHERE e."conversationId" IS NOT NULL
    GROUP BY e."conversationId", cc."createdAt", cc."finalizedAt"
  ),
  -- NCLDD-57: voice split.
  --   Voice messages = voice events of 'voice' conversations (or with no conversation).
  --   Conversation  = events of the realtime sessions started in the period (selected like the
  --     sessions, so cost / session stays consistent) + that mode's finalize/summary/memory calls
  --     (voice events of 'voice_conversation' conversations without a realtime session, by date).
  --   Unconfirmed = sessions with usageStatus partial/unknown: their spend is a lower bound.
  voice_events AS (
    SELECT c.*, cc."sessionType" AS conversation_type
    FROM cur c
    LEFT JOIN public."chatConversation" cc ON cc.id = c."conversationId"
    WHERE c.mode = 'voice' AND c."realtimeSessionId" IS NULL
  ),
  voice_messages AS (
    SELECT
      count(*)::int AS events,
      count(DISTINCT v."conversationId")::int AS sessions,
      coalesce(sum(v."costUsd"), 0) AS spend
    FROM voice_events v
    WHERE v.conversation_type IS DISTINCT FROM 'voice_conversation'
  ),
  rt_overhead AS (
    SELECT count(*)::int AS events, coalesce(sum(v."costUsd"), 0) AS spend
    FROM voice_events v
    WHERE v.conversation_type = 'voice_conversation'
  ),
  voice_message_durations AS (
    SELECT greatest(
      extract(epoch FROM (coalesce(cc."finalizedAt", max(e."createdAt")) - cc."createdAt")),
      0
    ) AS seconds
    FROM cur e
    JOIN public."chatConversation" cc ON cc.id = e."conversationId" AND cc."userId" = e."userId"
    WHERE e."conversationId" IS NOT NULL AND cc."sessionType" = 'voice'
    GROUP BY e."conversationId", cc."createdAt", cc."finalizedAt"
  ),
  rt_selected AS (
    SELECT s.id
    FROM public."realtimeVoiceSession" s
    WHERE s."startedAt" >= v_start
      AND s."startedAt" < v_end
      AND (p_tier IS NULL OR s."planTierAtStart" = p_tier)
  ),
  rt_events AS (
    SELECT
      count(*)::int + (SELECT events FROM rt_overhead) AS events,
      coalesce(sum(e."costUsd"), 0) + (SELECT spend FROM rt_overhead) AS spend
    FROM public."aiUsageEvent" e
    WHERE e."realtimeSessionId" IN (SELECT id FROM rt_selected)
  ),
  rt_sessions AS (
    SELECT
      count(*) FILTER (WHERE s."connectedAt" IS NOT NULL)::int AS sessions,
      avg(s."durationSeconds") FILTER (WHERE s."connectedAt" IS NOT NULL AND s."durationSeconds" IS NOT NULL)
        AS avg_duration,
      count(*) FILTER (WHERE s."usageStatus" IN ('partial', 'unknown'))::int AS unconfirmed
    FROM public."realtimeVoiceSession" s
    WHERE s."startedAt" >= v_start
      AND s."startedAt" < v_end
      AND (p_tier IS NULL OR s."planTierAtStart" = p_tier)
  )
  SELECT jsonb_build_object(
    'ok', true,
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'days', v_days),
    'dataSince', (SELECT min("createdAt") FROM public."aiUsageEvent"),
    'kpis', jsonb_build_object(
      'sessions', (SELECT sessions FROM kpi_cur),
      'activeUsers', (SELECT active_users FROM kpi_cur),
      'spendUsd', (SELECT spend FROM kpi_cur),
      'avgCostPerSessionUsd',
        (SELECT CASE WHEN sessions > 0 THEN session_spend / sessions ELSE 0 END FROM kpi_cur),
      'prior', jsonb_build_object(
        'sessions', (SELECT sessions FROM kpi_prev),
        'activeUsers', (SELECT active_users FROM kpi_prev),
        'spendUsd', (SELECT spend FROM kpi_prev),
        'avgCostPerSessionUsd',
          (SELECT CASE WHEN sessions > 0 THEN session_spend / sessions ELSE 0 END FROM kpi_prev)
      )
    ),
    'daily', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object('date', day, 'sessions', sessions, 'spendUsd', spend) ORDER BY day
      ) FROM daily), '[]'::jsonb),
    'byMode', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object('mode', mode, 'sessions', sessions, 'spendUsd', spend) ORDER BY mode
      ) FROM by_mode), '[]'::jsonb),
    'byPlan', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object('tier', tier, 'sessions', sessions, 'spendUsd', spend) ORDER BY tier
      ) FROM by_plan), '[]'::jsonb),
    'byModel', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'provider', provider,
          'model', model,
          'sessions', sessions,
          'spendUsd', spend,
          'costPerSessionUsd', CASE WHEN sessions > 0 THEN spend / sessions ELSE 0 END,
          'pricingMissing', pricing_missing
        ) ORDER BY spend DESC
      ) FROM by_model), '[]'::jsonb),
    'topUsers', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'userId', t."userId",
          'displayName', public.ai_usage_display_name(t."userId"),
          'sessions', t.sessions,
          'spendUsd', t.spend,
          'currentTier', public.ai_limit_tier(t."userId")
        ) ORDER BY t.spend DESC
      ) FROM top_users t), '[]'::jsonb),
    'avgDurationSeconds', jsonb_build_object(
      'text', (SELECT avg(seconds) FROM durations WHERE mode = 'text'),
      'voice', (SELECT avg(seconds) FROM durations WHERE mode = 'voice')
    ),
    'byVoiceSurface', jsonb_build_object(
      'voice_messages', jsonb_build_object(
        'spendUsd', (SELECT spend FROM voice_messages),
        'events', (SELECT events FROM voice_messages),
        'sessions', (SELECT sessions FROM voice_messages),
        'avgCostPerSessionUsd',
          (SELECT CASE WHEN sessions > 0 THEN spend / sessions ELSE 0 END FROM voice_messages),
        'avgDurationSeconds', (SELECT avg(seconds) FROM voice_message_durations),
        'unconfirmedSessions', 0
      ),
      'realtime_conversation', jsonb_build_object(
        'spendUsd', (SELECT spend FROM rt_events),
        'events', (SELECT events FROM rt_events),
        'sessions', (SELECT sessions FROM rt_sessions),
        'avgCostPerSessionUsd',
          (SELECT CASE WHEN s.sessions > 0 THEN e.spend / s.sessions ELSE 0 END FROM rt_events e, rt_sessions s),
        'avgDurationSeconds', (SELECT avg_duration FROM rt_sessions),
        'unconfirmedSessions', (SELECT unconfirmed FROM rt_sessions)
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_overview(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_overview(date, date, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Realtime sessions tab
-- ---------------------------------------------------------------------------

/**
 * One row per realtime call started in the period. Costs come from the ledger rows of the
 * session (`aiUsageEvent."realtimeSessionId"`); `usageStatus` partial/unknown means the client's
 * reports are incomplete, so the cost is a lower bound (partial) or not known (unknown).
 */
CREATE OR REPLACE FUNCTION public.admin_ai_realtime_sessions(
  p_from date,
  p_to date,
  p_tier text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_start timestamptz;
  v_end timestamptz;
  v_total integer;
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_period', 'error', 'Invalid period.');
  END IF;
  IF p_to - p_from > 366 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'period_too_long', 'error', 'Period is too long.');
  END IF;
  IF p_tier IS NOT NULL AND p_tier NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_tier', 'error', 'Unknown plan.');
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'complete', 'partial', 'unknown') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status', 'error', 'Unknown status.');
  END IF;

  v_start := p_from::timestamp AT TIME ZONE 'UTC';
  v_end := (p_to + 1)::timestamp AT TIME ZONE 'UTC';

  SELECT count(*)::int INTO v_total
  FROM public."realtimeVoiceSession" s
  WHERE s."startedAt" >= v_start
    AND s."startedAt" < v_end
    AND (p_tier IS NULL OR s."planTierAtStart" = p_tier)
    AND (p_status IS NULL OR s."usageStatus" = p_status);

  WITH page AS (
    SELECT s.*
    FROM public."realtimeVoiceSession" s
    WHERE s."startedAt" >= v_start
      AND s."startedAt" < v_end
      AND (p_tier IS NULL OR s."planTierAtStart" = p_tier)
      AND (p_status IS NULL OR s."usageStatus" = p_status)
    ORDER BY s."startedAt" DESC, s.id
    LIMIT v_limit OFFSET v_offset
  ),
  usage AS (
    SELECT
      e."realtimeSessionId" AS session_id,
      coalesce(sum(e."inputTokens") FILTER (WHERE e.source = 'realtime_response'), 0) AS input_tokens,
      coalesce(sum(e."cachedInputTokens") FILTER (WHERE e.source = 'realtime_response'), 0) AS cached_input_tokens,
      coalesce(sum(e."outputTokens") FILTER (WHERE e.source = 'realtime_response'), 0) AS output_tokens,
      coalesce(sum(e."audioInputTokens") FILTER (WHERE e.source = 'realtime_response'), 0) AS audio_input_tokens,
      coalesce(sum(e."cachedAudioInputTokens") FILTER (WHERE e.source = 'realtime_response'), 0)
        AS cached_audio_input_tokens,
      coalesce(sum(e."audioOutputTokens") FILTER (WHERE e.source = 'realtime_response'), 0) AS audio_output_tokens,
      coalesce(sum(e."costUsd") FILTER (WHERE e.source = 'realtime_response'), 0) AS response_cost,
      coalesce(sum(e."costUsd") FILTER (WHERE e.source = 'realtime_transcription'), 0) AS transcription_cost,
      coalesce(sum(e."costUsd"), 0) AS total_cost,
      bool_or(e."pricingMissing") AS pricing_missing
    FROM public."aiUsageEvent" e
    WHERE e."realtimeSessionId" IN (SELECT id FROM page)
    GROUP BY e."realtimeSessionId"
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'userId', p."userId",
      'displayName', public.ai_usage_display_name(p."userId"),
      'email', (SELECT pr.email FROM public.profiles pr WHERE pr.id = p."userId"),
      'planTier', p."planTierAtStart",
      'startedAt', p."startedAt",
      'connectedAt', p."connectedAt",
      'endedAt', p."endedAt",
      'durationSeconds', p."durationSeconds",
      'model', p.model,
      'voice', p.voice,
      'transcriptionModel', p."transcriptionModel",
      'status', p.status,
      'endReason', p."endReason",
      'usageStatus', p."usageStatus",
      'notConnected', p."connectedAt" IS NULL,
      'responsesSeen', p."responsesSeen",
      'responsesReported', p."responsesReported",
      'transcriptionsSeen', p."transcriptionsSeen",
      'transcriptionsReported', p."transcriptionsReported",
      'inputTokens', coalesce(u.input_tokens, 0),
      'cachedInputTokens', coalesce(u.cached_input_tokens, 0),
      'outputTokens', coalesce(u.output_tokens, 0),
      'audioInputTokens', coalesce(u.audio_input_tokens, 0),
      'cachedAudioInputTokens', coalesce(u.cached_audio_input_tokens, 0),
      'audioOutputTokens', coalesce(u.audio_output_tokens, 0),
      'responseCostUsd', coalesce(u.response_cost, 0),
      'transcriptionCostUsd', coalesce(u.transcription_cost, 0),
      -- Connected call with no confirmed usage: the cost is not known, never a confirmed $0.
      'totalCostUsd', CASE WHEN p."usageStatus" = 'unknown' AND p."connectedAt" IS NOT NULL AND u.session_id IS NULL
                           THEN NULL ELSE coalesce(u.total_cost, 0) END,
      'pricingMissing', coalesce(u.pricing_missing, false)
    ) ORDER BY p."startedAt" DESC, p.id
  ), '[]'::jsonb)
  INTO v_rows
  FROM page p
  LEFT JOIN usage u ON u.session_id = p.id;

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_realtime_sessions(date, date, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_realtime_sessions(date, date, text, text, integer, integer) TO authenticated;
