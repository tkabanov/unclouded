-- NCLDD-31 §4 — Retry Meet/Calendar creation for sessions that were confirmed
-- while Google was unreachable. Booking confirmation never blocks on Google, so
-- without a sweeper such a session keeps its empty meetLink forever and the
-- reminder emails keep promising a link that never arrives.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "meetBackfillAttemptedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "meetBackfillDetail" TEXT NULL;

COMMENT ON COLUMN public."coachBooking"."meetBackfillAttemptedAt" IS
  'When the Meet/Calendar backfill sweeper last tried this booking.';
COMMENT ON COLUMN public."coachBooking"."meetBackfillDetail" IS
  'Last backfill outcome (e.g. google:created, google:refresh_token_revoked) for admin diagnosis.';

ALTER TABLE public."groupCoachingSession"
  ADD COLUMN IF NOT EXISTS "meetBackfillAttemptedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "meetBackfillDetail" TEXT NULL;

COMMENT ON COLUMN public."groupCoachingSession"."meetBackfillAttemptedAt" IS
  'When the Meet/Calendar backfill sweeper last tried this session.';
COMMENT ON COLUMN public."groupCoachingSession"."meetBackfillDetail" IS
  'Last backfill outcome for admin diagnosis.';

CREATE INDEX IF NOT EXISTS idx_coach_booking_meet_backfill_due
  ON public."coachBooking" ("scheduledAt")
  WHERE status = 'confirmed'
    AND "scheduledAt" IS NOT NULL
    AND "meetLink" IS NULL;

CREATE INDEX IF NOT EXISTS idx_group_session_meet_backfill_due
  ON public."groupCoachingSession" ("startsAt")
  WHERE status = 'scheduled'
    AND "meetLink" IS NULL;

-- Extend cron invoker with backfill-session-meet-links secret mapping.
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
    WHEN 'group-coaching-waitlist' THEN 'group_coaching_waitlist_cron_secret'
    WHEN 'backfill-session-meet-links' THEN 'meet_backfill_cron_secret'
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
    WHERE jobname = 'every-15m-backfill-session-meet-links';

    PERFORM cron.schedule(
      'every-15m-backfill-session-meet-links',
      '*/15 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('backfill-session-meet-links'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip every-15m-backfill-session-meet-links schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule every-15m-backfill-session-meet-links: %', SQLERRM;
END $$;
