-- EAC-B-MEM-006 / EAC-B-SEAT-002: pending email invites must use the same
-- enrollment gate as enroll_profile_in_workplace (isActive, contract dates,
-- hard seat cap). Previously those checks ran only when assigning an existing
-- profile; unknown emails wrote workplaceInvitation and sent mail anyway.

CREATE OR REPLACE FUNCTION public.assign_workplace_member_by_email(
  p_workplace_id UUID,
  p_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
  v_normalized_email text := lower(btrim(coalesce(p_email, '')));
  v_invitation_id uuid;
  v_result jsonb;
  v_workplace public.workplace%ROWTYPE;
  v_active_seats integer;
  v_hard_limit integer;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_normalized_email = '' OR position('@' in v_normalized_email) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a valid email address.', 'status', 400);
  END IF;

  SELECT p.id
  INTO v_target_user_id
  FROM public.profiles p
  WHERE lower(btrim(coalesce(p.email, ''))) = v_normalized_email
  LIMIT 1;

  IF v_target_user_id IS NOT NULL THEN
    v_result := public.enroll_profile_in_workplace(p_workplace_id, v_target_user_id);
    IF coalesce(v_result->>'ok', 'false') <> 'true' THEN
      RETURN v_result;
    END IF;
    RETURN v_result || jsonb_build_object('mode', 'assigned');
  END IF;

  SELECT w.*
  INTO v_workplace
  FROM public.workplace w
  WHERE w.id = p_workplace_id
  FOR UPDATE;

  IF NOT FOUND OR v_workplace."isActive" IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractStartDate" IS NOT NULL AND v_workplace."contractStartDate" > v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractEndDate" IS NOT NULL AND v_workplace."contractEndDate" < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  SELECT public.count_workplace_active_seats(p_workplace_id) INTO v_active_seats;
  v_hard_limit := public.workplace_hard_seat_limit(
    v_workplace."billingModel",
    v_workplace."seatCount",
    v_workplace."maxSeats"
  );

  IF v_hard_limit IS NOT NULL AND v_active_seats >= v_hard_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Organization seats are full.',
      'status', 409
    );
  END IF;

  UPDATE public."workplaceInvitation"
  SET status = 'cancelled',
      "cancelledAt" = now()
  WHERE "workplaceId" = p_workplace_id
    AND lower(btrim(email)) = v_normalized_email
    AND status = 'pending';

  INSERT INTO public."workplaceInvitation" (
    "workplaceId",
    email,
    "invitedByUserId",
    status
  )
  VALUES (
    p_workplace_id,
    v_normalized_email,
    auth.uid(),
    'pending'
  )
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'invited',
    'invitationId', v_invitation_id,
    'email', v_normalized_email
  );
END;
$$;
