-- NCLDD-56 slice 6: admin referral analytics.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
-- Depends on 20261013150000..20261013190000.
--
-- Settings-admin-only RPCs (is_settings_admin(), 42501 otherwise):
--   * admin_get_user_referral_stats — B2C activity of one user: invited (accounts created with the
--     user's link), registered (email confirmed), paid Pro/Premium (a recorded qualifying
--     payment), referral coach credits earned / used / taken back / available. Link visits
--     are reported separately and are never counted as conversions.
--   * admin_referral_partner_metrics — one row per partner to compare: sign-ups, confirmed,
--     paying clients, payments, payments waiting for terms, net accrued commission per currency,
--     current terms, linked account.
--   * admin_get_referral_partner_program — terms history, linked account and per-client
--     commissions for one partner.
-- admin_list_coaching_bookings (latest body from 20260827190000) also returns "paymentSource"
-- and reports refunds of referral-credit bookings.

-- ---------------------------------------------------------------------------
-- User profile: B2C referral activity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_user_referral_stats(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invites jsonb;
  v_credits jsonb;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'invited', count(*),
    'registered', count(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL),
    'paidProPremium', count(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM public."billingInvoicePayment" AS bp
      WHERE bp."userId" = ra."userId"
        AND bp."amountPaidCents" > 0
        AND bp."tierSlug" IN ('pro', 'premium')
    )),
    'linkVisits', (
      SELECT count(*) FROM public."referralLinkClick" AS lc WHERE lc."referrerUserId" = p_user_id
    ),
    'movedToPartner', (
      SELECT count(*) FROM public."referralAttribution" AS m
      WHERE m."referredByUserId" = p_user_id AND m."referralPartnerId" IS NOT NULL
    )
  )
  INTO v_invites
  FROM public."referralAttribution" AS ra
  JOIN auth.users AS u ON u.id = ra."userId"
  WHERE ra."referredByUserId" = p_user_id
    AND ra."referralPartnerId" IS NULL;

  SELECT jsonb_build_object(
    'earned', count(*) FILTER (WHERE l.reason = 'referral_reward'),
    'used', greatest(-coalesce(sum(l.delta) FILTER (WHERE l.reason IN ('redemption', 'cancel_refund')), 0), 0),
    'takenBack', greatest(-coalesce(sum(l.delta) FILTER (WHERE l.reason IN ('reversal', 'reversal_restore')), 0), 0),
    'adjusted', coalesce(sum(l.delta) FILTER (WHERE l.reason = 'admin_adjustment'), 0),
    'available', public.available_referral_coach_credits(p_user_id)
  )
  INTO v_credits
  FROM public."referralCoachCreditLedger" AS l
  WHERE l."userId" = p_user_id;

  RETURN jsonb_build_object('invites', v_invites, 'credits', v_credits);
END;
$$;

-- ---------------------------------------------------------------------------
-- Partners: comparison metrics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_referral_partner_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'partnerId', p.id,
      'signups', coalesce(att.signups, 0),
      'linkVisits', (SELECT count(*) FROM public."referralLinkClick" AS lc WHERE lc."partnerId" = p.id),
      'confirmed', coalesce(att.confirmed, 0),
      'payingClients', coalesce(com.paying_clients, 0),
      'payments', coalesce(com.payments, 0),
      'pendingTermsPayments', coalesce(com.pending_terms, 0),
      'earned', coalesce(earn.amounts, '[]'::jsonb),
      'termsStatus', CASE WHEN t.id IS NULL THEN 'not_configured' ELSE 'confirmed' END,
      'terms', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object(
        'commissionPercent', t."commissionPercent",
        'scope', t.scope,
        'scopeMonths', t."scopeMonths",
        'effectiveFrom', t."effectiveFrom"
      ) END,
      'linkedEmail', lu.email
    ) ORDER BY p.name)
    FROM public."referralPartner" AS p
    LEFT JOIN LATERAL (
      SELECT count(*) AS signups,
             count(*) FILTER (WHERE u.email_confirmed_at IS NOT NULL) AS confirmed
      FROM public."referralAttribution" AS ra
      JOIN auth.users AS u ON u.id = ra."userId"
      WHERE ra."referralPartnerId" = p.id
    ) AS att ON true
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT c."referredUserId") AS paying_clients,
             count(*) AS payments,
             count(*) FILTER (WHERE c.status = 'pending_terms') AS pending_terms
      FROM public."referralPartnerCommission" AS c
      WHERE c."partnerId" = p.id
    ) AS com ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('currency', e.currency, 'cents', e.cents) ORDER BY e.currency) AS amounts
      FROM (
        SELECT c.currency, sum(c."commissionCents" - c."reversedCents") AS cents
        FROM public."referralPartnerCommission" AS c
        WHERE c."partnerId" = p.id AND c.status = 'accrued'
        GROUP BY c.currency
      ) AS e
    ) AS earn ON true
    LEFT JOIN public."referralPartnerTerms" AS t
      ON t."partnerId" = p.id AND t.status = 'confirmed'
    LEFT JOIN auth.users AS lu ON lu.id = p."userId"
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Partner detail: terms history, linked account, per-client commissions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_referral_partner_program(p_partner_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner public."referralPartner"%ROWTYPE;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_partner FROM public."referralPartner" WHERE id = p_partner_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'linkedAccount', (
      SELECT jsonb_build_object('email', u.email, 'linkedAt', v_partner."userLinkedAt")
      FROM auth.users AS u WHERE u.id = v_partner."userId"
    ),
    'terms', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'status', t.status,
        'commissionPercent', t."commissionPercent",
        'scope', t.scope,
        'scopeMonths', t."scopeMonths",
        'effectiveFrom', t."effectiveFrom",
        'note', t.note,
        'confirmedAt', t."confirmedAt",
        'confirmedByEmail', cu.email,
        'archivedAt', t."archivedAt"
      ) ORDER BY t."confirmedAt" DESC)
      FROM public."referralPartnerTerms" AS t
      LEFT JOIN auth.users AS cu ON cu.id = t."confirmedBy"
      WHERE t."partnerId" = p_partner_id
    ), '[]'::jsonb),
    'clients', coalesce((
      SELECT jsonb_agg(row_data ORDER BY last_paid DESC NULLS LAST)
      FROM (
        SELECT
          max(c."paidAt") AS last_paid,
          jsonb_build_object(
            'userId', c."referredUserId",
            'name', nullif(btrim(concat_ws(' ', pr."firstName", pr."lastName")), ''),
            'email', pr.email,
            'payments', count(*),
            'pendingTermsPayments', count(*) FILTER (WHERE c.status = 'pending_terms'),
            'outOfScopePayments', count(*) FILTER (WHERE c.status = 'out_of_scope'),
            'earned', coalesce((
              SELECT jsonb_agg(jsonb_build_object('currency', e.currency, 'cents', e.cents) ORDER BY e.currency)
              FROM (
                SELECT c2.currency, sum(c2."commissionCents" - c2."reversedCents") AS cents
                FROM public."referralPartnerCommission" AS c2
                WHERE c2."partnerId" = p_partner_id
                  AND c2."referredUserId" IS NOT DISTINCT FROM c."referredUserId"
                  AND c2.status = 'accrued'
                GROUP BY c2.currency
              ) AS e
            ), '[]'::jsonb),
            'lastPaidAt', max(c."paidAt")
          ) AS row_data
        FROM public."referralPartnerCommission" AS c
        LEFT JOIN public.profiles AS pr ON pr.id = c."referredUserId"
        WHERE c."partnerId" = p_partner_id
        GROUP BY c."referredUserId", pr."firstName", pr."lastName", pr.email
      ) AS rows
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_referral_stats(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_referral_partner_metrics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_referral_partner_program(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_referral_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_referral_partner_metrics() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_partner_program(UUID) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin bookings list: payment source + referral credit refunds
-- ---------------------------------------------------------------------------
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
          b."paymentSource",
          CASE
            -- NCLDD-56: bookings paid with a referral coach credit.
            WHEN b."paymentSource" = 'referral_credit' THEN CASE
              WHEN EXISTS (
                SELECT 1 FROM public."referralCoachCreditLedger" r
                WHERE r."coachBookingId" = b.id AND r.reason = 'cancel_refund'
              ) AND NOT EXISTS (
                SELECT 1 FROM public."referralCoachCreditLedger" r
                WHERE r."coachBookingId" = b.id AND r.reason = 'reversal'
              ) THEN 'refunded'
              WHEN b.status = 'cancelled' THEN 'no_refund'
              WHEN EXISTS (
                SELECT 1 FROM public."referralCoachCreditLedger" r
                WHERE r."coachBookingId" = b.id AND r.reason = 'redemption'
              ) THEN 'charged'
              ELSE 'none'
            END
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
          CASE
            WHEN b."postSessionSubmittedAt" IS NOT NULL THEN 'submitted'
            ELSE 'pending'
          END AS "postSessionFormStatus",
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
          NULL::text AS "paymentSource",
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
          'n/a'::text AS "postSessionFormStatus",
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

REVOKE ALL ON FUNCTION public.admin_list_coaching_bookings(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_coaching_bookings(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, UUID, TEXT, TEXT, INT) TO authenticated, service_role;
