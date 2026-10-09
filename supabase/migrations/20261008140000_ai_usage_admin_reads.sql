-- NCLDD-52 slices 3-4: admin read RPCs for the AI Usage dashboard (Overview / Limits / Users / audit).
-- All functions are SECURITY DEFINER and guarded by is_settings_admin(). Additive only.

CREATE OR REPLACE FUNCTION public.ai_usage_display_name(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(btrim(coalesce(p."firstName", '') || ' ' || coalesce(p."lastName", '')), ''),
    p.email,
    p.id::text
  )
  FROM public.profiles p
  WHERE p.id = p_user;
$$;

REVOKE ALL ON FUNCTION public.ai_usage_display_name(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_display_name(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------

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
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- Limits tab
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_ai_plan_limits()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'limits', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'planTier', l."planTier",
          'mode', l.mode,
          'monthlyUsd', l."monthlyUsd",
          'updatedAt', l."updatedAt",
          'updatedByName',
            CASE WHEN l."updatedBy" IS NULL THEN NULL
                 ELSE public.ai_usage_display_name(l."updatedBy") END
        ) ORDER BY
          CASE l."planTier" WHEN 'free' THEN 0 WHEN 'pro' THEN 1 ELSE 2 END,
          l.mode
      ) FROM public."aiPlanLimit" l),
      '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Users tab
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_ai_usage_users(
  p_search text DEFAULT NULL,
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
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total integer;
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_tier IS NOT NULL AND p_tier NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_tier', 'error', 'Unknown plan.');
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('ok', 'exceeded') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status', 'error', 'Unknown status.');
  END IF;

  WITH base AS (
    SELECT
      p.id AS user_id,
      public.ai_usage_display_name(p.id) AS display_name,
      p.email,
      t.tier,
      coalesce(s.sessions, 0) AS sessions,
      coalesce(s.spend, 0) AS spend,
      public.ai_effective_limit(p.id, 'text', v_month) AS eff_text,
      public.ai_effective_limit(p.id, 'voice', v_month) AS eff_voice
    FROM public.profiles p
    CROSS JOIN LATERAL (SELECT public.ai_limit_tier(p.id) AS tier) t
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT e."conversationId")::int AS sessions, sum(e."costUsd") AS spend
      FROM public."aiUsageEvent" e
      WHERE e."userId" = p.id AND e."monthKey" = v_month
    ) s ON true
    WHERE (v_search IS NULL
        OR p.email ILIKE '%' || v_search || '%'
        OR coalesce(p."firstName", '') || ' ' || coalesce(p."lastName", '') ILIKE '%' || v_search || '%')
      AND (p_tier IS NULL OR t.tier = p_tier)
  ),
  filtered AS (
    SELECT * FROM base
    WHERE p_status IS NULL
      OR (p_status = 'exceeded'
          AND ((eff_text ->> 'exceeded')::boolean OR (eff_voice ->> 'exceeded')::boolean))
      OR (p_status = 'ok'
          AND NOT ((eff_text ->> 'exceeded')::boolean OR (eff_voice ->> 'exceeded')::boolean))
  ),
  page AS (
    SELECT * FROM filtered ORDER BY spend DESC, display_name LIMIT v_limit OFFSET v_offset
  )
  SELECT
    (SELECT count(*)::int FROM filtered),
    coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'userId', user_id,
          'displayName', display_name,
          'email', email,
          'tier', tier,
          'sessions', sessions,
          'spendUsd', spend,
          'text', eff_text,
          'voice', eff_voice
        ) ORDER BY spend DESC, display_name
      ) FROM page),
      '[]'::jsonb)
  INTO v_total, v_rows;

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'monthKey', v_month, 'rows', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ai_user_limit_detail(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'error', 'User not found.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'monthKey', v_month,
    'user', (
      SELECT jsonb_build_object(
        'userId', p.id,
        'displayName', public.ai_usage_display_name(p.id),
        'email', p.email,
        'tier', public.ai_limit_tier(p.id)
      ) FROM public.profiles p WHERE p.id = p_user
    ),
    'text', public.ai_effective_limit(p_user, 'text', v_month),
    'voice', public.ai_effective_limit(p_user, 'voice', v_month),
    'overrides', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object('mode', o.mode, 'kind', o.kind, 'monthlyUsd', o."monthlyUsd", 'updatedAt', o."updatedAt")
      ) FROM public."aiUserLimitOverride" o WHERE o."userId" = p_user),
      '[]'::jsonb),
    'restores', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'mode', r.mode,
          'spendBaselineUsd', r."spendBaselineUsd",
          'createdAt', r."createdAt",
          'createdByName', public.ai_usage_display_name(r."createdBy")
        ) ORDER BY r."createdAt" DESC
      ) FROM public."aiUserLimitRestore" r WHERE r."userId" = p_user AND r."monthKey" = v_month),
      '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_ai_limit_audit(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_user uuid DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'total', (
      SELECT count(*)::int FROM public."aiLimitAuditLog" a
      WHERE p_user IS NULL OR a."targetUserId" = p_user
    ),
    'rows', coalesce(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'createdAt', page."createdAt",
          'action', page.action,
          'actorUserId', page."actorUserId",
          'actorName',
            CASE WHEN page."actorUserId" IS NULL THEN NULL
                 ELSE public.ai_usage_display_name(page."actorUserId") END,
          'targetUserId', page."targetUserId",
          'targetName',
            CASE WHEN page."targetUserId" IS NULL THEN NULL
                 ELSE public.ai_usage_display_name(page."targetUserId") END,
          'planTier', page."planTier",
          'mode', page.mode,
          'oldValue', page."oldValue",
          'newValue', page."newValue"
        ) ORDER BY page."createdAt" DESC
      ) FROM (
        SELECT a.*
        FROM public."aiLimitAuditLog" a
        WHERE p_user IS NULL OR a."targetUserId" = p_user
        ORDER BY a."createdAt" DESC
        LIMIT v_limit OFFSET v_offset
      ) page),
      '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ai_usage_overview(date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_plan_limits() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_usage_users(text, text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_user_limit_detail(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ai_limit_audit(integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_overview(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_plan_limits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_usage_users(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_user_limit_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ai_limit_audit(integer, integer, uuid) TO authenticated;
