-- AI Usage: session duration starts at the conversation's first AI call, not at its creation.
--
-- Voice messages resume the latest unfinished voice conversation (OVR-057), so a conversation
-- created days ago and opened again later (greeting = one AI call) counted the whole idle gap:
-- e.g. 7355 and 4183 minutes, average "AVG VOICE SESSION" ~1283 min on 2026-10-15.
-- Now: duration = coalesce(finalizedAt, last AI call) - first AI call in the period (>= 0).
-- Applies to avgDurationSeconds (text / voice) and byVoiceSurface.voice_messages.
-- Everything else is unchanged from 20261015094100.

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
        extract(epoch FROM (coalesce(cc."finalizedAt", max(e."createdAt")) - min(e."createdAt"))),
        0
      ) AS seconds
    FROM cur e
    JOIN public."chatConversation" cc ON cc.id = e."conversationId" AND cc."userId" = e."userId"
    WHERE e."conversationId" IS NOT NULL
    GROUP BY e."conversationId", cc."finalizedAt"
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
      extract(epoch FROM (coalesce(cc."finalizedAt", max(e."createdAt")) - min(e."createdAt"))),
      0
    ) AS seconds
    FROM cur e
    JOIN public."chatConversation" cc ON cc.id = e."conversationId" AND cc."userId" = e."userId"
    WHERE e."conversationId" IS NOT NULL AND cc."sessionType" = 'voice'
    GROUP BY e."conversationId", cc."finalizedAt"
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
