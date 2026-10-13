-- NCLDD-56 slice 5: B2B partner portal.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
-- Depends on 20261013150000..20261013180000 (registry, commissions, terms, referral_mask_name).
--
-- * A settings admin links a referral partner to an existing account by email
--   (admin_link_referral_partner_user); one account per partner, one partner per account.
-- * The linked account sees only its own partner data through column-limited SECURITY DEFINER
--   RPCs: link/code, confirmed terms (or "not configured"), attributed clients (masked names),
--   per-client commission and totals. No emails, ids or payment amounts of clients.
-- * Earnings are shown only from accrued commissions under confirmed terms (net of reversals);
--   payments waiting for terms are counted, never priced (OVR-074).

ALTER TABLE public."referralPartner"
  ADD COLUMN IF NOT EXISTS "userId" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "userLinkedBy" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "userLinkedAt" TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_partner_user
  ON public."referralPartner" ("userId")
  WHERE "userId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Admin: link / unlink the partner's login account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_link_referral_partner_user(
  p_partner_id UUID,
  p_email TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_user_id UUID;
  v_matches INTEGER;
  v_other UUID;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public."referralPartner" WHERE id = p_partner_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'partner_not_found',
                              'error', 'Referral partner not found.');
  END IF;

  IF v_email IS NULL THEN
    UPDATE public."referralPartner"
    SET "userId" = NULL, "userLinkedBy" = auth.uid(), "userLinkedAt" = now(), "updatedAt" = now()
    WHERE id = p_partner_id;
    RETURN jsonb_build_object('ok', true, 'userId', NULL, 'email', NULL);
  END IF;

  -- Only a confirmed, live, password account: someone could pre-register the partner's email
  -- without confirming it, and SSO accounts may share an address.
  SELECT count(*), min(u.id::text)::uuid
  INTO v_matches, v_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = v_email
    AND u.email_confirmed_at IS NOT NULL
    AND u.deleted_at IS NULL
    AND NOT coalesce(u.is_sso_user, false);

  IF v_matches = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found',
                              'error', 'No confirmed account uses this email. Ask the partner to sign up and confirm their email first.');
  END IF;
  IF v_matches > 1 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ambiguous',
                              'error', 'More than one account uses this email. Link the partner manually.');
  END IF;

  SELECT id INTO v_other FROM public."referralPartner"
  WHERE "userId" = v_user_id AND id <> p_partner_id;
  IF v_other IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_linked',
                              'error', 'This account is already linked to another partner.');
  END IF;

  UPDATE public."referralPartner"
  SET "userId" = v_user_id, "userLinkedBy" = auth.uid(), "userLinkedAt" = now(), "updatedAt" = now()
  WHERE id = p_partner_id;
  RETURN jsonb_build_object('ok', true, 'userId', v_user_id, 'email', v_email);
END;
$$;

-- ---------------------------------------------------------------------------
-- Partner: is the signed-in account a partner? (sidebar)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_my_referral_partner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public."referralPartner" WHERE "userId" = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Partner: portal data (NULL when the account is not a partner)
-- ---------------------------------------------------------------------------
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
    GROUP BY ci.id, u.created_at, u.email_confirmed_at, p."firstName", p."lastName"
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object(
      'displayName', display_name,
      'joinedAt', joined_at,
      'status', CASE
        WHEN payments > 0 THEN 'paying'
        WHEN email_confirmed_at IS NOT NULL THEN 'signed_up'
        ELSE 'pending_confirmation'
      END,
      'payments', payments,
      'pendingTermsPayments', pending_terms,
      'earned', earned
    ) ORDER BY joined_at DESC), '[]'::jsonb),
    count(*)
  INTO v_clients, v_signups
  FROM per_client;

  SELECT jsonb_build_object(
    'signups', v_signups,
    'linkVisits', (SELECT count(*) FROM public."referralLinkClick" WHERE "partnerId" = v_partner.id),
    'payingClients', count(DISTINCT c."referredUserId"),
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

REVOKE ALL ON FUNCTION public.admin_link_referral_partner_user(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_my_referral_partner() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_referral_partner_portal() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_link_referral_partner_user(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_my_referral_partner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_referral_partner_portal() TO authenticated, service_role;
