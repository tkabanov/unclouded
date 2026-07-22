-- Primary referral attribution via referrer user id; keep code as signup snapshot.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "referredByUserId" UUID NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_referred_by_user_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referred_by_user_id_fkey
  FOREIGN KEY ("referredByUserId")
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_user_id
  ON public.profiles ("referredByUserId")
  WHERE "referredByUserId" IS NOT NULL;

-- Backfill from legacy code-only rows.
UPDATE public.profiles AS referred
SET "referredByUserId" = referrer.id
FROM public.profiles AS referrer
WHERE referred."referredByReferralCode" IS NOT NULL
  AND referred."referredByUserId" IS NULL
  AND referrer."referralCode" IS NOT NULL
  AND UPPER(BTRIM(referred."referredByReferralCode")) = referrer."referralCode";

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
  v_referred_code TEXT;
  v_referrer_id UUID;
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

  IF v_referred_code IS NOT NULL THEN
    SELECT referrer.id
    INTO v_referrer_id
    FROM public.profiles AS referrer
    WHERE referrer."referralCode" = v_referred_code;

    IF v_referrer_id IS NULL THEN
      v_referred_code := NULL;
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
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_signup_plan
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.count_my_referral_signups()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles AS referred
  WHERE referred."referredByUserId" = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.count_my_referral_signups() TO authenticated;
