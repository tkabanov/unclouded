-- Fix get_my_daily_insight_feed: RETURNS TABLE output names shadowed SQL "id" references.

CREATE OR REPLACE FUNCTION public.get_my_daily_insight_feed()
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  body TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
VOLATILE
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID := auth.uid();
  v_feed_date DATE;
  v_tz TEXT;
  v_classification TEXT;
  v_pillar TEXT;
  v_nervous TEXT;
  v_existing UUID[];
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    coalesce(nullif(trim(p."timeZone"), ''), 'UTC'),
    p.results -> 'classification' ->> 'key',
    p."primaryPillar",
    coalesce(
      p."onboardingData" -> 'stateSignals' ->> 'nervous_system_state',
      p."onboardingData" -> 'state_signals' ->> 'nervous_system_state'
    )
  INTO v_tz, v_classification, v_pillar, v_nervous
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_feed_date := (timezone(v_tz, now()))::date;

  SELECT f."articleIds"
  INTO v_existing
  FROM public."userDailyInsightFeed" f
  WHERE f."userId" = v_user_id
    AND f."feedDate" = v_feed_date;

  IF v_existing IS NULL OR coalesce(array_length(v_existing, 1), 0) = 0 THEN
    WITH recent AS (
      SELECT DISTINCT unnest(f."articleIds") AS article_id
      FROM public."userDailyInsightFeed" f
      WHERE f."userId" = v_user_id
        AND f."feedDate" >= v_feed_date - 14
    ),
    ranked AS (
      SELECT
        a.id AS article_id,
        public.coaching_insight_article_match_score(
          a."classificationKey",
          a."primaryPillar",
          a."nervousSystem",
          v_classification,
          v_pillar,
          v_nervous
        ) AS match_score
      FROM public."coachingInsightArticle" a
      WHERE a.published = true
        AND NOT EXISTS (
          SELECT 1
          FROM recent r
          WHERE r.article_id = a.id
        )
    ),
    eligible AS (
      SELECT ranked.article_id
      FROM ranked
      WHERE ranked.match_score >= 0
      ORDER BY ranked.match_score DESC, random()
      LIMIT 3
    ),
    picked AS (
      SELECT array_agg(eligible.article_id ORDER BY random()) AS ids
      FROM eligible
    ),
    needed AS (
      SELECT GREATEST(0, 3 - coalesce(array_length((SELECT ids FROM picked), 1), 0)) AS n
    ),
    fallback AS (
      SELECT array_agg(fb.article_id ORDER BY random()) AS ids
      FROM (
        SELECT a.id AS article_id
        FROM public."coachingInsightArticle" a
        CROSS JOIN needed n
        WHERE a.published = true
          AND n.n > 0
          AND NOT EXISTS (
            SELECT 1
            FROM recent r
            WHERE r.article_id = a.id
          )
          AND NOT (
            a.id = ANY (coalesce((SELECT ids FROM picked), ARRAY[]::uuid[]))
          )
        ORDER BY random()
        LIMIT (SELECT n FROM needed)
      ) fb
    )
    SELECT coalesce(
      (SELECT ids FROM picked),
      ARRAY[]::uuid[]
    ) || coalesce(
      (SELECT ids FROM fallback),
      ARRAY[]::uuid[]
    )
    INTO v_existing;

    IF coalesce(array_length(v_existing, 1), 0) = 0 THEN
      RETURN;
    END IF;

    INSERT INTO public."userDailyInsightFeed" ("userId", "feedDate", "articleIds")
    VALUES (v_user_id, v_feed_date, v_existing)
    ON CONFLICT ("userId", "feedDate") DO NOTHING;

    SELECT f."articleIds"
    INTO v_existing
    FROM public."userDailyInsightFeed" f
    WHERE f."userId" = v_user_id
      AND f."feedDate" = v_feed_date;
  END IF;

  IF v_existing IS NULL OR coalesce(array_length(v_existing, 1), 0) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id, a.title, a.summary, a.body
  FROM public."coachingInsightArticle" a
  WHERE a.id = ANY (v_existing)
    AND a.published = true
  ORDER BY array_position(v_existing, a.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_daily_insight_feed() TO authenticated;
