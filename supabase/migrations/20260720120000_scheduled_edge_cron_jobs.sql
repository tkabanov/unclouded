-- Daily cron → edge functions (REQ-07 vulnerable outreach + module unlock + reassessment).
-- Requires vault secrets (ops, not in git):
--   project_url
--   edge_cron_service_role_key
-- Optional per-function secrets (x-cron-secret header):
--   module_unlock_cron_secret
--   reassessment_due_cron_secret
--   vulnerable_outreach_cron_secret
--
-- Schedules (UTC):
--   daily-module-unlock          13:00
--   daily-vulnerable-outreach    14:00
--   daily-reassessment-due       15:00

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

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

REVOKE ALL ON FUNCTION public.invoke_scheduled_edge_function(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_scheduled_edge_function(text) TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-module-unlock') THEN
    PERFORM cron.schedule(
      'daily-module-unlock',
      '0 13 * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('module-unlock'); $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-vulnerable-outreach') THEN
    PERFORM cron.schedule(
      'daily-vulnerable-outreach',
      '0 14 * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('vulnerable-outreach'); $cron$
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-reassessment-due') THEN
    PERFORM cron.schedule(
      'daily-reassessment-due',
      '0 15 * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('reassessment-due'); $cron$
    );
  END IF;
END;
$$;
