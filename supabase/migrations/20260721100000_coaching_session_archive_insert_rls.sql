-- Edge chat finalize persists archives with the authenticated user client (RLS applies).

GRANT INSERT ON public."coachingSessionArchive" TO authenticated;

DROP POLICY IF EXISTS "Owner inserts coachingSessionArchive" ON public."coachingSessionArchive";
CREATE POLICY "Owner inserts coachingSessionArchive" ON public."coachingSessionArchive"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));
