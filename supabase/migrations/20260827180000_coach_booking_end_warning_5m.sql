-- NCLDD-31 §5 / CL-7 — 5-minute-before-end warning stamp on 1:1 bookings.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "endWarning5mSentAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "endWarning5mDetail" TEXT NULL;

COMMENT ON COLUMN public."coachBooking"."endWarning5mSentAt" IS
  'When the 5-minute-before-end user warning was attempted (idempotency stamp).';
COMMENT ON COLUMN public."coachBooking"."endWarning5mDetail" IS
  'SendGrid / skip detail for the 5-minute end warning attempt.';

CREATE INDEX IF NOT EXISTS idx_coach_booking_end_warning_5m_due
  ON public."coachBooking" ("scheduledAt")
  WHERE status = 'confirmed'
    AND "scheduledAt" IS NOT NULL
    AND "endWarning5mSentAt" IS NULL;
