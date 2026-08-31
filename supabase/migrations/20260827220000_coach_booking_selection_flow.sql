-- Coach selection booking flow: previous coaches list + anonymized slots for auto-match.

-- ---------------------------------------------------------------------------
-- Past coaches from completed or occurred (past) sessions for rebook UI
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_my_previous_one_on_one_coaches()
RETURNS TABLE (
  id UUID,
  name TEXT,
  "imageUrl" TEXT,
  bio TEXT,
  "isActive" BOOLEAN,
  "lastSessionAt" TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s."imageUrl",
    s.bio,
    s."isActive",
    MAX(b."scheduledAt") AS "lastSessionAt"
  FROM public."coachBooking" b
  INNER JOIN public."specialist" s ON s.id = b."specialistId"
  WHERE b."userId" = v_user_id
    AND b."specialistId" IS NOT NULL
    AND b."scheduledAt" IS NOT NULL
    AND (
      b.status = 'completed'
      OR (b.status = 'confirmed' AND b."scheduledAt" < now())
    )
  GROUP BY s.id, s.name, s."imageUrl", s.bio, s."isActive"
  ORDER BY MAX(b."scheduledAt") DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_previous_one_on_one_coaches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_previous_one_on_one_coaches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_previous_one_on_one_coaches() TO service_role;

-- ---------------------------------------------------------------------------
-- Anonymized consolidated bookable slots across active specialists (auto-match)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_bookable_one_on_one_slots_any_coach(
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
      AND gs >= now()
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
              b."scheduledAt" + make_interval(
                mins => COALESCE(b."durationMinutes", public.coach_booking_duration_minutes())
              ),
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

REVOKE ALL ON FUNCTION public.list_bookable_one_on_one_slots_any_coach(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bookable_one_on_one_slots_any_coach(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_bookable_one_on_one_slots_any_coach(TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;
