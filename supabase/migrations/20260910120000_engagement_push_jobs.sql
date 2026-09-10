-- MOB-11 — daily check-in reminder + 5-day inactivity follow-up.
--
-- Dedupe columns follow the existing per-notification-type convention on
-- `profiles` (see `vulnerableOutreachEmailedAt`, `firstModuleMilestoneEmailedAt`)
-- rather than a generic notification-log table.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "checkinReminderSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "inactivityFollowupSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "inactivityFollowupBaselineActivityAt" TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.profiles."checkinReminderSentAt" IS
  'MOB-11: last time the daily check-in reminder push was attempted (same-day dedupe, in the user''s timezone).';
COMMENT ON COLUMN public.profiles."inactivityFollowupSentAt" IS
  'MOB-11: last time the 5-day inactivity follow-up push was attempted (ops visibility only).';
COMMENT ON COLUMN public.profiles."inactivityFollowupBaselineActivityAt" IS
  'MOB-11: the resolved last-activity timestamp the most recent inactivity follow-up was sent for — a new activity moves this forward and re-arms eligibility after another 5 idle days.';

-- Extend cron invoker with the two new engagement-job secret mappings.
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
    WHEN 'daily-checkin-reminder' THEN 'daily_checkin_reminder_cron_secret'
    WHEN 'inactivity-followup' THEN 'inactivity_followup_cron_secret'
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

-- daily-checkin-reminder runs hourly so it can catch each user's local
-- evening window (CHECKIN_REMINDER_LOCAL_HOUR); the same-day dedupe column
-- makes repeat hourly ticks after the first send a no-op.
-- inactivity-followup only needs to run once a day — eligibility is a ≥5-day
-- idle window, not a specific hour.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'hourly-daily-checkin-reminder';

    PERFORM cron.schedule(
      'hourly-daily-checkin-reminder',
      '0 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('daily-checkin-reminder'); $cron$
    );

    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-inactivity-followup') THEN
      PERFORM cron.schedule(
        'daily-inactivity-followup',
        '0 16 * * *',
        $cron$ SELECT public.invoke_scheduled_edge_function('inactivity-followup'); $cron$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip engagement push job schedules';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule engagement push jobs: %', SQLERRM;
END $$;
