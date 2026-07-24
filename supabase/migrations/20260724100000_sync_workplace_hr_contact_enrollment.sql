-- Auto-enroll primary HR contact (workplace.contactEmail) into the workplace on create/update and signup.

CREATE OR REPLACE FUNCTION public.sync_workplace_hr_contact_enrollment(p_workplace_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_email text;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  IF p_workplace_id IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(btrim(coalesce(w."contactEmail", '')))
  INTO v_contact_email
  FROM public.workplace w
  WHERE w.id = p_workplace_id;

  IF v_contact_email = '' OR position('@' in v_contact_email) = 0 THEN
    RETURN;
  END IF;

  SELECT p.id
  INTO v_user_id
  FROM public.profiles p
  WHERE lower(btrim(coalesce(p.email, ''))) = v_contact_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_result := public.enroll_profile_in_workplace(p_workplace_id, v_user_id);
  IF coalesce(v_result->>'ok', 'false') <> 'true' THEN
    RETURN;
  END IF;
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
DECLARE
  v_normalized_email text := lower(btrim(coalesce(p_email, '')));
  v_workplace_id uuid;
BEGIN
  IF p_user_id IS NULL OR v_normalized_email = '' OR position('@' in v_normalized_email) = 0 THEN
    RETURN;
  END IF;

  FOR v_workplace_id IN
    SELECT w.id
    FROM public.workplace w
    WHERE lower(btrim(coalesce(w."contactEmail", ''))) = v_normalized_email
  LOOP
    PERFORM public.sync_workplace_hr_contact_enrollment(v_workplace_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_workplace_hr_contact_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_workplace_hr_contact_enrollment(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workplace_sync_hr_contact_enrollment ON public.workplace;
CREATE TRIGGER workplace_sync_hr_contact_enrollment
  AFTER INSERT OR UPDATE OF "contactEmail", "isActive"
  ON public.workplace
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_workplace_hr_contact_enrollment();

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
  PERFORM public.sync_workplace_hr_contact_enrollment_for_email(NEW.id, NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.sync_workplace_hr_contact_enrollment(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_workplace_hr_contact_enrollment_for_email(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_workplace_hr_contact_enrollment(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_workplace_hr_contact_enrollment_for_email(UUID, TEXT) TO service_role;

DO $$
DECLARE
  v_workplace_id uuid;
BEGIN
  FOR v_workplace_id IN SELECT w.id FROM public.workplace w LOOP
    PERFORM public.sync_workplace_hr_contact_enrollment(v_workplace_id);
  END LOOP;
END $$;
