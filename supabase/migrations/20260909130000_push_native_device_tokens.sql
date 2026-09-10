-- MOB-08 — Native device tokens (FCM/APNs) alongside existing web-push rows.
--
-- Design choice: `endpoint`/`p256dh`/`auth` become NULLABLE and are used
-- exclusively by web-push rows (VAPID keys); native rows use the new
-- `"deviceToken"` column instead. A row-level CHECK enforces the split so a
-- `platform = 'web'` row can never exist without its VAPID keys and a native
-- row can never exist without a device token. This keeps
-- `_shared/webPushDelivery.ts` (which reads `endpoint/p256dh/auth`) working
-- unchanged for existing and new web rows — it simply never sees native rows.

ALTER TABLE public."pushDeviceSubscription"
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

ALTER TABLE public."pushDeviceSubscription"
  ADD COLUMN IF NOT EXISTS "deviceToken" TEXT,
  ADD COLUMN IF NOT EXISTS "appVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public."pushDeviceSubscription"
  DROP CONSTRAINT IF EXISTS push_device_subscription_platform_check;

ALTER TABLE public."pushDeviceSubscription"
  ADD CONSTRAINT push_device_subscription_platform_check
    CHECK (platform IN ('web', 'ios', 'android'));

ALTER TABLE public."pushDeviceSubscription"
  DROP CONSTRAINT IF EXISTS push_device_subscription_channel_shape_check;

ALTER TABLE public."pushDeviceSubscription"
  ADD CONSTRAINT push_device_subscription_channel_shape_check
    CHECK (
      (platform = 'web'
        AND endpoint IS NOT NULL AND p256dh IS NOT NULL AND auth IS NOT NULL
        AND "deviceToken" IS NULL)
      OR
      (platform IN ('ios', 'android')
        AND "deviceToken" IS NOT NULL
        AND endpoint IS NULL AND p256dh IS NULL AND auth IS NULL)
    );

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_device_subscription_device_token
  ON public."pushDeviceSubscription" ("deviceToken")
  WHERE "deviceToken" IS NOT NULL;

-- Existing owner-only RLS policies (public.userOwnsRow("userId")) already cover
-- every column on the row, native columns included — no policy change needed.
