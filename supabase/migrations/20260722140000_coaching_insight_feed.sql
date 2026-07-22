-- US-403 / US-404 — Personalized coaching insights feed (3 articles daily).

CREATE TABLE public."coachingInsightArticle" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  "classificationKey" TEXT NULL,
  "primaryPillar" TEXT NULL,
  "nervousSystem" TEXT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public."userDailyInsightFeed" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "feedDate" DATE NOT NULL,
  "articleIds" UUID[] NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_daily_insight_feed_user_date_unique UNIQUE ("userId", "feedDate")
);

CREATE INDEX idx_coaching_insight_article_published
  ON public."coachingInsightArticle" (published)
  WHERE published = true;

CREATE INDEX idx_user_daily_insight_feed_user_date
  ON public."userDailyInsightFeed" ("userId", "feedDate" DESC);

ALTER TABLE public."coachingInsightArticle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."userDailyInsightFeed" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read published coaching insight articles"
  ON public."coachingInsightArticle"
  FOR SELECT
  TO authenticated
  USING (published = true OR public.is_settings_admin());

CREATE POLICY "Settings admins insert coaching insight articles"
  ON public."coachingInsightArticle"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins update coaching insight articles"
  ON public."coachingInsightArticle"
  FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins delete coaching insight articles"
  ON public."coachingInsightArticle"
  FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());

CREATE POLICY "Users read own daily insight feed rows"
  ON public."userDailyInsightFeed"
  FOR SELECT
  TO authenticated
  USING ("userId" = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."coachingInsightArticle" TO authenticated;
GRANT SELECT ON public."userDailyInsightFeed" TO authenticated;
GRANT ALL ON public."coachingInsightArticle" TO service_role;
GRANT ALL ON public."userDailyInsightFeed" TO service_role;

DROP TRIGGER IF EXISTS update_coaching_insight_article_updated_at ON public."coachingInsightArticle";
CREATE TRIGGER update_coaching_insight_article_updated_at
  BEFORE UPDATE ON public."coachingInsightArticle"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.coaching_insight_article_matches_user(
  p_classification_key TEXT,
  p_primary_pillar TEXT,
  p_nervous_system TEXT,
  p_user_classification TEXT,
  p_user_pillar TEXT,
  p_user_nervous TEXT
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    (p_classification_key IS NULL OR (p_user_classification IS NOT NULL AND p_classification_key = p_user_classification))
    AND (
      p_primary_pillar IS NULL
      OR (p_user_pillar IS NOT NULL AND lower(p_primary_pillar) = lower(p_user_pillar))
    )
    AND (p_nervous_system IS NULL OR (p_user_nervous IS NOT NULL AND p_nervous_system = p_user_nervous));
$$;

CREATE OR REPLACE FUNCTION public.coaching_insight_article_match_score(
  p_classification_key TEXT,
  p_primary_pillar TEXT,
  p_nervous_system TEXT,
  p_user_classification TEXT,
  p_user_pillar TEXT,
  p_user_nervous TEXT
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN NOT public.coaching_insight_article_matches_user(
        p_classification_key,
        p_primary_pillar,
        p_nervous_system,
        p_user_classification,
        p_user_pillar,
        p_user_nervous
      ) THEN -1
      ELSE
        (CASE
          WHEN p_classification_key IS NOT NULL AND p_classification_key = p_user_classification THEN 4
          WHEN p_classification_key IS NULL THEN 1
          ELSE 0
        END)
        + (CASE
          WHEN p_primary_pillar IS NOT NULL AND lower(p_primary_pillar) = lower(p_user_pillar) THEN 4
          WHEN p_primary_pillar IS NULL THEN 1
          ELSE 0
        END)
        + (CASE
          WHEN p_nervous_system IS NOT NULL AND p_nervous_system = p_user_nervous THEN 4
          WHEN p_nervous_system IS NULL THEN 1
          ELSE 0
        END)
    END;
$$;

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

INSERT INTO public."coachingInsightArticle" (
  title,
  summary,
  body,
  "classificationKey",
  "primaryPillar",
  "nervousSystem",
  published
) VALUES
  (
    'Protect capacity before adding goals',
    'When your system is under load, the first move is subtraction — not another optimization plan.',
    'Capacity erosion often shows up as “I should be able to handle this.” That belief keeps you adding commitments while your nervous system is already taxed. Try one subtraction this week: a meeting, an obligation, or a self-imposed standard. Notice whether relief arrives before motivation returns.',
    'capacity_erosion',
    NULL,
    NULL,
    true
  ),
  (
    'Name the stall without calling it failure',
    'Performance stagnation is often a calibration signal, not a character flaw.',
    'When output flatlines, people default to shame or hustle. Both miss the signal. Ask: is the block clarity, energy, accountability, or alignment? Pick one lever for seven days instead of restarting the whole system.',
    'performance_stagnation',
    'professional',
    NULL,
    true
  ),
  (
    'Values before velocity',
    'Alignment fractures heal when you reconnect action to meaning — not when you push harder.',
    'If your calendar and your values disagree, discomfort is information. Audit one recurring commitment this week: does it reflect who you are becoming, or who you used to be? One values-aligned “no” can create more energy than three forced “yes” responses.',
    'alignment_fracture',
    'emotional',
    NULL,
    true
  ),
  (
    'High output can hide depletion',
    'Looking fine on the outside while running on fumes is a common hidden instability pattern.',
    'External performance can mask internal cost. Build a private check-in separate from your public metrics: sleep quality, irritability, recovery time after stress. Sustainable output requires honest internal telemetry.',
    'high_output_hidden_instability',
    NULL,
    'depleted',
    true
  ),
  (
    'Compound what is already working',
    'When you are optimization-ready, growth comes from protecting momentum — not chasing novelty.',
    'List three habits that are currently working. For each, identify the smallest daily action that preserves it. Optimization-ready seasons reward consistency systems more than dramatic pivots.',
    'optimization_ready',
    NULL,
    'regulated',
    true
  ),
  (
    'Discomfort with plateau is a growth cue',
    'A comfortable plateau often means stability succeeded — and a new edge is asking for attention.',
    'Plateau discomfort is not laziness; it is appetite for meaning. Choose one domain where “good enough” has become automatic, and design a low-risk stretch experiment for the next two weeks.',
    'comfortable_plateau',
    NULL,
    NULL,
    true
  ),
  (
    'Protect momentum with boundaries',
    'Building momentum requires guarding the drivers — not adding more inputs.',
    'Momentum dies from interruption more often than from lack of effort. Identify your top momentum driver and protect it with a boundary: time block, communication limit, or recovery ritual.',
    'building_momentum',
    'professional',
    NULL,
    true
  ),
  (
    'Regulate before you reframe',
    'When your nervous system is wired, insight lands better after stabilization.',
    'Trying to think your way out of activation often amplifies it. Use a two-minute downshift — longer exhale, cold water, short walk — before problem-solving. Regulation first, reflection second.',
    NULL,
    'health',
    'wired',
    true
  ),
  (
    'Shut-down is not disengagement',
    'A shut-down nervous system needs safety and small wins, not pressure.',
    'Shut-down can look like apathy or procrastination. Reduce scope to one micro-commitment that costs almost nothing. Completion rebuilds agency faster than inspiration speeches.',
    NULL,
    NULL,
    'shut_down',
    true
  ),
  (
    'Professional recovery starts with load mapping',
    'Burnout at work often reflects load structure, not personal weakness.',
    'Map cognitive, relational, and environmental load separately. Often one domain is overloaded while others look fine. Relief frequently comes from redistributing load, not working harder.',
    NULL,
    'professional',
    NULL,
    true
  ),
  (
    'Emotional well-being needs rhythm, not intensity',
    'Steady check-ins beat heroic interventions for emotional stability.',
    'Brief daily check-ins create signal over time. Patterns become visible before crises arrive. Consistency is the intervention.',
    NULL,
    'emotional',
    NULL,
    true
  ),
  (
    'Health habits follow energy, not guilt',
    'Energy-aware routines stick longer than punishment-based plans.',
    'Match habit size to current energy. On depleted days, preserve the smallest version of the habit rather than skipping entirely. Identity is built through returns, not perfection.',
    NULL,
    'health',
    'depleted',
    true
  );
