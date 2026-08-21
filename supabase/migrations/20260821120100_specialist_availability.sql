-- NCLDD-31 §2 — Specialist availability windows, booking FK, anonymized slots RPC.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public."specialistAvailability" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "specialistId" UUID NOT NULL REFERENCES public."specialist"(id) ON DELETE CASCADE,
  "startsAt" TIMESTAMPTZ NOT NULL,
  "endsAt" TIMESTAMPTZ NOT NULL,
  "durationMinutes" INT NOT NULL DEFAULT 30
    CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 180),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ("endsAt" > "startsAt"),
  CONSTRAINT specialist_availability_no_overlap
    EXCLUDE USING gist (
      "specialistId" WITH =,
      tstzrange("startsAt", "endsAt", '[)') WITH &&
    )
);

CREATE INDEX idx_specialist_availability_specialist_starts
  ON public."specialistAvailability" ("specialistId", "startsAt");

ALTER TABLE public."specialistAvailability" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings admins select specialist availability"
  ON public."specialistAvailability"
  FOR SELECT
  TO authenticated
  USING (public.is_settings_admin());

CREATE POLICY "Settings admins insert specialist availability"
  ON public."specialistAvailability"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins update specialist availability"
  ON public."specialistAvailability"
  FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins delete specialist availability"
  ON public."specialistAvailability"
  FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."specialistAvailability" TO authenticated;
GRANT ALL ON public."specialistAvailability" TO service_role;

DROP TRIGGER IF EXISTS update_specialist_availability_updated_at ON public."specialistAvailability";
CREATE TRIGGER update_specialist_availability_updated_at
  BEFORE UPDATE ON public."specialistAvailability"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public."coachBooking"
  ADD COLUMN IF NOT EXISTS "specialistId" UUID NULL
    REFERENCES public."specialist"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coach_booking_specialist_scheduled
  ON public."coachBooking" ("specialistId", "scheduledAt")
  WHERE "specialistId" IS NOT NULL AND status <> 'cancelled';

-- Default duration used when coachBooking has no stored duration yet (§3).
CREATE OR REPLACE FUNCTION public.coach_booking_duration_minutes()
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 30;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_specialist_availability(
  p_id UUID,
  p_specialist_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_duration_minutes INT DEFAULT 30
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_active BOOLEAN;
  v_window_minutes INT;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'endsAt must be after startsAt';
  END IF;

  IF p_duration_minutes IS NULL
     OR p_duration_minutes <= 0
     OR p_duration_minutes > 180 THEN
    RAISE EXCEPTION 'durationMinutes must be between 1 and 180';
  END IF;

  v_window_minutes := GREATEST(
    1,
    FLOOR(EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 60)::INT
  );
  IF v_window_minutes % p_duration_minutes <> 0 THEN
    RAISE EXCEPTION 'availability window must be a multiple of durationMinutes';
  END IF;

  SELECT s."isActive" INTO v_active
  FROM public."specialist" s
  WHERE s.id = p_specialist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'specialist not found';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'specialist is inactive';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public."specialistAvailability" (
      "specialistId", "startsAt", "endsAt", "durationMinutes"
    )
    VALUES (p_specialist_id, p_starts_at, p_ends_at, p_duration_minutes)
    RETURNING id INTO v_id;
  ELSE
    -- Block shrinking away from existing bookings on this specialist that currently sit in the old window.
    IF EXISTS (
      SELECT 1
      FROM public."specialistAvailability" a
      JOIN public."coachBooking" b
        ON b."specialistId" = a."specialistId"
       AND b.status IN ('pending', 'confirmed')
       AND b."scheduledAt" IS NOT NULL
       AND tstzrange(
             b."scheduledAt",
             b."scheduledAt" + make_interval(mins => public.coach_booking_duration_minutes()),
             '[)'
           )
           && tstzrange(a."startsAt", a."endsAt", '[)')
      WHERE a.id = p_id
        AND NOT (
          tstzrange(p_starts_at, p_ends_at, '[)')
            @> tstzrange(
              b."scheduledAt",
              b."scheduledAt" + make_interval(mins => public.coach_booking_duration_minutes()),
              '[)'
            )
        )
    ) THEN
      RAISE EXCEPTION 'cannot change availability that would uncover an existing booking';
    END IF;

    UPDATE public."specialistAvailability"
    SET
      "specialistId" = p_specialist_id,
      "startsAt" = p_starts_at,
      "endsAt" = p_ends_at,
      "durationMinutes" = p_duration_minutes
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'availability not found';
    END IF;
  END IF;

  RETURN v_id;
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'availability overlaps an existing slot for this specialist';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_specialist_availability(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."specialistAvailability" a
    JOIN public."coachBooking" b
      ON b."specialistId" = a."specialistId"
     AND b.status IN ('pending', 'confirmed')
     AND b."scheduledAt" IS NOT NULL
     AND tstzrange(
           b."scheduledAt",
           b."scheduledAt" + make_interval(mins => public.coach_booking_duration_minutes()),
           '[)'
         )
         && tstzrange(a."startsAt", a."endsAt", '[)')
    WHERE a.id = p_id
  ) THEN
    RAISE EXCEPTION 'cannot delete availability that covers an existing booking';
  END IF;

  DELETE FROM public."specialistAvailability" WHERE id = p_id;
END;
$$;

-- Anonymized consolidated bookable slots across active specialists (no specialist identity).
CREATE OR REPLACE FUNCTION public.list_bookable_one_on_one_slots(
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE (
  "slotStart" TIMESTAMPTZ,
  "slotEnd" TIMESTAMPTZ,
  "durationMinutes" INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_to <= p_from THEN
    RAISE EXCEPTION 'invalid range';
  END IF;

  RETURN QUERY
  WITH windows AS (
    SELECT
      a."specialistId",
      a."startsAt",
      a."endsAt",
      a."durationMinutes"
    FROM public."specialistAvailability" a
    INNER JOIN public."specialist" s ON s.id = a."specialistId"
    WHERE s."isActive" = true
      AND a."endsAt" > p_from
      AND a."startsAt" < p_to
  ),
  slots AS (
    SELECT
      w."specialistId",
      w."durationMinutes",
      gs AS slot_start,
      gs + make_interval(mins => w."durationMinutes") AS slot_end
    FROM windows w
    CROSS JOIN LATERAL generate_series(
      w."startsAt",
      w."endsAt" - make_interval(mins => w."durationMinutes"),
      make_interval(mins => w."durationMinutes")
    ) AS gs
    WHERE gs >= p_from
      AND gs + make_interval(mins => w."durationMinutes") <= p_to
  ),
  free_slots AS (
    SELECT s.slot_start, s.slot_end, s."durationMinutes"
    FROM slots s
    WHERE NOT EXISTS (
      SELECT 1
      FROM public."coachBooking" b
      WHERE b."specialistId" = s."specialistId"
        AND b.status IN ('pending', 'confirmed')
        AND b."scheduledAt" IS NOT NULL
        AND tstzrange(
              b."scheduledAt",
              b."scheduledAt" + make_interval(mins => public.coach_booking_duration_minutes()),
              '[)'
            )
            && tstzrange(s.slot_start, s.slot_end, '[)')
    )
  )
  SELECT DISTINCT ON (fs.slot_start, fs."durationMinutes")
    fs.slot_start AS "slotStart",
    fs.slot_end AS "slotEnd",
    fs."durationMinutes"
  FROM free_slots fs
  ORDER BY fs.slot_start, fs."durationMinutes";
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_specialist_availability(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_specialist_availability(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.coach_booking_duration_minutes()
  TO authenticated;

GRANT ALL ON FUNCTION public.admin_upsert_specialist_availability(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INT)
  TO service_role;
GRANT ALL ON FUNCTION public.admin_delete_specialist_availability(UUID)
  TO service_role;
GRANT ALL ON FUNCTION public.list_bookable_one_on_one_slots(TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
