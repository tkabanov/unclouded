-- NCLDD-56 QA F-2 (OVR-074): statuses follow full refunds / held disputes.
--
-- * Partner portal: a client is "paying" only while at least one of their commission payments is
--   not fully reversed (refunded + held dispute < amount paid); otherwise "refunded". The
--   "payingClients" total uses the same rule. Payment counts and earnings are unchanged.
-- * Invite a friend: an invitee whose reward was taken back (latest reversal / restore row of the
--   rewarded invoice is a reversal) is "refunded" instead of "rewarded"; a won dispute restores
--   "rewarded".
--
-- Only the two read RPCs are replaced; ledgers and grants are untouched.

CREATE OR REPLACE FUNCTION public.get_my_referral_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code TEXT;
  v_invitees jsonb;
  v_total INTEGER;
  v_credits jsonb;
  v_history jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(p."referralCode", ra."referralCode")
  INTO v_code
  FROM (SELECT v_user_id AS id) AS me
  LEFT JOIN public.profiles AS p ON p.id = me.id
  LEFT JOIN public."referralAttribution" AS ra ON ra."userId" = me.id;

  -- Partner attribution wins (OVR-074): users moved to a partner are not the referrer's invitees.
  SELECT count(*) INTO v_total
  FROM public."referralAttribution" AS ra
  WHERE ra."referredByUserId" = v_user_id
    AND ra."referralPartnerId" IS NULL;

  SELECT coalesce(jsonb_agg(row_data ORDER BY joined_at DESC), '[]'::jsonb)
  INTO v_invitees
  FROM (
    SELECT
      u.created_at AS joined_at,
      jsonb_build_object(
        'displayName', public.referral_mask_name(p."firstName", p."lastName"),
        'joinedAt', date_trunc('day', u.created_at),
        'status', CASE
          -- The latest reversal / restore row of the rewarded invoice is the reward's state.
          WHEN reward."createdAt" IS NOT NULL AND (
            SELECT r.reason FROM public."referralCoachCreditLedger" AS r
            WHERE r."stripeInvoiceId" = reward."stripeInvoiceId"
              AND r.reason IN ('reversal', 'reversal_restore')
            ORDER BY r.seq DESC
            LIMIT 1
          ) = 'reversal' THEN 'refunded'
          WHEN reward."createdAt" IS NOT NULL THEN 'rewarded'
          WHEN u.email_confirmed_at IS NOT NULL THEN 'signed_up'
          ELSE 'pending_confirmation'
        END,
        'rewardedAt', reward."createdAt"
      ) AS row_data
    FROM public."referralAttribution" AS ra
    JOIN auth.users AS u ON u.id = ra."userId"
    LEFT JOIN public.profiles AS p ON p.id = ra."userId"
    LEFT JOIN public."referralCoachCreditLedger" AS reward
      ON reward."referredUserId" = ra."userId"
     AND reward."userId" = v_user_id
     AND reward.reason = 'referral_reward'
    WHERE ra."referredByUserId" = v_user_id
      AND ra."referralPartnerId" IS NULL
    ORDER BY u.created_at DESC
    LIMIT 200
  ) AS rows;

  SELECT jsonb_build_object(
    'earned', count(*) FILTER (WHERE l.reason = 'referral_reward'),
    'used', greatest(-coalesce(sum(l.delta) FILTER (WHERE l.reason IN ('redemption', 'cancel_refund')), 0), 0),
    'takenBack', greatest(-coalesce(sum(l.delta) FILTER (WHERE l.reason IN ('reversal', 'reversal_restore')), 0), 0),
    'adjusted', coalesce(sum(l.delta) FILTER (WHERE l.reason = 'admin_adjustment'), 0),
    'available', public.available_referral_coach_credits(v_user_id)
  )
  INTO v_credits
  FROM public."referralCoachCreditLedger" AS l
  WHERE l."userId" = v_user_id;

  SELECT coalesce(jsonb_agg(row_data ORDER BY seq DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT
      l.seq,
      jsonb_build_object(
        'id', l.id,
        'reason', l.reason,
        'delta', l.delta,
        'createdAt', l."createdAt",
        'friendName', CASE
          WHEN l."referredUserId" IS NOT NULL
            THEN public.referral_mask_name(fp."firstName", fp."lastName")
        END,
        'sessionAt', b."scheduledAt"
      ) AS row_data
    FROM public."referralCoachCreditLedger" AS l
    LEFT JOIN public.profiles AS fp ON fp.id = l."referredUserId"
    LEFT JOIN public."coachBooking" AS b ON b.id = l."coachBookingId"
    WHERE l."userId" = v_user_id
    ORDER BY l.seq DESC
    LIMIT 100
  ) AS rows;

  RETURN jsonb_build_object(
    'code', v_code,
    'totalInvited', v_total,
    'linkVisits', (SELECT count(*) FROM public."referralLinkClick" WHERE "referrerUserId" = v_user_id),
    'invitees', v_invitees,
    'credits', v_credits,
    'history', v_history
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_partner_portal()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_partner public."referralPartner"%ROWTYPE;
  v_terms jsonb;
  v_clients jsonb;
  v_totals jsonb;
  v_signups INTEGER;
  v_paying INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_partner FROM public."referralPartner" WHERE "userId" = v_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'commissionPercent', t."commissionPercent",
    'scope', t.scope,
    'scopeMonths', t."scopeMonths",
    'effectiveFrom', t."effectiveFrom",
    'confirmedAt', t."confirmedAt"
  )
  INTO v_terms
  FROM public."referralPartnerTerms" AS t
  WHERE t."partnerId" = v_partner.id AND t.status = 'confirmed';

  -- Clients: currently attributed to this partner, plus anyone the partner already earned on.
  WITH client_ids AS (
    SELECT ra."userId" AS id FROM public."referralAttribution" AS ra
    WHERE ra."referralPartnerId" = v_partner.id
    UNION
    SELECT c."referredUserId" FROM public."referralPartnerCommission" AS c
    WHERE c."partnerId" = v_partner.id AND c."referredUserId" IS NOT NULL
  ),
  per_client AS (
    SELECT
      ci.id,
      -- Day precision is enough and makes clients harder to identify.
      date_trunc('day', u.created_at) AS joined_at,
      u.email_confirmed_at,
      public.referral_mask_name(p."firstName", p."lastName") AS display_name,
      count(c.id) AS payments,
      -- Payments not fully taken back by refunds / held disputes.
      count(c.id) FILTER (WHERE public.referral_payment_reversed_ratio(
        bp."amountPaidCents", bp."refundedCents", bp."disputedCents") < 1) AS live_payments,
      count(c.id) FILTER (WHERE c.status = 'pending_terms') AS pending_terms,
      coalesce((
        SELECT jsonb_agg(jsonb_build_object('currency', e.currency, 'cents', e.cents) ORDER BY e.currency)
        FROM (
          SELECT c3.currency, sum(c3."commissionCents" - c3."reversedCents") AS cents
          FROM public."referralPartnerCommission" AS c3
          WHERE c3."referredUserId" = ci.id AND c3."partnerId" = v_partner.id AND c3.status = 'accrued'
          GROUP BY c3.currency
        ) AS e
      ), '[]'::jsonb) AS earned
    FROM client_ids AS ci
    JOIN auth.users AS u ON u.id = ci.id
    LEFT JOIN public.profiles AS p ON p.id = ci.id
    LEFT JOIN public."referralPartnerCommission" AS c
      ON c."referredUserId" = ci.id AND c."partnerId" = v_partner.id
    LEFT JOIN public."billingInvoicePayment" AS bp ON bp."stripeInvoiceId" = c."stripeInvoiceId"
    GROUP BY ci.id, u.created_at, u.email_confirmed_at, p."firstName", p."lastName"
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'displayName', display_name,
      'joinedAt', joined_at,
      'status', CASE
        WHEN live_payments > 0 THEN 'paying'
        WHEN payments > 0 THEN 'refunded'
        WHEN email_confirmed_at IS NOT NULL THEN 'signed_up'
        ELSE 'pending_confirmation'
      END,
      'payments', payments,
      'pendingTermsPayments', pending_terms,
      'earned', earned
    ) ORDER BY joined_at DESC), '[]'::jsonb),
    count(*),
    count(*) FILTER (WHERE live_payments > 0)
  INTO v_clients, v_signups, v_paying
  FROM per_client;

  SELECT jsonb_build_object(
    'signups', v_signups,
    'linkVisits', (SELECT count(*) FROM public."referralLinkClick" WHERE "partnerId" = v_partner.id),
    'payingClients', v_paying,
    'payments', count(*),
    'pendingTermsPayments', count(*) FILTER (WHERE c.status = 'pending_terms'),
    'earned', coalesce((
      SELECT jsonb_agg(jsonb_build_object('currency', e.currency, 'cents', e.cents) ORDER BY e.currency)
      FROM (
        SELECT c2.currency, sum(c2."commissionCents" - c2."reversedCents") AS cents
        FROM public."referralPartnerCommission" AS c2
        WHERE c2."partnerId" = v_partner.id AND c2.status = 'accrued'
        GROUP BY c2.currency
      ) AS e
    ), '[]'::jsonb)
  )
  INTO v_totals
  FROM public."referralPartnerCommission" AS c
  WHERE c."partnerId" = v_partner.id;

  RETURN jsonb_build_object(
    'partner', jsonb_build_object(
      'name', v_partner.name,
      'code', v_partner."referralCode",
      'status', v_partner.status
    ),
    'termsStatus', CASE WHEN v_terms IS NULL THEN 'not_configured' ELSE 'confirmed' END,
    'terms', v_terms,
    'clients', v_clients,
    'totals', v_totals
  );
END;
$$;
