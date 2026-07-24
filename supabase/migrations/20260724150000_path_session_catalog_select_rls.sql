-- Path library detail shows session steps before enroll; path rows are catalog data.

DROP POLICY IF EXISTS "Authenticated read pathSession catalog" ON public."pathSession";
CREATE POLICY "Authenticated read pathSession catalog"
  ON public."pathSession"
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.path p WHERE p.id = "pathId")
  );
