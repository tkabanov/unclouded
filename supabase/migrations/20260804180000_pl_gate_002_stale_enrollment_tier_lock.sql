-- PL-GATE-002 / PL-DOWN-001: stale enrollments after downgrade must not grant
-- silent full access to paid path sessions.
--
-- Before this migration:
--   * INSERT pathEnrollment was tier-gated
--   * UPDATE pathEnrollment and INSERT pathResponse stayed owner-only
--   * pathSession catalog SELECT exposed coachingText to any authenticated user
--   * enrollment-based pathSession SELECT ignored effective tier
--
-- After:
--   * Progress updates require my_tier_allows(path); abandon stays allowed
--   * pathResponse inserts require the session's path tier
--   * Full session content is readable only when the caller's tier allows the path
--   * Step titles remain available via list_path_session_steps (progress / detail UI)

-- ---------------------------------------------------------------------------
-- Session step titles (no coaching text) for locked-path progress UI
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_path_session_steps(p_path_id UUID)
RETURNS TABLE (
  id UUID,
  index INTEGER,
  title TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.id, ps.index, coalesce(ps.title, '')::text
  FROM public."pathSession" ps
  WHERE ps."pathId" = p_path_id
  ORDER BY ps.index ASC;
$$;

REVOKE ALL ON FUNCTION public.list_path_session_steps(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_path_session_steps(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_path_session_steps(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- pathSession / pathQuestion SELECT — require effective tier, not mere enrollment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.userCanAccessPathSession(session_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1
    FROM public."pathSession" ps
    WHERE ps.id = session_id
      AND public.my_tier_allows(coalesce(public.path_required_tier(ps."pathId"), 'free'))
  );
$$;

CREATE OR REPLACE FUNCTION public.userCanAccessPathQuestion(question_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_settings_admin() OR EXISTS (
    SELECT 1
    FROM public."pathQuestion" pq
    JOIN public."pathSession" ps ON ps.id = pq."sessionId"
    WHERE pq.id = question_id
      AND public.my_tier_allows(coalesce(public.path_required_tier(ps."pathId"), 'free'))
  );
$$;

DROP POLICY IF EXISTS "Authenticated read pathSession catalog" ON public."pathSession";
DROP POLICY IF EXISTS "Enrolled user selects pathSession" ON public."pathSession";
CREATE POLICY "Tier-allowed selects pathSession" ON public."pathSession"
  FOR SELECT TO authenticated
  USING (public.userCanAccessPathSession(id));

DROP POLICY IF EXISTS "Enrolled user selects pathQuestion" ON public."pathQuestion";
CREATE POLICY "Tier-allowed selects pathQuestion" ON public."pathQuestion"
  FOR SELECT TO authenticated
  USING (public.userCanAccessPathQuestion(id));

-- ---------------------------------------------------------------------------
-- pathEnrollment UPDATE — abandon without tier; progress requires tier
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owner updates pathEnrollment" ON public."pathEnrollment";
CREATE POLICY "Owner updates pathEnrollment with tier for progress"
  ON public."pathEnrollment"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (
    public.userOwnsRow("userId")
    AND (
      public.my_tier_allows(coalesce(public.path_required_tier("pathId"), 'free'))
      OR status = 'abandoned'
    )
  );

-- ---------------------------------------------------------------------------
-- pathResponse INSERT — completing a paid session requires the path tier
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.path_session_required_tier(p_session_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(public.path_required_tier(ps."pathId"), 'free')
  FROM public."pathSession" ps
  WHERE ps.id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION public.path_session_required_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.path_session_required_tier(UUID) TO service_role;

DROP POLICY IF EXISTS "Owner inserts pathResponse" ON public."pathResponse";
CREATE POLICY "Owner with tier inserts pathResponse" ON public."pathResponse"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND public.my_tier_allows(coalesce(public.path_session_required_tier("sessionId"), 'free'))
  );
