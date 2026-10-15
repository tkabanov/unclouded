-- auto-finalize-sessions: cron sends x-cron-secret from vault auto_finalize_sessions_cron_secret
-- (the vault service key may not match the edge env key). Same body as 20260910120000 + one slug.

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
    WHEN 'daily-checkin-reminder' THEN 'daily_checkin_reminder_cron_secret'
    WHEN 'inactivity-followup' THEN 'inactivity_followup_cron_secret'
    WHEN 'auto-finalize-sessions' THEN 'auto_finalize_sessions_cron_secret'
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
