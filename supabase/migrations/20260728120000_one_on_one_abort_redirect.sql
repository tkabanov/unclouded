-- SUB-BOOK-008: let the member release a pending 1:1 hold when the calendar redirect fails.

CREATE OR REPLACE FUNCTION public.abort_my_one_on_one_booking_redirect(p_booking_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public."coachBooking"%ROWTYPE;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_booking_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_required');
  END IF;

  SELECT * INTO v_booking
  FROM public."coachBooking"
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_found');
  END IF;

  IF v_booking."userId" <> v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden');
  END IF;

  IF v_booking.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_pending');
  END IF;

  v_result := public.release_one_on_one_booking_hold(
    p_booking_id,
    'Calendar redirect failed — credits returned.'
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.abort_my_one_on_one_booking_redirect(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.abort_my_one_on_one_booking_redirect(UUID) TO authenticated;
