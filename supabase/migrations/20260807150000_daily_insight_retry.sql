-- Prompt 1: deferred retry (~30 min) + prune support; cron every 15 minutes.

CREATE TABLE IF NOT EXISTS public."dailyInsightRetry" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "insightDate" DATE NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "retryAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "insightDate")
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_retry_due
  ON public."dailyInsightRetry" ("retryAt")
  WHERE "retryAt" IS NOT NULL
    AND "attemptCount" = 1;

ALTER TABLE public."dailyInsightRetry" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public."dailyInsightRetry" TO service_role;

DROP TRIGGER IF EXISTS update_daily_insight_retry_updated_at ON public."dailyInsightRetry";
CREATE TRIGGER update_daily_insight_retry_updated_at
  BEFORE UPDATE ON public."dailyInsightRetry"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Scan every 15 minutes so a ~30m retry can fire in-window.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'hourly-generate-daily-insights';

    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'quarter-hourly-generate-daily-insights';

    PERFORM cron.schedule(
      'quarter-hourly-generate-daily-insights',
      '*/15 * * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('generate-daily-insights'); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip quarter-hourly-generate-daily-insights schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule quarter-hourly-generate-daily-insights: %', SQLERRM;
END $$;
