-- PathResponse: stores per-question session reflection answers (Developer FAQ / US-305).
CREATE TABLE IF NOT EXISTS public."pathResponse" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "sessionId" UUID NULL REFERENCES public."pathSession"(id) ON DELETE SET NULL,
  "questionId" UUID NULL REFERENCES public."pathQuestion"(id) ON DELETE SET NULL,
  "questionText" TEXT NULL,
  "answerText" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_path_response_user_created
  ON public."pathResponse" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_path_response_session
  ON public."pathResponse" ("sessionId");

ALTER TABLE public."pathResponse" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public."pathResponse" TO authenticated;
GRANT ALL ON public."pathResponse" TO service_role;

DROP POLICY IF EXISTS "Owner selects pathResponse" ON public."pathResponse";
CREATE POLICY "Owner selects pathResponse" ON public."pathResponse"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts pathResponse" ON public."pathResponse";
CREATE POLICY "Owner inserts pathResponse" ON public."pathResponse"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner updates pathResponse" ON public."pathResponse";
CREATE POLICY "Owner updates pathResponse" ON public."pathResponse"
  FOR UPDATE TO authenticated USING (public.userOwnsRow("userId")) WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner deletes pathResponse" ON public."pathResponse";
CREATE POLICY "Owner deletes pathResponse" ON public."pathResponse"
  FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));

DROP TRIGGER IF EXISTS update_path_response_updated_at ON public."pathResponse";
CREATE TRIGGER update_path_response_updated_at
  BEFORE UPDATE ON public."pathResponse"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
