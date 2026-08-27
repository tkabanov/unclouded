-- NCLDD-31 §1 — Coach timezone (CL-4 / G1) + deactivation guard (CL-10).

ALTER TABLE public."specialist"
  ADD COLUMN IF NOT EXISTS timezone TEXT NULL;

COMMENT ON COLUMN public."specialist".timezone IS
  'IANA timezone for coach-facing emails (CL-4). Empty → UTC fallback in mailers.';

/**
 * Toggle specialist isActive. Deactivation blocked while upcoming 1:1 bookings remain (CL-10).
 * Warning copy must match product/docs exactly.
 */
CREATE OR REPLACE FUNCTION public.admin_set_specialist_active(
  p_specialist_id UUID,
  p_is_active BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upcoming integer := 0;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_specialist_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'specialist_id_required',
      'error', 'Specialist id is required.'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public."specialist" WHERE id = p_specialist_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'specialist_not_found',
      'error', 'Specialist not found.'
    );
  END IF;

  IF p_is_active IS FALSE THEN
    SELECT COUNT(*)::integer INTO v_upcoming
    FROM public."coachBooking"
    WHERE "specialistId" = p_specialist_id
      AND status IN ('pending', 'confirmed')
      AND "scheduledAt" IS NOT NULL
      AND "scheduledAt" > now();

    IF v_upcoming > 0 THEN
      RAISE EXCEPTION
        'This coach has % upcoming sessions. Please reassign or cancel them before deactivating.',
        v_upcoming;
    END IF;
  END IF;

  UPDATE public."specialist"
  SET "isActive" = p_is_active
  WHERE id = p_specialist_id;

  RETURN jsonb_build_object(
    'ok', true,
    'specialistId', p_specialist_id,
    'isActive', p_is_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_specialist_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_specialist_active(UUID, BOOLEAN) TO service_role;

/**
 * Defense in depth: block direct UPDATE of isActive → false when upcoming bookings exist.
 * Mirrors admin_set_specialist_active so form updates cannot bypass CL-10.
 */
CREATE OR REPLACE FUNCTION public.specialist_block_deactivate_with_upcoming()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upcoming integer := 0;
BEGIN
  IF OLD."isActive" IS TRUE AND NEW."isActive" IS FALSE THEN
    SELECT COUNT(*)::integer INTO v_upcoming
    FROM public."coachBooking"
    WHERE "specialistId" = NEW.id
      AND status IN ('pending', 'confirmed')
      AND "scheduledAt" IS NOT NULL
      AND "scheduledAt" > now();

    IF v_upcoming > 0 THEN
      RAISE EXCEPTION
        'This coach has % upcoming sessions. Please reassign or cancel them before deactivating.',
        v_upcoming;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS specialist_block_deactivate_with_upcoming ON public."specialist";
CREATE TRIGGER specialist_block_deactivate_with_upcoming
  BEFORE UPDATE OF "isActive" ON public."specialist"
  FOR EACH ROW
  EXECUTE FUNCTION public.specialist_block_deactivate_with_upcoming();
