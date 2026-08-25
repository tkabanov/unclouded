-- NCLDD-31 §5 — Automated 24h / 1h reminders for confirmed 1:1 sessions.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "reminder1hSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "reminder24hDetail" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "reminder1hDetail" TEXT NULL;

COMMENT ON COLUMN public."coachBooking"."reminder24hSentAt" IS
  'When the 24-hour session reminder was attempted (idempotency stamp).';
COMMENT ON COLUMN public."coachBooking"."reminder1hSentAt" IS
  'When the 1-hour session reminder was attempted (idempotency stamp).';
COMMENT ON COLUMN public."coachBooking"."reminder24hDetail" IS
  'SendGrid / skip detail for the 24-hour reminder attempt.';
COMMENT ON COLUMN public."coachBooking"."reminder1hDetail" IS
  'SendGrid / skip detail for the 1-hour reminder attempt.';

CREATE INDEX IF NOT EXISTS idx_coach_booking_reminder_24h_due
  ON public."coachBooking" ("scheduledAt")
  WHERE status = 'confirmed'
    AND "scheduledAt" IS NOT NULL
    AND "reminder24hSentAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_coach_booking_reminder_1h_due
  ON public."coachBooking" ("scheduledAt")
  WHERE status = 'confirmed'
    AND "scheduledAt" IS NOT NULL
    AND "reminder1hSentAt" IS NULL;

-- Extend cron invoker with coach-booking-reminders secret mapping.
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
    WHEN 'coach-booking-reminders' THEN 'coach_booking_reminders_cron_secret'
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
    WHERE jobname = 'every-5m-coach-booking-reminders';

    PERFORM cron.schedule(
      'every-5m-coach-booking-reminders',
      '*/5 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('coach-booking-reminders'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip every-5m-coach-booking-reminders schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule every-5m-coach-booking-reminders: %', SQLERRM;
END $$;
