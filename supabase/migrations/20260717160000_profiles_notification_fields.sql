-- TEMP §10 — module unlock + milestone notification stamps (Build Brief §13)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "lastNotificationSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "firstModuleMilestoneEmailedAt" TIMESTAMPTZ NULL;
