-- NCLDD-31 §9 / CL-8 — Waitlist claim window 2 hours (was 24 hours).

CREATE OR REPLACE FUNCTION public.promote_next_group_waitlist(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public."groupCoachingSession"%ROWTYPE;
  v_registered integer;
  v_next public."groupSessionEnrollment"%ROWTYPE;
  v_used integer;
BEGIN
  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status <> 'scheduled' THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment"
    WHERE "sessionId" = p_session_id AND status = 'offered'
  ) THEN
    RETURN NULL;
  END IF;

  v_registered := public.group_session_registered_count(p_session_id);
  IF v_registered >= v_session.capacity THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_next
  FROM public."groupSessionEnrollment"
  WHERE "sessionId" = p_session_id AND status = 'waitlisted'
  ORDER BY "waitlistedAt" ASC NULLS LAST, "createdAt" ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(p."groupSessionsUsedThisMonth", 0) INTO v_used
  FROM public.profiles p
  WHERE p.id = v_next."userId";

  IF COALESCE(v_used, 0) >= 1 THEN
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now()
    WHERE id = v_next.id;
    RETURN public.promote_next_group_waitlist(p_session_id);
  END IF;

  -- Skip if user already has a monthly registered/offered elsewhere (OVR-028).
  IF EXISTS (
    SELECT 1 FROM public."groupSessionEnrollment" e
    WHERE e."userId" = v_next."userId"
      AND e."periodMonth" = v_next."periodMonth"
      AND e.id <> v_next.id
      AND e.status IN ('registered', 'offered')
  ) THEN
    UPDATE public."groupSessionEnrollment"
    SET status = 'cancelled', "cancelledAt" = now()
    WHERE id = v_next.id;
    RETURN public.promote_next_group_waitlist(p_session_id);
  END IF;

  UPDATE public."groupSessionEnrollment"
  SET status = 'offered',
      "claimExpiresAt" = now() + interval '2 hours',
      "offerNotifiedAt" = NULL
  WHERE id = v_next.id;

  RETURN v_next.id;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_next_group_waitlist(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_next_group_waitlist(UUID) TO service_role;

COMMENT ON FUNCTION public.promote_next_group_waitlist(UUID) IS
  'NCLDD-31 §9 / CL-8: promote next waitlisted user with a 2-hour claim window.';
