-- Section 2: assessmentResult history, profile reassessment dates, path-adaptive reflection field.

-- ---------------------------------------------------------------------------
-- assessmentResult
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."assessmentResult" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "assessmentDate" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "stabilityScore" NUMERIC NULL,
  "performanceScore" NUMERIC NULL,
  "alignmentScore" NUMERIC NULL,
  "orientationScore" NUMERIC NULL,
  classification TEXT NULL,
  "trajectoryType" TEXT NULL,
  "isInitial" BOOLEAN NOT NULL DEFAULT false,
  "reflectionQ1" TEXT NULL,
  "reflectionQ2" TEXT NULL,
  "reflectionQ3" TEXT NULL,
  "reflectionQ4" TEXT NULL,
  "pathAdaptiveQ" TEXT NULL,
  "pathAdaptiveAnswer" TEXT NULL,
  "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
  "rawResults" JSONB NULL,
  "rawScores" JSONB NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_result_user_date
  ON public."assessmentResult" ("userId", "assessmentDate" DESC);

ALTER TABLE public."assessmentResult" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public."assessmentResult" TO authenticated;
GRANT ALL ON public."assessmentResult" TO service_role;

DROP POLICY IF EXISTS "Owner selects assessmentResult" ON public."assessmentResult";
CREATE POLICY "Owner selects assessmentResult" ON public."assessmentResult"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts assessmentResult" ON public."assessmentResult";
CREATE POLICY "Owner inserts assessmentResult" ON public."assessmentResult"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Settings admin selects assessmentResult" ON public."assessmentResult";
CREATE POLICY "Settings admin selects assessmentResult" ON public."assessmentResult"
  FOR SELECT TO authenticated USING (public.is_settings_admin());

DROP TRIGGER IF EXISTS update_assessment_result_updated_at ON public."assessmentResult";
CREATE TRIGGER update_assessment_result_updated_at
  BEFORE UPDATE ON public."assessmentResult"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- profiles: reassessment cycle fields + email cohort marker
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "lastAssessmentDate" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "nextReassessmentDate" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "canReassessOnDemand" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reassessmentDueEmailedAt" TIMESTAMPTZ NULL;

-- Admins need to list users for reassessment history (US-504).
DROP POLICY IF EXISTS "Settings admin selects profiles" ON public.profiles;
CREATE POLICY "Settings admin selects profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_settings_admin());

-- ---------------------------------------------------------------------------
-- pathSession: path-adaptive reassessment reflection question
-- ---------------------------------------------------------------------------
ALTER TABLE public."pathSession"
  ADD COLUMN IF NOT EXISTS "reassessmentReflectionQuestion" TEXT NULL;

-- ---------------------------------------------------------------------------
-- Backfill assessmentResult + profile dates from existing JSONB columns
-- ---------------------------------------------------------------------------
INSERT INTO public."assessmentResult" (
  "userId",
  "assessmentDate",
  "stabilityScore",
  "performanceScore",
  "alignmentScore",
  "orientationScore",
  classification,
  "trajectoryType",
  "isInitial",
  "rawResults",
  "pdfGenerated"
)
SELECT
  p.id,
  COALESCE(p."onboardingCompletedAt", p."createdAt", now()),
  NULLIF(p.results->>'stability_score', '')::numeric,
  NULLIF(p.results->>'performance_score', '')::numeric,
  NULLIF(p.results->>'alignment_score', '')::numeric,
  NULLIF(p.results->>'orientation_score', '')::numeric,
  COALESCE(p.results->'classification'->>'name', p.results->'classification'->>'key', p.classification),
  NULL,
  true,
  p.results,
  false
FROM public.profiles p
WHERE p.results IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."assessmentResult" ar
    WHERE ar."userId" = p.id AND ar."isInitial" = true
  );

INSERT INTO public."assessmentResult" (
  "userId",
  "assessmentDate",
  "stabilityScore",
  "performanceScore",
  "alignmentScore",
  "orientationScore",
  classification,
  "trajectoryType",
  "isInitial",
  "reflectionQ1",
  "reflectionQ2",
  "reflectionQ3",
  "reflectionQ4",
  "rawResults",
  "pdfGenerated"
)
SELECT
  p.id,
  COALESCE(p."reassessmentCompletedAt", now()),
  NULLIF(p."reassessmentResults"->>'stability_score', '')::numeric,
  NULLIF(p."reassessmentResults"->>'performance_score', '')::numeric,
  NULLIF(p."reassessmentResults"->>'alignment_score', '')::numeric,
  NULLIF(p."reassessmentResults"->>'orientation_score', '')::numeric,
  COALESCE(
    p."reassessmentResults"->'classification'->>'name',
    p."reassessmentResults"->'classification'->>'key'
  ),
  NULL,
  false,
  COALESCE(
    p."reassessmentReflections"->>'reflection_q1',
    p."reassessmentReflections"->>'whats_different'
  ),
  COALESCE(
    p."reassessmentReflections"->>'reflection_q2',
    p."reassessmentReflections"->>'still_hard'
  ),
  COALESCE(
    p."reassessmentReflections"->>'reflection_q3',
    p."reassessmentReflections"->>'proud_of'
  ),
  COALESCE(
    p."reassessmentReflections"->>'reflection_q4',
    p."reassessmentReflections"->>'focus_next'
  ),
  p."reassessmentResults",
  false
FROM public.profiles p
WHERE p."reassessmentResults" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."assessmentResult" ar
    WHERE ar."userId" = p.id AND ar."isInitial" = false
  );

UPDATE public.profiles p
SET
  "lastAssessmentDate" = sub.last_at,
  "nextReassessmentDate" = COALESCE(p."nextReassessmentDate", sub.last_at + INTERVAL '90 days'),
  "canReassessOnDemand" = CASE
    WHEN LOWER(COALESCE(p.tier, '')) = 'premium'
      AND p."reassessmentCompletedAt" IS NOT NULL THEN true
    ELSE COALESCE(p."canReassessOnDemand", false)
  END
FROM (
  SELECT
    p2.id AS profile_id,
    COALESCE(
      p2."lastAssessmentDate",
      (
        SELECT MAX(ar."assessmentDate")
        FROM public."assessmentResult" ar
        WHERE ar."userId" = p2.id
      ),
      p2."reassessmentCompletedAt",
      p2."onboardingCompletedAt"
    ) AS last_at
  FROM public.profiles p2
) sub
WHERE p.id = sub.profile_id
  AND sub.last_at IS NOT NULL;
