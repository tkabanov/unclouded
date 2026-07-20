-- REQ-07 — Web Push subscriptions for vulnerable outreach (and future notifications).

CREATE TABLE IF NOT EXISTS public."pushDeviceSubscription" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  "userAgent" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT push_device_subscription_platform_check
    CHECK (platform IN ('web'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_device_subscription_endpoint
  ON public."pushDeviceSubscription" (endpoint);

CREATE INDEX IF NOT EXISTS idx_push_device_subscription_user
  ON public."pushDeviceSubscription" ("userId");

ALTER TABLE public."pushDeviceSubscription" ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public."pushDeviceSubscription" TO authenticated;
GRANT ALL ON public."pushDeviceSubscription" TO service_role;

DROP POLICY IF EXISTS "Owner selects pushDeviceSubscription" ON public."pushDeviceSubscription";
CREATE POLICY "Owner selects pushDeviceSubscription" ON public."pushDeviceSubscription"
  FOR SELECT TO authenticated USING (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner inserts pushDeviceSubscription" ON public."pushDeviceSubscription";
CREATE POLICY "Owner inserts pushDeviceSubscription" ON public."pushDeviceSubscription"
  FOR INSERT TO authenticated WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner updates pushDeviceSubscription" ON public."pushDeviceSubscription";
CREATE POLICY "Owner updates pushDeviceSubscription" ON public."pushDeviceSubscription"
  FOR UPDATE TO authenticated
  USING (public.userOwnsRow("userId"))
  WITH CHECK (public.userOwnsRow("userId"));

DROP POLICY IF EXISTS "Owner deletes pushDeviceSubscription" ON public."pushDeviceSubscription";
CREATE POLICY "Owner deletes pushDeviceSubscription" ON public."pushDeviceSubscription"
  FOR DELETE TO authenticated USING (public.userOwnsRow("userId"));

DROP TRIGGER IF EXISTS update_push_device_subscription_updated_at ON public."pushDeviceSubscription";
CREATE TRIGGER update_push_device_subscription_updated_at
  BEFORE UPDATE ON public."pushDeviceSubscription"
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
