-- Inbound referral attribution: /signup?ref=CODE → profiles.referredByReferralCode
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "referredByReferralCode" TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by_referral_code
  ON public.profiles ("referredByReferralCode")
  WHERE "referredByReferralCode" IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_time_zone TEXT;
  v_referred_code TEXT;
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

  INSERT INTO public.profiles (
    id,
    email,
    "firstName",
    "lastName",
    "timeZone",
    "referredByReferralCode"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NULLIF(TRIM(v_time_zone), ''),
    v_referred_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
