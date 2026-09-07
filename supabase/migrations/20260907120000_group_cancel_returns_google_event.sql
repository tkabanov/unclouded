-- NCLDD-31 §7 / CL-6 — admin group cancel returns calendar ids for edge side effects.
-- Mirrors cancel_one_on_one_booking: the RPC owns the transaction, the edge
-- function deletes the Calendar event with the id it hands back. Without this
-- the session was cancelled in-platform while its Meet room stayed joinable.

CREATE OR REPLACE FUNCTION public.admin_cancel_group_coaching_session(p_session_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public."groupCoachingSession"%ROWTYPE;
  v_notify jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session
  FROM public."groupCoachingSession"
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND OR v_session.status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'userId', e."userId",
        'email', p.email,
        'firstName', p."firstName",
        'timeZone', p."timeZone",
        'enrollmentStatus', e.status
      )
      ORDER BY e."createdAt"
    ),
    '[]'::jsonb
  )
  INTO v_notify
  FROM public."groupSessionEnrollment" e
  LEFT JOIN public.profiles p ON p.id = e."userId"
  WHERE e."sessionId" = p_session_id
    AND e.status IN ('registered', 'waitlisted', 'offered');

  -- Reset monthly counter for users who held a seat / offer (CL-6).
  UPDATE public.profiles p
  SET "groupSessionsUsedThisMonth" = 0
  WHERE p.id IN (
    SELECT e."userId"
    FROM public."groupSessionEnrollment" e
    WHERE e."sessionId" = p_session_id
      AND e.status IN ('registered', 'offered')
  );

  UPDATE public."groupCoachingSession"
  SET status = 'cancelled', "cancelledAt" = now()
  WHERE id = p_session_id;

  UPDATE public."groupSessionEnrollment"
  SET status = 'cancelled', "cancelledAt" = now(), "claimExpiresAt" = NULL
  WHERE "sessionId" = p_session_id
    AND status IN ('registered', 'waitlisted', 'offered');

  -- meetLink / googleEventId stay on the row after cancel (BK-GMEET-003).
  RETURN jsonb_build_object(
    'ok', true,
    'sessionId', p_session_id,
    'title', v_session.title,
    'startsAt', v_session."startsAt",
    'durationMinutes', v_session."durationMinutes",
    'googleEventId', v_session."googleEventId",
    'meetLink', v_session."meetLink",
    'notifyMembers', v_notify
  );
END;
$$;

COMMENT ON FUNCTION public.admin_cancel_group_coaching_session(UUID) IS
  'NCLDD-31 CL-6: admin cancels a group session; resets monthly counters; returns googleEventId for Calendar delete.';

REVOKE ALL ON FUNCTION public.admin_cancel_group_coaching_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_group_coaching_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_group_coaching_session(UUID) TO service_role;
