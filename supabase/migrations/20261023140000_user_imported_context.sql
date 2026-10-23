-- NCLDD-63 (OVR-081): "Help Kota Know You Faster" — user-imported background text.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL. Additive only.
--
-- One row per user: raw text the user pasted or imported from files (other AI assistants,
-- personality test results, a self-description). A row exists only with consent: saving requires
-- p_consent = true, and withdrawing consent means deleting the row. The chat edge function reads
-- it with the user's JWT (owner SELECT) and adds it to the coaching prompt.
-- Writes go only through the RPCs below so the consent rule cannot be bypassed via PostgREST.

CREATE TABLE IF NOT EXISTS public."userImportedContext" (
  "userId" uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 10000),
  "consentVersion" integer NOT NULL CHECK ("consentVersion" >= 1),
  "consentGrantedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."userImportedContext" IS
  'NCLDD-63: user-imported background text used to personalize coaching (exists only with consent).';

ALTER TABLE public."userImportedContext" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."userImportedContext" FROM anon, authenticated;
GRANT SELECT ON public."userImportedContext" TO authenticated;
GRANT ALL ON public."userImportedContext" TO service_role;

DROP POLICY IF EXISTS "Owner selects userImportedContext" ON public."userImportedContext";
CREATE POLICY "Owner selects userImportedContext" ON public."userImportedContext"
  FOR SELECT TO authenticated
  USING (auth.uid() = "userId");

/** Saves (insert or replace) the caller's imported text. Consent is mandatory. */
CREATE OR REPLACE FUNCTION public.save_my_imported_context(
  p_content text,
  p_consent boolean,
  p_consent_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_content text := btrim(coalesce(p_content, ''));
  v_updated timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not signed in.');
  END IF;
  IF p_consent IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Consent is required to save this information.');
  END IF;
  IF p_consent_version IS NULL OR p_consent_version < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid consent version.');
  END IF;
  IF char_length(v_content) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Add some text before saving.');
  END IF;
  IF char_length(v_content) > 10000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Text is too long (10,000 characters max).');
  END IF;

  INSERT INTO public."userImportedContext" AS t
    ("userId", content, "consentVersion", "consentGrantedAt", "updatedAt")
  VALUES (v_uid, v_content, p_consent_version, now(), now())
  ON CONFLICT ("userId") DO UPDATE
    SET content = EXCLUDED.content,
        "consentVersion" = EXCLUDED."consentVersion",
        "consentGrantedAt" = EXCLUDED."consentGrantedAt",
        "updatedAt" = now()
  RETURNING t."updatedAt" INTO v_updated;

  RETURN jsonb_build_object('ok', true, 'updatedAt', v_updated);
END;
$$;

/** Deletes the caller's imported text (also how consent is withdrawn). */
CREATE OR REPLACE FUNCTION public.delete_my_imported_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not signed in.');
  END IF;
  DELETE FROM public."userImportedContext" WHERE "userId" = v_uid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_imported_context(text, boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_imported_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_imported_context(text, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_imported_context() TO authenticated;
