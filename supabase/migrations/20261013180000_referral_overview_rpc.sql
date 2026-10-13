-- NCLDD-56 slice 4: data for the user's "Invite a friend" page.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
-- Depends on 20261013150000 ("referralAttribution") and 20261013160000 ("referralCoachCreditLedger").
--
-- One column-limited SECURITY DEFINER RPC, scoped to auth.uid():
--   * the caller's own share code;
--   * people who signed up with it — display name is first name + last initial only, never the
--     full last name, email or user id;
--   * referral coach credit totals and history (with the friend's masked name / session time).
-- "Signed up" means the account exists; "confirmed" means the email was confirmed; link clicks
-- are not tracked (OVR-074).

-- First token of the first name + first letter of the last name. Names are free text typed by
-- the invitee, so every Unicode space / control character counts as a separator, and an
-- email-looking first token is never shown.
CREATE OR REPLACE FUNCTION public.referral_mask_name(p_first_name TEXT, p_last_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_separators CONSTANT TEXT :=
    '[[:space:][:cntrl:]\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]+';
  v_first TEXT;
  v_initial TEXT;
BEGIN
  v_first := split_part(btrim(regexp_replace(coalesce(p_first_name, ''), v_separators, ' ', 'g')), ' ', 1);
  IF v_first = '' OR position('@' IN v_first) > 0 THEN
    RETURN 'Friend';
  END IF;

  v_initial := upper(substring(coalesce(p_last_name, '') FROM '[[:alpha:]]'));
  RETURN left(v_first, 40) || coalesce(' ' || v_initial || '.', '');
END;
$$;

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
    'invitees', v_invitees,
    'credits', v_credits,
    'history', v_history
  );
END;
$$;

REVOKE ALL ON FUNCTION public.referral_mask_name(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_referral_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_overview() TO authenticated, service_role;
