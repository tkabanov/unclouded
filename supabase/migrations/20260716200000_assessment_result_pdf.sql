-- Section 3: PuP 360 PDF report columns + private storage bucket.

ALTER TABLE public."assessmentResult"
  ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "pdfNarrative" JSONB NULL;

GRANT UPDATE ON public."assessmentResult" TO authenticated;

DROP POLICY IF EXISTS "Owner updates assessmentResult" ON public."assessmentResult";
CREATE POLICY "Owner updates assessmentResult" ON public."assessmentResult"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (public.userOwnsRow("userId"));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pup-pdf-reports',
  'pup-pdf-reports',
  false,
  5242880,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Owner reads own pup pdf reports" ON storage.objects;
CREATE POLICY "Owner reads own pup pdf reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pup-pdf-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner inserts own pup pdf reports" ON storage.objects;
CREATE POLICY "Owner inserts own pup pdf reports" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pup-pdf-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner updates own pup pdf reports" ON storage.objects;
CREATE POLICY "Owner updates own pup pdf reports" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pup-pdf-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'pup-pdf-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owner deletes own pup pdf reports" ON storage.objects;
CREATE POLICY "Owner deletes own pup pdf reports" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pup-pdf-reports'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
