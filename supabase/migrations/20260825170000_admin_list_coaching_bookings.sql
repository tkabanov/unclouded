-- NCLDD-31 §10: unified admin list of 1:1 coach bookings + group enrollments.

CREATE OR REPLACE FUNCTION public.admin_list_coaching_bookings(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_user_query TEXT DEFAULT NULL,
  p_specialist_id UUID DEFAULT NULL,
  p_session_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
  v_q TEXT;
  v_type TEXT;
  v_status TEXT;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'forbidden', 'error', 'Admin only.');
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
  v_q := NULLIF(trim(COALESCE(p_user_query, '')), '');
  v_type := NULLIF(lower(trim(COALESCE(p_session_type, ''))), '');
  v_status := NULLIF(lower(trim(COALESCE(p_status, ''))), '');

  IF v_type IS NOT NULL AND v_type NOT IN ('oneonone', 'group') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_session_type', 'error', 'session type must be oneOnOne or group.');
  END IF;

  IF v_status IS NOT NULL AND v_status NOT IN ('scheduled', 'completed', 'canceled', 'cancelled', 'waitlisted') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_status', 'error', 'Unknown status filter.');
  END IF;

  IF v_status = 'cancelled' THEN
    v_status := 'canceled';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rows', COALESCE((
      WITH one_on_one AS (
        SELECT
          'oneOnOne'::text AS "rowKind",
          b.id,
          b."userId",
          p."firstName" AS "memberFirstName",
          p.email AS "memberEmail",
          b."scheduledAt" AS "startsAt",
          COALESCE(b."durationMinutes", 30) AS "durationMinutes",
          b.status AS status,
          CASE
            WHEN b.status IN ('confirmed', 'pending') THEN 'scheduled'
            WHEN b.status = 'completed' THEN 'completed'
            WHEN b.status = 'cancelled' THEN 'canceled'
            ELSE b.status
          END AS "displayStatus",
          b."specialistId",
          s.name AS "specialistName",
          b."assignedCoachEmail",
          b."meetLink",
          b."creditsRequired",
          CASE
            WHEN EXISTS (
              SELECT 1 FROM public."premiumCreditLedger" l
              WHERE l."coachBookingId" = b.id AND l.reason = 'reversal'
            ) THEN 'refunded'
            WHEN EXISTS (
              SELECT 1 FROM public."premiumCreditLedger" l
              WHERE l."coachBookingId" = b.id AND l.reason = 'redemption'
            ) THEN 'charged'
            WHEN EXISTS (
              SELECT 1 FROM public."premiumCreditLedger" l
              WHERE l."coachBookingId" = b.id AND l.reason = 'hold'
            )
            AND NOT EXISTS (
              SELECT 1 FROM public."premiumCreditLedger" l
              WHERE l."coachBookingId" = b.id AND l.reason = 'holdRelease'
            ) THEN 'held'
            WHEN b.status = 'cancelled' THEN 'no_refund'
            ELSE 'none'
          END AS "creditStatus",
          b."coachSessionNotes" AS notes,
          NULL::text AS "sessionTitle",
          NULL::uuid AS "sessionId",
          NULL::int AS "registeredCount",
          NULL::int AS capacity,
          NULL::timestamptz AS "claimExpiresAt",
          b."kotaRead",
          b."kotaReadJson",
          b."kotaReadEmailedAt",
          b."kotaReadEmailDetail",
          b."postSessionToken",
          b."postSessionSubmittedAt",
          b."completedAt",
          b."createdAt",
          b."cancelledAt"
        FROM public."coachBooking" b
        LEFT JOIN public.profiles p ON p.id = b."userId"
        LEFT JOIN public.specialist s ON s.id = b."specialistId"
        WHERE (v_type IS NULL OR v_type = 'oneonone')
          AND (p_from IS NULL OR b."scheduledAt" >= p_from)
          AND (p_to IS NULL OR b."scheduledAt" <= p_to)
          AND (p_specialist_id IS NULL OR b."specialistId" = p_specialist_id)
          AND (
            v_q IS NULL
            OR COALESCE(p."firstName", '') ILIKE '%' || v_q || '%'
            OR COALESCE(p.email, '') ILIKE '%' || v_q || '%'
          )
          AND (
            v_status IS NULL
            OR (
              v_status = 'scheduled' AND b.status IN ('confirmed', 'pending')
            )
            OR (v_status = 'completed' AND b.status = 'completed')
            OR (v_status = 'canceled' AND b.status = 'cancelled')
          )
      ),
      group_rows AS (
        SELECT
          'group'::text AS "rowKind",
          e.id,
          e."userId",
          p."firstName" AS "memberFirstName",
          p.email AS "memberEmail",
          gs."startsAt",
          gs."durationMinutes",
          e.status AS status,
          CASE
            WHEN e.status IN ('registered', 'offered') THEN 'scheduled'
            WHEN e.status = 'waitlisted' THEN 'waitlisted'
            WHEN e.status = 'cancelled' THEN 'canceled'
            ELSE e.status
          END AS "displayStatus",
          NULL::uuid AS "specialistId",
          NULL::text AS "specialistName",
          NULL::text AS "assignedCoachEmail",
          gs."meetLink",
          NULL::int AS "creditsRequired",
          'not_applicable'::text AS "creditStatus",
          NULL::text AS notes,
          gs.title AS "sessionTitle",
          gs.id AS "sessionId",
          (
            SELECT COUNT(*)::int
            FROM public."groupSessionEnrollment" e2
            WHERE e2."sessionId" = gs.id AND e2.status = 'registered'
          ) AS "registeredCount",
          gs.capacity,
          e."claimExpiresAt",
          NULL::text AS "kotaRead",
          NULL::jsonb AS "kotaReadJson",
          NULL::timestamptz AS "kotaReadEmailedAt",
          NULL::text AS "kotaReadEmailDetail",
          NULL::uuid AS "postSessionToken",
          NULL::timestamptz AS "postSessionSubmittedAt",
          NULL::timestamptz AS "completedAt",
          e."createdAt",
          e."cancelledAt"
        FROM public."groupSessionEnrollment" e
        JOIN public."groupCoachingSession" gs ON gs.id = e."sessionId"
        LEFT JOIN public.profiles p ON p.id = e."userId"
        WHERE (v_type IS NULL OR v_type = 'group')
          AND p_specialist_id IS NULL
          AND (p_from IS NULL OR gs."startsAt" >= p_from)
          AND (p_to IS NULL OR gs."startsAt" <= p_to)
          AND (
            v_q IS NULL
            OR COALESCE(p."firstName", '') ILIKE '%' || v_q || '%'
            OR COALESCE(p.email, '') ILIKE '%' || v_q || '%'
          )
          AND (
            v_status IS NULL
            OR (
              v_status = 'scheduled' AND e.status IN ('registered', 'offered')
            )
            OR (v_status = 'waitlisted' AND e.status = 'waitlisted')
            OR (v_status = 'canceled' AND e.status = 'cancelled')
            OR (v_status = 'completed' AND FALSE)
          )
      ),
      combined AS (
        SELECT * FROM one_on_one
        UNION ALL
        SELECT * FROM group_rows
      )
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c."startsAt" DESC NULLS LAST, c."createdAt" DESC)
      FROM (
        SELECT * FROM combined
        ORDER BY "startsAt" DESC NULLS LAST, "createdAt" DESC
        LIMIT v_limit
      ) c
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_coaching_bookings(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_coaching_bookings(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_coaching_bookings(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT
) TO service_role;

COMMENT ON FUNCTION public.admin_list_coaching_bookings(
  TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT
) IS
  'NCLDD-31 §10: settings-admin unified list of 1:1 bookings and group enrollments with filters.';
