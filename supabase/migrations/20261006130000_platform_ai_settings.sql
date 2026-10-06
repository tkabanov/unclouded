-- NCLDD-53: platform-wide AI prompt settings (global system prompt, prohibited topics, tone of voice).
-- Singleton row (id = 1). Admin-only via RLS; edge functions read it with service role.
-- Additive only.

CREATE TABLE IF NOT EXISTS public."platformAiSettings" (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  "globalSystemPrompt" text NOT NULL DEFAULT '' CHECK (char_length("globalSystemPrompt") <= 8000),
  "prohibitedTopics" text[] NOT NULL DEFAULT '{}' CHECK (
    cardinality("prohibitedTopics") <= 50
    AND array_position("prohibitedTopics", NULL) IS NULL
  ),
  "toneOfVoice" text NOT NULL DEFAULT '' CHECK (char_length("toneOfVoice") <= 1000),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Per-topic length limit (CHECK cannot use subqueries; use an immutable helper).
CREATE OR REPLACE FUNCTION public.platform_ai_topics_within_limit(topics text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(bool_and(char_length(t) BETWEEN 1 AND 200), true)
  FROM unnest(topics) AS t;
$$;

ALTER TABLE public."platformAiSettings"
  DROP CONSTRAINT IF EXISTS "platformAiSettings_topic_length";
ALTER TABLE public."platformAiSettings"
  ADD CONSTRAINT "platformAiSettings_topic_length"
  CHECK (public.platform_ai_topics_within_limit("prohibitedTopics"));

INSERT INTO public."platformAiSettings" (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public."platformAiSettings" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."platformAiSettings" FROM anon;
REVOKE ALL ON public."platformAiSettings" FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public."platformAiSettings" TO authenticated;
GRANT ALL ON public."platformAiSettings" TO service_role;

DROP POLICY IF EXISTS "Admin reads platformAiSettings" ON public."platformAiSettings";
CREATE POLICY "Admin reads platformAiSettings" ON public."platformAiSettings"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Admin inserts platformAiSettings" ON public."platformAiSettings";
CREATE POLICY "Admin inserts platformAiSettings" ON public."platformAiSettings"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_settings_admin());

DROP POLICY IF EXISTS "Admin updates platformAiSettings" ON public."platformAiSettings";
CREATE POLICY "Admin updates platformAiSettings" ON public."platformAiSettings"
  FOR UPDATE TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

-- Audit field is set server-side; client-supplied values are ignored.
CREATE OR REPLACE FUNCTION public.platform_ai_settings_set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW."updatedBy" := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_ai_settings_set_updated_by ON public."platformAiSettings";
CREATE TRIGGER platform_ai_settings_set_updated_by
  BEFORE INSERT OR UPDATE ON public."platformAiSettings"
  FOR EACH ROW EXECUTE FUNCTION public.platform_ai_settings_set_updated_by();

DROP TRIGGER IF EXISTS update_platform_ai_settings_updated_at ON public."platformAiSettings";
CREATE TRIGGER update_platform_ai_settings_updated_at
  BEFORE UPDATE ON public."platformAiSettings"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
