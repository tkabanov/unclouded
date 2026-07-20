-- REQ-11 — manager ↔ direct report links (scoped team aggregate, not whole workplace).

CREATE TABLE IF NOT EXISTS public."managerDirectReport" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "managerUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "reportUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "workplaceId" UUID NOT NULL REFERENCES public.workplace(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT manager_direct_report_distinct_pair UNIQUE ("managerUserId", "reportUserId"),
  CONSTRAINT manager_direct_report_not_self CHECK ("managerUserId" <> "reportUserId")
);

CREATE INDEX IF NOT EXISTS idx_manager_direct_report_manager
  ON public."managerDirectReport" ("managerUserId");

CREATE INDEX IF NOT EXISTS idx_manager_direct_report_workplace
  ON public."managerDirectReport" ("workplaceId");

ALTER TABLE public."managerDirectReport" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public."managerDirectReport" TO authenticated;
GRANT ALL ON public."managerDirectReport" TO service_role;

DROP POLICY IF EXISTS "Manager selects own direct reports" ON public."managerDirectReport";
CREATE POLICY "Manager selects own direct reports" ON public."managerDirectReport"
  FOR SELECT TO authenticated
  USING (public.userOwnsRow("managerUserId"));

DROP POLICY IF EXISTS "Settings admin manages managerDirectReport" ON public."managerDirectReport";
CREATE POLICY "Settings admin manages managerDirectReport" ON public."managerDirectReport"
  FOR ALL TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());
