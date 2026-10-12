-- NCLDD-55 (OVR-073): admin AI Insights — aggregated, consent-filtered, k-anonymous.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL. Additive only.
--
-- Privacy contract of admin_ai_insights_overview():
--   * only users whose consent is currently granted for the current terms version are counted;
--     feedback counts only when given after that consent;
--   * the result never contains user ids, names, conversation ids, message text or links;
--   * every row / bucket / KPI needs >= 5 distinct users (k), otherwise it is dropped or marked
--     suppressed; if the whole sample is below k no session metrics are returned;
--   * anti-differencing: the requested period is widened/clipped to whole CLOSED weeks
--     (<= 92 days) or months, ending strictly before today (UTC), and every count is rounded to
--     the nearest multiple of 5 — so comparing adjacent requests can't isolate a day or a session.

CREATE OR REPLACE FUNCTION public.ai_insights_round_count(p_value bigint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT (round(coalesce(p_value, 0) / 5.0) * 5)::integer $$;

REVOKE ALL ON FUNCTION public.ai_insights_round_count(bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_ai_insights_overview(
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k constant integer := 5;
  v_version integer := public.ai_insights_consent_version();
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_bucket text;
  v_from date;
  v_to date;
  v_start timestamptz;
  v_end timestamptz;
  v_users integer;
  v_sessions integer;
  v_text integer;
  v_voice integer;
  v_text_users integer;
  v_voice_users integer;
  v_feedback jsonb;
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

  -- Normalize to whole, closed buckets that end before today.
  v_bucket := CASE WHEN (p_to - p_from) + 1 <= 92 THEN 'week' ELSE 'month' END;
  v_from := date_trunc(v_bucket, p_from::timestamp)::date;
  v_to := (date_trunc(v_bucket, (least(p_to, v_today - 1) + 1)::timestamp))::date - 1;

  IF v_to < v_from THEN
    RETURN jsonb_build_object(
      'ok', true,
      'period', jsonb_build_object(
        'from', NULL, 'to', NULL, 'bucket', v_bucket,
        'requestedFrom', p_from, 'requestedTo', p_to
      ),
      'kThreshold', k,
      'sample', jsonb_build_object('suppressed', true),
      'topics', '[]'::jsonb,
      'topicsSeries', '[]'::jsonb,
      'requestTypes', '[]'::jsonb,
      'concerns', '[]'::jsonb,
      'resources', '[]'::jsonb,
      'crisisLines', jsonb_build_object('suppressed', true),
      'feedback', jsonb_build_object('suppressed', true)
    );
  END IF;

  v_start := v_from::timestamp AT TIME ZONE 'UTC';
  v_end := (v_to + 1)::timestamp AT TIME ZONE 'UTC';

  -- Feedback is independent of finalized sessions, so it is evaluated first.
  WITH fb AS (
    SELECT f."userId", f.rating, f.reasons
    FROM public."aiMessageFeedback" f
    JOIN public.profiles p
      ON p.id = f."userId"
     AND p."aiInsightsConsent" IS TRUE
     AND p."aiInsightsConsentVersion" = v_version
     AND f."createdAt" >= p."aiInsightsConsentUpdatedAt"
    WHERE f."createdAt" >= v_start AND f."createdAt" < v_end
  ),
  fb_kpi AS (
    SELECT
      count(*) AS rated,
      count(DISTINCT "userId")::int AS raters,
      count(*) FILTER (WHERE rating = 1) AS up,
      count(*) FILTER (WHERE rating = -1) AS down
    FROM fb
  ),
  fb_reasons AS (
    SELECT r AS key, fb.rating, count(*) AS count, count(DISTINCT fb."userId")::int AS users
    FROM fb, unnest(fb.reasons) AS r
    GROUP BY r, fb.rating
  )
  SELECT CASE
    WHEN kpi.raters < k THEN jsonb_build_object('suppressed', true)
    ELSE jsonb_build_object(
      'suppressed', false,
      'ratedMessages', public.ai_insights_round_count(kpi.rated),
      'raters', public.ai_insights_round_count(kpi.raters),
      'up', public.ai_insights_round_count(kpi.up),
      'down', public.ai_insights_round_count(kpi.down),
      'upShare', round(kpi.up::numeric / nullif(kpi.rated, 0) * 20) / 20,
      'reasons', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object(
            'key', fr.key, 'rating', fr.rating, 'count', public.ai_insights_round_count(fr.count)
          )
          ORDER BY fr.count DESC, fr.key
        )
        FROM fb_reasons fr
        WHERE fr.users >= k
      ), '[]'::jsonb)
    )
  END
  INTO v_feedback
  FROM fb_kpi kpi;

  SELECT
    count(DISTINCT f."userId")::int,
    count(*)::int,
    count(*) FILTER (WHERE f."sessionType" = 'text')::int,
    count(*) FILTER (WHERE f."sessionType" = 'voice')::int,
    count(DISTINCT f."userId") FILTER (WHERE f."sessionType" = 'text')::int,
    count(DISTINCT f."userId") FILTER (WHERE f."sessionType" = 'voice')::int
  INTO v_users, v_sessions, v_text, v_voice, v_text_users, v_voice_users
  FROM public."aiInsightSessionFact" f
  JOIN public.profiles p
    ON p.id = f."userId"
   AND p."aiInsightsConsent" IS TRUE
   AND p."aiInsightsConsentVersion" = v_version
  WHERE f."sessionDate" BETWEEN v_from AND v_to;

  IF v_users < k THEN
    RETURN jsonb_build_object(
      'ok', true,
      'period', jsonb_build_object(
        'from', v_from, 'to', v_to, 'bucket', v_bucket,
        'requestedFrom', p_from, 'requestedTo', p_to
      ),
      'kThreshold', k,
      'sample', jsonb_build_object('suppressed', true),
      'topics', '[]'::jsonb,
      'topicsSeries', '[]'::jsonb,
      'requestTypes', '[]'::jsonb,
      'concerns', '[]'::jsonb,
      'resources', '[]'::jsonb,
      'crisisLines', jsonb_build_object('suppressed', true),
      'feedback', v_feedback
    );
  END IF;

  WITH facts AS (
    SELECT f.*
    FROM public."aiInsightSessionFact" f
    JOIN public.profiles p
      ON p.id = f."userId"
     AND p."aiInsightsConsent" IS TRUE
     AND p."aiInsightsConsentVersion" = v_version
    WHERE f."sessionDate" BETWEEN v_from AND v_to
  ),
  topic_rows AS (
    SELECT t AS key, f."userId", date_trunc(v_bucket, f."sessionDate"::timestamp)::date AS bucket
    FROM facts f, unnest(f.topics) AS t
  ),
  topics AS (
    SELECT key, count(*) AS sessions, count(DISTINCT "userId")::int AS users
    FROM topic_rows GROUP BY key
  ),
  topic_series AS (
    SELECT bucket, key, count(*) AS sessions, count(DISTINCT "userId")::int AS users
    FROM topic_rows GROUP BY bucket, key
  ),
  requests AS (
    SELECT r AS key, count(*) AS sessions, count(DISTINCT f."userId")::int AS users
    FROM facts f, unnest(f."requestTypes") AS r
    GROUP BY r
  ),
  concerns AS (
    SELECT c AS key, count(*) AS sessions, count(DISTINCT f."userId")::int AS users
    FROM facts f, unnest(f."concernThemes") AS c
    GROUP BY c
  ),
  resources AS (
    SELECT rid, count(*) AS sessions, count(DISTINCT f."userId")::int AS users
    FROM facts f, unnest(f."resourceIds") AS rid
    GROUP BY rid
  ),
  crisis AS (
    SELECT count(*) AS sessions, count(DISTINCT "userId")::int AS users
    FROM facts WHERE "crisisLineMentioned"
  )
  SELECT jsonb_build_object(
    'ok', true,
    'period', jsonb_build_object(
      'from', v_from, 'to', v_to, 'bucket', v_bucket,
      'requestedFrom', p_from, 'requestedTo', p_to
    ),
    'kThreshold', k,
    'sample', jsonb_build_object(
      'suppressed', false,
      'users', public.ai_insights_round_count(v_users),
      'sessions', public.ai_insights_round_count(v_sessions),
      'textSessions', CASE WHEN v_text_users >= k THEN public.ai_insights_round_count(v_text) END,
      'voiceSessions', CASE WHEN v_voice_users >= k THEN public.ai_insights_round_count(v_voice) END
    ),
    'topics', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'key', key,
               'sessions', public.ai_insights_round_count(sessions),
               'users', public.ai_insights_round_count(users))
             ORDER BY sessions DESC, key)
      FROM topics WHERE users >= k
    ), '[]'::jsonb),
    'topicsSeries', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'bucket', bucket, 'key', key, 'sessions', public.ai_insights_round_count(sessions))
             ORDER BY bucket, key)
      FROM topic_series WHERE users >= k
    ), '[]'::jsonb),
    'requestTypes', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'key', key,
               'sessions', public.ai_insights_round_count(sessions),
               'users', public.ai_insights_round_count(users))
             ORDER BY sessions DESC, key)
      FROM (SELECT * FROM requests WHERE users >= k ORDER BY sessions DESC, key LIMIT 20) top
    ), '[]'::jsonb),
    'concerns', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'key', key,
               'sessions', public.ai_insights_round_count(sessions),
               'users', public.ai_insights_round_count(users))
             ORDER BY sessions DESC, key)
      FROM concerns WHERE users >= k
    ), '[]'::jsonb),
    'resources', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'resourceId', rs.rid,
               'title', res.title,
               'sessions', public.ai_insights_round_count(rs.sessions),
               'users', public.ai_insights_round_count(rs.users))
             ORDER BY rs.sessions DESC, res.title)
      FROM (SELECT * FROM resources WHERE users >= k ORDER BY sessions DESC LIMIT 20) rs
      JOIN public.resource res ON res.id = rs.rid
    ), '[]'::jsonb),
    'crisisLines', (
      SELECT CASE WHEN users < k THEN jsonb_build_object('suppressed', true)
                  ELSE jsonb_build_object(
                    'suppressed', false,
                    'sessions', public.ai_insights_round_count(sessions),
                    'users', public.ai_insights_round_count(users))
             END
      FROM crisis
    ),
    'feedback', v_feedback
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_insights_overview(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_insights_overview(date, date) TO authenticated;
