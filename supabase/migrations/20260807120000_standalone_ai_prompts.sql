-- Standalone Kota AI prompts (Uncloud360_AI_Prompt_Specifications):
-- journal reflectionReady, pathSessionCompletion, assessmentResult trajectory/summary,
-- dailyInsight table + cron hook for generate-daily-insights.

-- ---------------------------------------------------------------------------
-- journalEntry: delayed-reveal flag
-- ---------------------------------------------------------------------------
ALTER TABLE public."journalEntry"
  ADD COLUMN IF NOT EXISTS "reflectionReady" BOOLEAN NOT NULL DEFAULT false;

UPDATE public."journalEntry"
SET "reflectionReady" = true
WHERE "aiReflection" IS NOT NULL
  AND trim("aiReflection") <> ''
  AND "reflectionReady" = false;

-- ---------------------------------------------------------------------------
-- pathSessionCompletion: Prompt 3 closing insight (user-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."pathSessionCompletion" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "pathId" UUID NULL REFERENCES public."path"(id) ON DELETE SET NULL,
  "pathSessionId" UUID NOT NULL REFERENCES public."pathSession"(id) ON DELETE CASCADE,
  "enrollmentId" UUID NULL,
  "closingAcknowledgment" TEXT NULL,
  "closingSitWith" TEXT NULL,
  "closingCta" TEXT NOT NULL DEFAULT 'Something come up? Start a chat with Kota.',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "pathSessionId")
);

CREATE INDEX IF NOT EXISTS idx_path_session_completion_user
  ON public."pathSessionCompletion" ("userId", "createdAt" DESC);

ALTER TABLE public."pathSessionCompletion" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public."pathSessionCompletion" TO authenticated;
GRANT ALL ON public."pathSessionCompletion" TO service_role;

DROP POLICY IF EXISTS "Owner selects pathSessionCompletion" ON public."pathSessionCompletion";
CREATE POLICY "Owner selects pathSessionCompletion"
  ON public."pathSessionCompletion"
  FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts pathSessionCompletion" ON public."pathSessionCompletion";
CREATE POLICY "Owner inserts pathSessionCompletion"
  ON public."pathSessionCompletion"
  FOR INSERT TO authenticated
  WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner updates pathSessionCompletion" ON public."pathSessionCompletion";
CREATE POLICY "Owner updates pathSessionCompletion"
  ON public."pathSessionCompletion"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (public.userOwnsRow("userId"));

DROP TRIGGER IF EXISTS update_path_session_completion_updated_at ON public."pathSessionCompletion";
CREATE TRIGGER update_path_session_completion_updated_at
  BEFORE UPDATE ON public."pathSessionCompletion"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- assessmentResult: Prompt 4 + 5 storage
-- ---------------------------------------------------------------------------
ALTER TABLE public."assessmentResult"
  ADD COLUMN IF NOT EXISTS "trajectoryStatementText" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "coachingSummaryJson" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "coachingSummaryReady" BOOLEAN NOT NULL DEFAULT false;

-- Group bookings can also receive Kota's Read (Prompt 6).
ALTER TABLE public."groupSessionBooking"
  ADD COLUMN IF NOT EXISTS "kotaRead" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "kotaReadEmailedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "kotaReadEmailDetail" TEXT NULL;

GRANT UPDATE ON public."assessmentResult" TO authenticated;
GRANT UPDATE ON public."assessmentResult" TO service_role;

DROP POLICY IF EXISTS "Owner updates assessmentResult" ON public."assessmentResult";
CREATE POLICY "Owner updates assessmentResult"
  ON public."assessmentResult"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (public.userOwnsRow("userId"));

-- ---------------------------------------------------------------------------
-- dailyInsight: Prompt 1 Kota daily messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."dailyInsight" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "insightDate" DATE NOT NULL,
  "insight1Title" TEXT NOT NULL,
  "insight1Body" TEXT NOT NULL,
  "insight2Title" TEXT NOT NULL,
  "insight2Body" TEXT NOT NULL,
  "insight3Title" TEXT NOT NULL,
  "insight3Body" TEXT NOT NULL,
  "notifiedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "insightDate")
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_user_date
  ON public."dailyInsight" ("userId", "insightDate" DESC);

ALTER TABLE public."dailyInsight" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public."dailyInsight" TO authenticated;
GRANT ALL ON public."dailyInsight" TO service_role;

DROP POLICY IF EXISTS "Owner selects dailyInsight" ON public."dailyInsight";
CREATE POLICY "Owner selects dailyInsight"
  ON public."dailyInsight"
  FOR SELECT TO authenticated
  USING (public.userOwnsRow("userId"));

-- ---------------------------------------------------------------------------
-- Cron: hourly scan for users due for daily Kota insights (local 08:00 default)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_scheduled_edge_function(function_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'net', 'cron', 'pg_catalog'
AS $function$
DECLARE
  project_url text;
  service_role_key text;
  cron_secret text;
  secret_name text;
  request_id bigint;
  headers jsonb;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'edge_cron_service_role_key'
  LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'invoke_scheduled_edge_function(%): missing vault secrets project_url or edge_cron_service_role_key', function_slug;
    RETURN NULL;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  secret_name := CASE function_slug
    WHEN 'module-unlock' THEN 'module_unlock_cron_secret'
    WHEN 'reassessment-due' THEN 'reassessment_due_cron_secret'
    WHEN 'vulnerable-outreach' THEN 'vulnerable_outreach_cron_secret'
    WHEN 'generate-daily-insights' THEN 'daily_insights_cron_secret'
    ELSE NULL
  END;

  IF secret_name IS NOT NULL THEN
    SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets
    WHERE name = secret_name
    LIMIT 1;

    IF cron_secret IS NOT NULL AND length(trim(cron_secret)) > 0 THEN
      headers := headers || jsonb_build_object('x-cron-secret', cron_secret);
    END IF;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_slug,
    headers := headers,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  INTO request_id;

  RETURN request_id;
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'hourly-generate-daily-insights';

    PERFORM cron.schedule(
      'hourly-generate-daily-insights',
      '5 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('generate-daily-insights'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip hourly-generate-daily-insights schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule hourly-generate-daily-insights: %', SQLERRM;
END $$;
