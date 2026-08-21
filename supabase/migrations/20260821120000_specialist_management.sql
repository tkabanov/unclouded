-- NCLDD-31 §1 — Specialist roster (no Auth accounts) + profile image storage.

CREATE TABLE public."specialist" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  "imageUrl" TEXT NULL,
  bio TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT specialist_email_unique UNIQUE (email)
);

CREATE INDEX idx_specialist_is_active ON public."specialist" ("isActive");

ALTER TABLE public."specialist" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings admins select specialists"
  ON public."specialist"
  FOR SELECT
  TO authenticated
  USING (public.is_settings_admin());

CREATE POLICY "Settings admins insert specialists"
  ON public."specialist"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins update specialists"
  ON public."specialist"
  FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins delete specialists"
  ON public."specialist"
  FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."specialist" TO authenticated;
GRANT ALL ON public."specialist" TO service_role;

DROP TRIGGER IF EXISTS update_specialist_updated_at ON public."specialist";
CREATE TRIGGER update_specialist_updated_at
  BEFORE UPDATE ON public."specialist"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Public read / admin write for specialist profile images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'specialist-images',
  'specialist-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public reads specialist images" ON storage.objects;
CREATE POLICY "Public reads specialist images" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'specialist-images');

DROP POLICY IF EXISTS "Settings admins insert specialist images" ON storage.objects;
CREATE POLICY "Settings admins insert specialist images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'specialist-images'
    AND public.is_settings_admin()
  );

DROP POLICY IF EXISTS "Settings admins update specialist images" ON storage.objects;
CREATE POLICY "Settings admins update specialist images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'specialist-images'
    AND public.is_settings_admin()
  )
  WITH CHECK (
    bucket_id = 'specialist-images'
    AND public.is_settings_admin()
  );

DROP POLICY IF EXISTS "Settings admins delete specialist images" ON storage.objects;
CREATE POLICY "Settings admins delete specialist images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'specialist-images'
    AND public.is_settings_admin()
  );
