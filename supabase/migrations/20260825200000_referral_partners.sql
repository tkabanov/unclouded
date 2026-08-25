-- OVR-058 / Referral Partners (B2B) alongside organic user→user referrals.
-- Partner-first signup attribution; commissions / partner portal deferred.

CREATE TABLE public."referralPartner" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  email TEXT NOT NULL,
  "contactInfo" TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  "referralCode" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_partner_code_unique UNIQUE ("referralCode"),
  CONSTRAINT referral_partner_code_format CHECK (
    "referralCode" ~ '^[A-HJ-NP-Z2-9]{4,16}$'
  )
);

CREATE INDEX idx_referral_partner_status ON public."referralPartner" (status);
CREATE INDEX idx_referral_partner_email ON public."referralPartner" (email);

ALTER TABLE public."referralPartner" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings admins select referral partners"
  ON public."referralPartner"
  FOR SELECT
  TO authenticated
  USING (public.is_settings_admin());

CREATE POLICY "Settings admins insert referral partners"
  ON public."referralPartner"
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins update referral partners"
  ON public."referralPartner"
  FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins delete referral partners"
  ON public."referralPartner"
  FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."referralPartner" TO authenticated;
GRANT ALL ON public."referralPartner" TO service_role;

DROP TRIGGER IF EXISTS update_referral_partner_updated_at ON public."referralPartner";
CREATE TRIGGER update_referral_partner_updated_at
  BEFORE UPDATE ON public."referralPartner"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Profile partner attribution (additive; organic referredBy* unchanged).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "referralPartnerId" UUID NULL
    REFERENCES public."referralPartner" (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "referralPartnerCode" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "referredAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "referralCorrectedBy" UUID NULL
    REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "referralCorrectedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "referralFirstPaidAt" TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_partner_id
  ON public.profiles ("referralPartnerId")
  WHERE "referralPartnerId" IS NOT NULL;

-- Reject partner codes that collide with organic user share codes.
CREATE OR REPLACE FUNCTION public.referral_partner_code_not_user_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW."referralCode" := UPPER(TRIM(NEW."referralCode"));
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p."referralCode" IS NOT NULL
      AND UPPER(p."referralCode") = NEW."referralCode"
  ) THEN
    RAISE EXCEPTION 'referral code collides with a user referralCode'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referral_partner_code_not_user_code ON public."referralPartner";
CREATE TRIGGER referral_partner_code_not_user_code
  BEFORE INSERT OR UPDATE OF "referralCode" ON public."referralPartner"
  FOR EACH ROW
  EXECUTE FUNCTION public.referral_partner_code_not_user_code();

-- Stamp first paid conversion for partner-referred users (compensation readiness).
CREATE OR REPLACE FUNCTION public.profiles_stamp_referral_first_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_paid BOOLEAN;
BEGIN
  IF NEW."referralPartnerId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW."referralFirstPaidAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_tier := lower(btrim(coalesce(NEW.tier, '')));
  v_paid := (NEW.subscribed IS TRUE)
    OR (v_tier <> '' AND v_tier <> 'free' AND v_tier <> 'explorer');

  IF v_paid THEN
    NEW."referralFirstPaidAt" := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_stamp_referral_first_paid ON public.profiles;
CREATE TRIGGER profiles_stamp_referral_first_paid
  BEFORE INSERT OR UPDATE OF subscribed, tier, "referralPartnerId" ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_stamp_referral_first_paid();

-- Signup: partner-first (active only), else organic user code; soft-fail otherwise.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
  v_referred_code TEXT;
  v_referrer_id UUID;
  v_partner_id UUID;
  v_partner_code TEXT;
  v_referred_at TIMESTAMPTZ;
  v_utm_source TEXT;
  v_utm_medium TEXT;
  v_utm_campaign TEXT;
  v_signup_plan TEXT;
BEGIN
  v_time_zone := COALESCE(
    NEW.raw_user_meta_data ->> 'time_zone',
    NEW.raw_user_meta_data ->> 'timezone'
  );

  v_referred_code := NULLIF(UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code')), '');
  v_referrer_id := NULL;
  v_partner_id := NULL;
  v_partner_code := NULL;
  v_referred_at := NULL;

  IF v_referred_code IS NOT NULL THEN
    SELECT partner.id
    INTO v_partner_id
    FROM public."referralPartner" AS partner
    WHERE partner."referralCode" = v_referred_code
      AND partner.status = 'active';

    IF v_partner_id IS NOT NULL THEN
      v_partner_code := v_referred_code;
      v_referred_at := now();
      v_referred_code := NULL;
    ELSE
      SELECT referrer.id
      INTO v_referrer_id
      FROM public.profiles AS referrer
      WHERE referrer."referralCode" = v_referred_code;

      IF v_referrer_id IS NULL THEN
        v_referred_code := NULL;
      END IF;
    END IF;
  END IF;

  v_utm_source := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_source'), 128), '');
  v_utm_medium := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_medium'), 128), '');
  v_utm_campaign := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_campaign'), 128), '');

  v_signup_plan := lower(btrim(coalesce(NEW.raw_user_meta_data ->> 'signup_plan', '')));
  IF v_signup_plan <> 'founding' THEN
    v_signup_plan := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    "firstName",
    "lastName",
    "timeZone",
    "referredByUserId",
    "referredByReferralCode",
    "referralPartnerId",
    "referralPartnerCode",
    "referredAt",
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "signupPlan"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NULLIF(TRIM(v_time_zone), ''),
    v_referrer_id,
    v_referred_code,
    v_partner_id,
    v_partner_code,
    v_referred_at,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_signup_plan
  );

  PERFORM public.apply_pending_workplace_invitations(NEW.id, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admin attribution correction (profiles owner UPDATE RLS blocks cross-user writes).
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

  IF p_partner_id IS NULL THEN
    UPDATE public.profiles
    SET
      "referralPartnerId" = NULL,
      "referralPartnerCode" = NULL,
      "referredAt" = NULL,
      "referralCorrectedBy" = auth.uid(),
      "referralCorrectedAt" = now()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  SELECT partner."referralCode"
  INTO v_code
  FROM public."referralPartner" AS partner
  WHERE partner.id = p_partner_id;

  IF v_code IS NULL THEN
    RAISE EXCEPTION 'referral partner not found';
  END IF;

  UPDATE public.profiles
  SET
    "referralPartnerId" = p_partner_id,
    "referralPartnerCode" = v_code,
    "referredAt" = COALESCE("referredAt", now()),
    "referralCorrectedBy" = auth.uid(),
    "referralCorrectedAt" = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_referral_partner(UUID, UUID) TO authenticated;
