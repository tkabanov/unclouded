-- Admin read access for REQ-16 session archive analytics.

DROP POLICY IF EXISTS "Admin selects coachingSessionArchive" ON public."coachingSessionArchive";
CREATE POLICY "Admin selects coachingSessionArchive" ON public."coachingSessionArchive"
  FOR SELECT TO authenticated USING (public.is_settings_admin());
