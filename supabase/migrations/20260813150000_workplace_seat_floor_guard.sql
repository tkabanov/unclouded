-- Part A §4 — DB seat-floor guard: block lowering flat_rate seatCount or
-- pay_per_active maxSeats below current enrolled headcount (mirrors Admin client).

CREATE OR REPLACE FUNCTION public.workplace_seat_floor_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active INTEGER;
  v_model TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW."seatCount" IS NOT DISTINCT FROM OLD."seatCount"
     AND NEW."maxSeats" IS NOT DISTINCT FROM OLD."maxSeats"
     AND NEW."billingModel" IS NOT DISTINCT FROM OLD."billingModel" THEN
    RETURN NEW;
  END IF;

  v_active := public.count_workplace_active_seats(NEW.id);
  v_model := lower(coalesce(NEW."billingModel", 'flat_rate'));

  IF v_model = 'flat_rate' AND coalesce(NEW."seatCount", 0) < v_active THEN
    RAISE EXCEPTION
      'Seat count cannot be below current enrolled members (%). Revoke members first.',
      v_active;
  END IF;

  IF v_model = 'pay_per_active'
     AND NEW."maxSeats" IS NOT NULL
     AND NEW."maxSeats" < v_active THEN
    RAISE EXCEPTION
      'Max seats cannot be below current enrolled members (%). Revoke members first.',
      v_active;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workplace_seat_floor ON public.workplace;
CREATE TRIGGER trg_workplace_seat_floor
  BEFORE UPDATE ON public.workplace
  FOR EACH ROW
  EXECUTE FUNCTION public.workplace_seat_floor_guard();

COMMENT ON FUNCTION public.workplace_seat_floor_guard() IS
  'Rejects workplace updates that lower flat_rate seatCount or pay_per_active maxSeats below enrolled members';
