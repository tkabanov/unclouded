-- US-904: UTM attribution at signup (?utm_source/medium/campaign → profiles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "utmSource" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "utmMedium" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_utm_source
  ON public.profiles ("utmSource")
  WHERE "utmSource" IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
  v_referred_code TEXT;
  v_utm_source TEXT;
  v_utm_medium TEXT;
  v_utm_campaign TEXT;
BEGIN
  v_time_zone := COALESCE(
    NEW.raw_user_meta_data ->> 'time_zone',
    NEW.raw_user_meta_data ->> 'timezone'
  );

  v_referred_code := NULLIF(UPPER(TRIM(NEW.raw_user_meta_data ->> 'referral_code')), '');

  IF v_referred_code IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profiles AS referrer
    WHERE referrer."referralCode" = v_referred_code
  ) THEN
    v_referred_code := NULL;
  END IF;

  v_utm_source := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_source'), 128), '');
  v_utm_medium := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_medium'), 128), '');
  v_utm_campaign := NULLIF(LEFT(TRIM(NEW.raw_user_meta_data ->> 'utm_campaign'), 128), '');

  INSERT INTO public.profiles (
    id,
    email,
    "firstName",
    "lastName",
    "timeZone",
    "referredByReferralCode",
    "utmSource",
    "utmMedium",
    "utmCampaign"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NULLIF(TRIM(v_time_zone), ''),
    v_referred_code,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
