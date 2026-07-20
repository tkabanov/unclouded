-- Block 3.35 — admin visibility + coach inbox delivery tracking for Kota's Read.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "kotaReadEmailedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "kotaReadEmailDetail" TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_booking_created_at
  ON public."coachBooking" ("createdAt" DESC);

DROP POLICY IF EXISTS "Settings admin selects coachBooking" ON public."coachBooking";
CREATE POLICY "Settings admin selects coachBooking" ON public."coachBooking"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());
