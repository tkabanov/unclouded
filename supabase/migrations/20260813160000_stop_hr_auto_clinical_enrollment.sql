-- OVR-055 / Part B §14.1: stop auto-enrolling primary HR as clinical enterprise employees.
-- Portal access remains via is_workplace_hr_contact (contactEmail match + delegated HR role).
-- Dual-mode (HR + employee) requires explicit enroll via workplace-members assign.

CREATE OR REPLACE FUNCTION public.sync_workplace_hr_contact_enrollment(p_workplace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: primary HR is portal-only by default (OVR-055).
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_workplace_hr_contact_enrollment_for_email(
  p_user_id UUID,
  p_email TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- No-op: signup matching contactEmail no longer auto-enrolls clinically.
  RETURN;
END;
$$;

DROP TRIGGER IF EXISTS workplace_sync_hr_contact_enrollment ON public.workplace;

-- Keep handle_new_user invitation apply; remove clinical HR sync call if still present.
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

  PERFORM public.apply_pending_workplace_invitations(NEW.id, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
