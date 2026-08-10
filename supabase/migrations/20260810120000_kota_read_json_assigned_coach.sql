-- Prompt 6 parity: store Kota's Read as JSON; assigned coach email for delivery.

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "kotaReadJson" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "assignedCoachEmail" TEXT NULL;

ALTER TABLE public."groupSessionBooking"
  ADD COLUMN IF NOT EXISTS "kotaReadJson" JSONB NULL,
  ADD COLUMN IF NOT EXISTS "assignedCoachEmail" TEXT NULL;

COMMENT ON COLUMN public."coachBooking"."kotaReadJson" IS
  'Prompt 6 Kota''s Read JSON (patterns_observed, not_yet_reached, be_careful_about, most_important_now, confidence_note). Canonical storage; kotaRead TEXT is legacy.';

COMMENT ON COLUMN public."coachBooking"."assignedCoachEmail" IS
  'Email of the assigned human coach for pre-session brief delivery. Falls back to COACH_BRIEF_INBOX when null.';

COMMENT ON COLUMN public."groupSessionBooking"."kotaReadJson" IS
  'Prompt 6 Kota''s Read JSON for group session bookings.';

COMMENT ON COLUMN public."groupSessionBooking"."assignedCoachEmail" IS
  'Email of the assigned human coach for group session brief delivery.';

-- Admin may set assigned coach email (and table) on either booking type.
CREATE OR REPLACE FUNCTION public.admin_set_coach_booking_email(
  p_booking_id UUID,
  p_assigned_coach_email TEXT,
  p_booking_table TEXT DEFAULT 'coachBooking'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_table TEXT;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  v_table := CASE
    WHEN p_booking_table = 'groupSessionBooking' THEN 'groupSessionBooking'
    ELSE 'coachBooking'
  END;

  v_email := NULLIF(trim(p_assigned_coach_email), '');
  IF v_email IS NOT NULL AND position('@' IN v_email) = 0 THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;

  IF v_table = 'groupSessionBooking' THEN
    UPDATE public."groupSessionBooking"
    SET "assignedCoachEmail" = v_email
    WHERE id = p_booking_id;
  ELSE
    UPDATE public."coachBooking"
    SET "assignedCoachEmail" = v_email
    WHERE id = p_booking_id;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_coach_booking_email(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_coach_booking_email(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_coach_booking_email(UUID, TEXT, TEXT) TO service_role;
