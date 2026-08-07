-- Prompt 5: deferred retry (~5 min) + escalate flag/notify on second failure.
-- Cron scans due retries; edge wall-clock cannot hold a 5-minute sleep.

ALTER TABLE public."assessmentResult"
  ADD COLUMN IF NOT EXISTS "coachingSummaryAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "coachingSummaryRetryAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "coachingSummaryEscalatedAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_coaching_summary_retry_due
  ON public."assessmentResult" ("coachingSummaryRetryAt")
  WHERE "coachingSummaryReady" = false
    AND "coachingSummaryRetryAt" IS NOT NULL
    AND "coachingSummaryEscalatedAt" IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "coachingSummaryFailed" BOOLEAN NOT NULL DEFAULT false;

-- Extend cron invoker with coaching-summary secret mapping.
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
    WHEN 'generate-coaching-summary' THEN 'coaching_summary_cron_secret'
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
    WHERE jobname = 'minutely-coaching-summary-retry';

    PERFORM cron.schedule(
      'minutely-coaching-summary-retry',
      '* * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('generate-coaching-summary'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip minutely-coaching-summary-retry schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule minutely-coaching-summary-retry: %', SQLERRM;
END $$;
