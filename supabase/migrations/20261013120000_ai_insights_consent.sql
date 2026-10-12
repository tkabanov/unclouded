-- NCLDD-55 (OVR-073): per-user consent for including AI conversations in anonymized Insights.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL. Additive only.
--
-- profiles."aiInsightsConsent": NULL = never asked, true = granted, false = declined/revoked.
-- Both answers allow AI use; the value only controls Insights processing.
-- The columns change only through set_ai_insights_consent(): "Owner updates profile" grants a
-- table-level UPDATE, so a column REVOKE would not help — a trigger keeps OLD values instead
-- (same approach as profiles_protect_admin_role).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "aiInsightsConsent" boolean,
  ADD COLUMN IF NOT EXISTS "aiInsightsConsentVersion" integer,
  ADD COLUMN IF NOT EXISTS "aiInsightsConsentUpdatedAt" timestamptz;

COMMENT ON COLUMN public.profiles."aiInsightsConsent" IS
  'NCLDD-55: NULL = not asked, true = AI conversations may feed anonymized Insights, false = excluded.';

CREATE OR REPLACE FUNCTION public.profiles_protect_ai_insights_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_jwt_role text := nullif(auth.role(), '');
BEGIN
  IF coalesce(current_setting('app.ai_insights_consent_sync', true), '') = 'true'
     OR v_jwt_role = 'service_role'
     OR (v_jwt_role IS NULL AND current_user NOT IN ('authenticated', 'anon')) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW."aiInsightsConsent" := NULL;
    NEW."aiInsightsConsentVersion" := NULL;
    NEW."aiInsightsConsentUpdatedAt" := NULL;
  ELSE
    NEW."aiInsightsConsent" := OLD."aiInsightsConsent";
    NEW."aiInsightsConsentVersion" := OLD."aiInsightsConsentVersion";
    NEW."aiInsightsConsentUpdatedAt" := OLD."aiInsightsConsentUpdatedAt";
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_ai_insights_consent ON public.profiles;
CREATE TRIGGER profiles_protect_ai_insights_consent
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_ai_insights_consent();

REVOKE ALL ON FUNCTION public.profiles_protect_ai_insights_consent() FROM PUBLIC, anon, authenticated;

/**
 * Current consent terms version. Must equal AI_INSIGHTS_CONSENT_VERSION in
 * supabase/functions/_shared/aiInsights/taxonomy.ts — bump both in one migration when the
 * consent copy or terms change. Consent for an older version does not count anywhere.
 */
CREATE OR REPLACE FUNCTION public.ai_insights_consent_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$ SELECT 1 $$;

REVOKE ALL ON FUNCTION public.ai_insights_consent_version() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_insights_consent_version() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Audit log of consent decisions (owner can read their own history)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."aiInsightsConsentEvent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted boolean NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  source text NOT NULL CHECK (source IN ('first_use', 'settings')),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "aiInsightsConsentEvent_user_idx"
  ON public."aiInsightsConsentEvent" ("userId", "createdAt" DESC);

ALTER TABLE public."aiInsightsConsentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."aiInsightsConsentEvent" FROM anon, authenticated;
GRANT SELECT ON public."aiInsightsConsentEvent" TO authenticated;
GRANT ALL ON public."aiInsightsConsentEvent" TO service_role;

DROP POLICY IF EXISTS "Owner selects aiInsightsConsentEvent" ON public."aiInsightsConsentEvent";
CREATE POLICY "Owner selects aiInsightsConsentEvent" ON public."aiInsightsConsentEvent"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

-- ---------------------------------------------------------------------------
-- Session-level Insights facts (closed taxonomy keys only, no free text).
-- Written by the chat edge function (service role) at session finalize for consenting users.
-- Read only through admin aggregate RPCs. userId is kept solely for consent revocation,
-- account deletion and distinct-user thresholds — it is never returned to admins.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."aiInsightSessionFact" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "conversationId" uuid NOT NULL UNIQUE REFERENCES public."chatConversation"(id) ON DELETE CASCADE,
  "sessionType" text NOT NULL CHECK ("sessionType" IN ('text', 'voice')),
  "sessionDate" date NOT NULL,
  topics text[] NOT NULL DEFAULT '{}',
  "requestTypes" text[] NOT NULL DEFAULT '{}',
  "concernThemes" text[] NOT NULL DEFAULT '{}',
  "resourceIds" uuid[] NOT NULL DEFAULT '{}',
  "crisisLineMentioned" boolean NOT NULL DEFAULT false,
  "classifierVersion" integer NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "aiInsightSessionFact_array_sizes" CHECK (
    cardinality(topics) <= 5
    AND cardinality("requestTypes") <= 5
    AND cardinality("concernThemes") <= 5
    AND cardinality("resourceIds") <= 10
  )
);

CREATE INDEX IF NOT EXISTS "aiInsightSessionFact_date_idx"
  ON public."aiInsightSessionFact" ("sessionDate");
CREATE INDEX IF NOT EXISTS "aiInsightSessionFact_user_idx"
  ON public."aiInsightSessionFact" ("userId");

ALTER TABLE public."aiInsightSessionFact" ENABLE ROW LEVEL SECURITY;
-- No policies and no grants for anon/authenticated.
REVOKE ALL ON public."aiInsightSessionFact" FROM anon, authenticated;
GRANT ALL ON public."aiInsightSessionFact" TO service_role;

/**
 * Facts are only kept for users with consent for the current version at write time.
 * FOR SHARE serializes with set_ai_insights_consent(): a concurrent revoke either waits for this
 * write (and then deletes the row) or commits first (and this write is skipped).
 */
CREATE OR REPLACE FUNCTION public.ai_insight_fact_require_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT p."aiInsightsConsent" IS TRUE
         AND p."aiInsightsConsentVersion" = public.ai_insights_consent_version()
  INTO v_ok
  FROM public.profiles p
  WHERE p.id = NEW."userId"
  FOR SHARE;

  IF v_ok IS NOT TRUE THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ai_insight_fact_require_consent() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ai_insight_fact_require_consent ON public."aiInsightSessionFact";
CREATE TRIGGER ai_insight_fact_require_consent
  BEFORE INSERT OR UPDATE ON public."aiInsightSessionFact"
  FOR EACH ROW
  EXECUTE FUNCTION public.ai_insight_fact_require_consent();

COMMENT ON TABLE public."aiInsightSessionFact" IS
  'NCLDD-55: per-session taxonomy facts for consenting users. Deleted on consent revoke; 13-month retention.';

-- ---------------------------------------------------------------------------
-- Consent RPC (the only client write path)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_ai_insights_consent(
  p_granted boolean,
  p_version integer,
  p_source text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  v_deleted integer := 0;
  v_updated integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_granted IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_choice', 'error', 'Choice is required.');
  END IF;
  -- The client must answer the terms it was shown; it can't pre-consent to future versions.
  IF p_version IS DISTINCT FROM public.ai_insights_consent_version() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_version', 'error', 'Please reload the page and try again.');
  END IF;
  IF p_source IS NULL OR p_source NOT IN ('first_use', 'settings') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_source', 'error', 'Invalid source.');
  END IF;

  PERFORM set_config('app.ai_insights_consent_sync', 'true', true);
  UPDATE public.profiles
  SET "aiInsightsConsent" = p_granted,
      "aiInsightsConsentVersion" = p_version,
      "aiInsightsConsentUpdatedAt" = v_now
  WHERE id = v_user;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM set_config('app.ai_insights_consent_sync', 'false', true);

  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'profile_not_found', 'error', 'Profile not found.');
  END IF;

  INSERT INTO public."aiInsightsConsentEvent" ("userId", granted, version, source)
  VALUES (v_user, p_granted, p_version, p_source);

  -- Revocation removes every non-aggregated Insights record; aggregates are computed on read,
  -- so previously shown numbers are recalculated without this user.
  IF NOT p_granted THEN
    DELETE FROM public."aiInsightSessionFact" WHERE "userId" = v_user;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'granted', p_granted,
    'version', p_version,
    'updatedAt', v_now,
    'deletedFacts', v_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_ai_insights_consent(boolean, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ai_insights_consent(boolean, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Retention: Insights facts older than 13 months are deleted daily.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-ai-insights-retention') THEN
      PERFORM cron.schedule(
        'daily-ai-insights-retention',
        '30 3 * * *',
        $cron$ DELETE FROM public."aiInsightSessionFact" WHERE "sessionDate" < (current_date - interval '13 months'); $cron$
      );
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron.job unavailable — skip AI Insights retention schedule';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule AI Insights retention: %', SQLERRM;
END $$;
