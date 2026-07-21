-- REQ-13 — DB-backed prompt library versions, layers, test runs, approvals.

CREATE TABLE IF NOT EXISTS public."promptLibraryVersion" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'production')),
  label TEXT NOT NULL,
  "createdBy" UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  "approvedAt" TIMESTAMPTZ NULL,
  "promotedAt" TIMESTAMPTZ NULL,
  "gitSha" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_library_one_production
  ON public."promptLibraryVersion" (status)
  WHERE status = 'production';

CREATE TABLE IF NOT EXISTS public."promptLibraryLayer" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "versionId" UUID NOT NULL REFERENCES public."promptLibraryVersion"(id) ON DELETE CASCADE,
  "layerKey" TEXT NOT NULL,
  content TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("versionId", "layerKey")
);

CREATE INDEX IF NOT EXISTS idx_prompt_library_layer_version
  ON public."promptLibraryLayer" ("versionId");

CREATE TABLE IF NOT EXISTS public."promptLibraryTestRun" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "versionId" UUID NOT NULL REFERENCES public."promptLibraryVersion"(id) ON DELETE CASCADE,
  "adminUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "runAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "resultsJson" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "flaggedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."promptLibraryApproval" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "testRunId" UUID NOT NULL UNIQUE REFERENCES public."promptLibraryTestRun"(id) ON DELETE CASCADE,
  "versionId" UUID NOT NULL REFERENCES public."promptLibraryVersion"(id) ON DELETE CASCADE,
  "approverUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT NULL,
  "overrideReason" TEXT NULL,
  "approvedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."promptLibraryVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."promptLibraryLayer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."promptLibraryTestRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."promptLibraryApproval" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public."promptLibraryVersion" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."promptLibraryLayer" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."promptLibraryTestRun" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."promptLibraryApproval" TO authenticated;
GRANT ALL ON public."promptLibraryVersion" TO service_role;
GRANT ALL ON public."promptLibraryLayer" TO service_role;
GRANT ALL ON public."promptLibraryTestRun" TO service_role;
GRANT ALL ON public."promptLibraryApproval" TO service_role;

CREATE OR REPLACE FUNCTION public.is_settings_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p."roleType" = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_settings_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin manages promptLibraryVersion" ON public."promptLibraryVersion";
CREATE POLICY "Admin manages promptLibraryVersion" ON public."promptLibraryVersion"
  FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

DROP POLICY IF EXISTS "Admin manages promptLibraryLayer" ON public."promptLibraryLayer";
CREATE POLICY "Admin manages promptLibraryLayer" ON public."promptLibraryLayer"
  FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

DROP POLICY IF EXISTS "Admin manages promptLibraryTestRun" ON public."promptLibraryTestRun";
CREATE POLICY "Admin manages promptLibraryTestRun" ON public."promptLibraryTestRun"
  FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

DROP POLICY IF EXISTS "Admin manages promptLibraryApproval" ON public."promptLibraryApproval";
CREATE POLICY "Admin manages promptLibraryApproval" ON public."promptLibraryApproval"
  FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

DROP TRIGGER IF EXISTS update_prompt_library_version_updated_at ON public."promptLibraryVersion";
CREATE TRIGGER update_prompt_library_version_updated_at
  BEFORE UPDATE ON public."promptLibraryVersion"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompt_library_layer_updated_at ON public."promptLibraryLayer";
CREATE TRIGGER update_prompt_library_layer_updated_at
  BEFORE UPDATE ON public."promptLibraryLayer"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
