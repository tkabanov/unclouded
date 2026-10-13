-- NCLDD-56 slice 1: lock referral attribution and make a user's own referral code permanent.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
--
-- "Owner updates profile" lets authenticated users UPDATE any column of their own row, so before
-- this migration a user could rewrite who referred them, attach themselves to a partner, fake
-- "referralFirstPaidAt", or swap their own share code. "Owner deletes profile" + "Owner inserts
-- profile" also allowed wiping attribution by deleting and recreating the row (auth.users stays).
-- Rewards (B2C coach credits, B2B commissions) are about to be keyed on attribution, so:
--
-- 1. public."referralAttribution" — durable registry keyed by auth.users(id). It survives a
--    profile delete; a recreated profile gets its attribution and share code back from it.
-- 2. profiles_protect_referral_columns (BEFORE, SECURITY DEFINER):
--    * non-privileged INSERT: attribution and share code are restored from the registry
--      (or cleared when there is none);
--    * non-privileged UPDATE: attribution columns are read-only (42501). The only allowed change
--      is FK cascade clean-up: "referredByUserId"/"referralCorrectedBy" -> NULL when that profile
--      is gone, "referralPartnerId" -> NULL when that partner is gone;
--    * own "referralCode": NULL -> value only (ensureReferralCode), normalized, shared code format,
--      unique against other users' registry codes and partner codes (23505 so the client retries);
--      changing or clearing an existing code is rejected (42501).
-- 3. profiles_sync_referral_attribution (AFTER, SECURITY DEFINER) keeps the registry in step and
--    re-links referred users when a deleted referrer recreates their profile.
-- 4. admin_set_user_referral_partner opts in with app.referral_sync instead of the trigger trusting
--    is_settings_admin(), so admins cannot hand-edit their own attribution through PATCH.
--
-- Privileged callers (unchanged behavior):
--   * service_role JWT (edge functions, scripts);
--   * sessions without a JWT (handle_new_user via GoTrue, SQL editor, migrations);
--   * explicit opt-in: set_config('app.referral_sync', 'true', true) inside a trusted function.
--
-- Trigger order: BEFORE triggers fire alphabetically, so profiles_protect_referral_columns runs
-- before profiles_stamp_referral_first_paid; the stamp written by that trigger is not blocked.
--
-- Read-only pre-checks (each should return 0 before applying; otherwise the migration fails):
--   SELECT count(*) FROM public.profiles WHERE "referredByUserId" = id;
--   SELECT count(*) FROM public.profiles p JOIN public."referralPartner" r
--     ON upper(r."referralCode") = upper(btrim(p."referralCode"));
--   SELECT count(*) FROM (SELECT upper(btrim("referralCode")) c FROM public.profiles
--     WHERE nullif(btrim("referralCode"), '') IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d;

-- ---------------------------------------------------------------------------
-- 1. Registry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."referralAttribution" (
  "userId" UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  "referralCode" TEXT NULL,
  "referredByUserId" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "referredByReferralCode" TEXT NULL,
  "referralPartnerId" UUID NULL REFERENCES public."referralPartner" (id) ON DELETE SET NULL,
  "referralPartnerCode" TEXT NULL,
  "referredAt" TIMESTAMPTZ NULL,
  "referralFirstPaidAt" TIMESTAMPTZ NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_attribution_no_self_referral
    CHECK ("referredByUserId" IS NULL OR "referredByUserId" <> "userId")
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_attribution_code
  ON public."referralAttribution" ("referralCode")
  WHERE "referralCode" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_attribution_referred_by
  ON public."referralAttribution" ("referredByUserId")
  WHERE "referredByUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_attribution_partner
  ON public."referralAttribution" ("referralPartnerId")
  WHERE "referralPartnerId" IS NOT NULL;

ALTER TABLE public."referralAttribution" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings admin selects referralAttribution" ON public."referralAttribution";
CREATE POLICY "Settings admin selects referralAttribution"
  ON public."referralAttribution" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public."referralAttribution" FROM anon, authenticated;
GRANT ALL ON public."referralAttribution" TO service_role;

INSERT INTO public."referralAttribution" (
  "userId",
  "referralCode",
  "referredByUserId",
  "referredByReferralCode",
  "referralPartnerId",
  "referralPartnerCode",
  "referredAt",
  "referralFirstPaidAt"
)
SELECT
  p.id,
  nullif(upper(btrim(p."referralCode")), ''),
  referrer.id,
  p."referredByReferralCode",
  p."referralPartnerId",
  p."referralPartnerCode",
  p."referredAt",
  p."referralFirstPaidAt"
FROM public.profiles AS p
JOIN auth.users AS u ON u.id = p.id
LEFT JOIN auth.users AS referrer ON referrer.id = p."referredByUserId"
WHERE nullif(btrim(p."referralCode"), '') IS NOT NULL
   OR p."referredByUserId" IS NOT NULL
   OR p."referralPartnerId" IS NOT NULL
ON CONFLICT ("userId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. BEFORE trigger: protect / restore
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_protect_referral_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text := nullif(auth.role(), '');
  v_privileged boolean :=
    coalesce(current_setting('app.referral_sync', true), '') = 'true'
    OR v_jwt_role = 'service_role'
    OR v_jwt_role IS NULL;
  v_reg public."referralAttribution"%ROWTYPE;
  v_code_changed boolean;
BEGIN
  -- Recreated profile: bring back attribution and the permanent share code.
  IF TG_OP = 'INSERT' AND NOT v_privileged THEN
    SELECT * INTO v_reg FROM public."referralAttribution" WHERE "userId" = NEW.id;

    NEW."referredByUserId" := CASE
      WHEN v_reg."referredByUserId" IS NOT NULL
           AND EXISTS (SELECT 1 FROM public.profiles WHERE id = v_reg."referredByUserId")
        THEN v_reg."referredByUserId"
    END;
    NEW."referredByReferralCode" := v_reg."referredByReferralCode";
    NEW."referralPartnerId" := v_reg."referralPartnerId";
    NEW."referralPartnerCode" := v_reg."referralPartnerCode";
    NEW."referredAt" := v_reg."referredAt";
    NEW."referralFirstPaidAt" := v_reg."referralFirstPaidAt";
    NEW."referralCorrectedBy" := NULL;
    NEW."referralCorrectedAt" := NULL;

    IF v_reg."referralCode" IS NOT NULL THEN
      NEW."referralCode" := v_reg."referralCode";
      RETURN NEW;
    END IF;
  END IF;

  -- Own share code. Only a written value is normalized, so legacy rows keep updating.
  v_code_changed := TG_OP = 'INSERT' OR NEW."referralCode" IS DISTINCT FROM OLD."referralCode";

  IF v_code_changed AND NEW."referralCode" IS NOT NULL THEN
    NEW."referralCode" := nullif(upper(btrim(NEW."referralCode")), '');
    v_code_changed := TG_OP = 'INSERT' OR NEW."referralCode" IS DISTINCT FROM OLD."referralCode";
  END IF;

  IF v_code_changed THEN
    IF TG_OP = 'UPDATE' AND OLD."referralCode" IS NOT NULL AND NOT v_privileged THEN
      RAISE EXCEPTION 'referral code is permanent and cannot be changed'
        USING ERRCODE = '42501';
    END IF;

    IF NEW."referralCode" IS NOT NULL THEN
      IF NOT v_privileged AND NEW."referralCode" !~ '^[A-HJ-NP-Z2-9]{4,16}$' THEN
        RAISE EXCEPTION 'invalid referral code format'
          USING ERRCODE = '22023';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public."referralPartner" AS partner
        WHERE upper(partner."referralCode") = NEW."referralCode"
      ) THEN
        RAISE EXCEPTION 'referral code collides with a referral partner code'
          USING ERRCODE = '23505';
      END IF;

      IF EXISTS (
        SELECT 1 FROM public."referralAttribution" AS ra
        WHERE ra."referralCode" = NEW."referralCode"
          AND ra."userId" <> NEW.id
      ) THEN
        RAISE EXCEPTION 'referral code is already taken'
          USING ERRCODE = '23505';
      END IF;
    END IF;
  END IF;

  IF v_privileged OR TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Attribution columns are read-only for non-privileged callers; FK clean-up passes.
  IF NEW."referredByUserId" IS DISTINCT FROM OLD."referredByUserId"
     AND NOT (NEW."referredByUserId" IS NULL
              AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD."referredByUserId")) THEN
    RAISE EXCEPTION 'referral attribution can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."referralCorrectedBy" IS DISTINCT FROM OLD."referralCorrectedBy"
     AND NOT (NEW."referralCorrectedBy" IS NULL
              AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD."referralCorrectedBy")) THEN
    RAISE EXCEPTION 'referral attribution can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."referralPartnerId" IS DISTINCT FROM OLD."referralPartnerId"
     AND NOT (NEW."referralPartnerId" IS NULL
              AND NOT EXISTS (SELECT 1 FROM public."referralPartner" WHERE id = OLD."referralPartnerId")) THEN
    RAISE EXCEPTION 'referral attribution can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  IF NEW."referredByReferralCode" IS DISTINCT FROM OLD."referredByReferralCode"
     OR NEW."referralPartnerCode" IS DISTINCT FROM OLD."referralPartnerCode"
     OR NEW."referredAt" IS DISTINCT FROM OLD."referredAt"
     OR NEW."referralFirstPaidAt" IS DISTINCT FROM OLD."referralFirstPaidAt"
     OR NEW."referralCorrectedAt" IS DISTINCT FROM OLD."referralCorrectedAt" THEN
    RAISE EXCEPTION 'referral attribution can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_referral_columns ON public.profiles;
CREATE TRIGGER profiles_protect_referral_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_referral_columns();

REVOKE ALL ON FUNCTION public.profiles_protect_referral_columns() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. AFTER trigger: keep the registry in step
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_sync_referral_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referred_by uuid;
  v_prev_sync text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND ROW(NEW."referralCode", NEW."referredByUserId", NEW."referredByReferralCode",
             NEW."referralPartnerId", NEW."referralPartnerCode", NEW."referredAt",
             NEW."referralFirstPaidAt")
         IS NOT DISTINCT FROM
         ROW(OLD."referralCode", OLD."referredByUserId", OLD."referredByReferralCode",
             OLD."referralPartnerId", OLD."referralPartnerCode", OLD."referredAt",
             OLD."referralFirstPaidAt") THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id) THEN
    RETURN NULL;
  END IF;

  -- Registry links to auth.users; ignore a referrer profile that has no auth user.
  SELECT u.id INTO v_referred_by FROM auth.users AS u WHERE u.id = NEW."referredByUserId";

  IF NEW."referralCode" IS NOT NULL
     OR v_referred_by IS NOT NULL
     OR NEW."referralPartnerId" IS NOT NULL
     OR EXISTS (SELECT 1 FROM public."referralAttribution" WHERE "userId" = NEW.id) THEN
    INSERT INTO public."referralAttribution" AS ra (
      "userId",
      "referralCode",
      "referredByUserId",
      "referredByReferralCode",
      "referralPartnerId",
      "referralPartnerCode",
      "referredAt",
      "referralFirstPaidAt",
      "updatedAt"
    )
    VALUES (
      NEW.id,
      NEW."referralCode",
      v_referred_by,
      NEW."referredByReferralCode",
      NEW."referralPartnerId",
      NEW."referralPartnerCode",
      NEW."referredAt",
      NEW."referralFirstPaidAt",
      now()
    )
    ON CONFLICT ("userId") DO UPDATE SET
      -- The share code is permanent in the registry; only a privileged rewrite replaces it.
      "referralCode" = coalesce(EXCLUDED."referralCode", ra."referralCode"),
      -- A NULL caused by the referrer deleting their profile must not erase the link.
      "referredByUserId" = CASE
        WHEN EXCLUDED."referredByUserId" IS NULL
             AND ra."referredByUserId" IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = ra."referredByUserId")
          THEN ra."referredByUserId"
        ELSE EXCLUDED."referredByUserId"
      END,
      "referredByReferralCode" = EXCLUDED."referredByReferralCode",
      "referralPartnerId" = EXCLUDED."referralPartnerId",
      "referralPartnerCode" = EXCLUDED."referralPartnerCode",
      "referredAt" = EXCLUDED."referredAt",
      "referralFirstPaidAt" = EXCLUDED."referralFirstPaidAt",
      "updatedAt" = now();
  END IF;

  -- A referrer recreated their profile: re-link the users they referred.
  IF TG_OP = 'INSERT' THEN
    v_prev_sync := coalesce(current_setting('app.referral_sync', true), '');
    PERFORM set_config('app.referral_sync', 'true', true);

    UPDATE public.profiles AS p
    SET "referredByUserId" = NEW.id
    FROM public."referralAttribution" AS ra
    WHERE ra."referredByUserId" = NEW.id
      AND p.id = ra."userId"
      AND p."referredByUserId" IS NULL;

    PERFORM set_config('app.referral_sync', v_prev_sync, true);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_referral_attribution ON public.profiles;
CREATE TRIGGER profiles_sync_referral_attribution
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_sync_referral_attribution();

REVOKE ALL ON FUNCTION public.profiles_sync_referral_attribution() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Partner codes must not collide with registry codes either
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referral_partner_code_not_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW."referralCode" := UPPER(TRIM(NEW."referralCode"));
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p."referralCode" IS NOT NULL
      AND UPPER(p."referralCode") = NEW."referralCode"
  ) OR EXISTS (
    SELECT 1
    FROM public."referralAttribution" ra
    WHERE ra."referralCode" = NEW."referralCode"
  ) THEN
    RAISE EXCEPTION 'referral code collides with a user referralCode'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.referral_partner_code_not_user_code() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Admin correction opts in explicitly (body otherwise unchanged)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_referral_partner(
  p_user_id UUID,
  p_partner_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  IF p_partner_id IS NOT NULL THEN
    SELECT partner."referralCode"
    INTO v_code
    FROM public."referralPartner" AS partner
    WHERE partner.id = p_partner_id;

    IF v_code IS NULL THEN
      RAISE EXCEPTION 'referral partner not found';
    END IF;
  END IF;

  PERFORM set_config('app.referral_sync', 'true', true);

  IF p_partner_id IS NULL THEN
    UPDATE public.profiles
    SET
      "referralPartnerId" = NULL,
      "referralPartnerCode" = NULL,
      "referredAt" = NULL,
      "referralCorrectedBy" = auth.uid(),
      "referralCorrectedAt" = now()
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET
      "referralPartnerId" = p_partner_id,
      "referralPartnerCode" = v_code,
      "referredAt" = COALESCE("referredAt", now()),
      "referralCorrectedBy" = auth.uid(),
      "referralCorrectedAt" = now()
    WHERE id = p_user_id;
  END IF;

  PERFORM set_config('app.referral_sync', '', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_referral_partner(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Self-referral guard (fails loudly if existing data violates it; see pre-checks)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_no_self_referral;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_self_referral
  CHECK ("referredByUserId" IS NULL OR "referredByUserId" <> id) NOT VALID;
ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_no_self_referral;
