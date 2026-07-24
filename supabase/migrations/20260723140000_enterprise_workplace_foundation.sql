-- Phase 2 §9 — enterprise workplace foundation (enrollment codes, accountType, seats).

ALTER TABLE public.workplace
  ADD COLUMN IF NOT EXISTS "contractTier" TEXT NOT NULL DEFAULT 'pro'
    CHECK ("contractTier" IN ('pro', 'premium')),
  ADD COLUMN IF NOT EXISTS "seatCount" INTEGER NOT NULL DEFAULT 50
    CHECK ("seatCount" > 0),
  ADD COLUMN IF NOT EXISTS "contractStartDate" DATE NULL,
  ADD COLUMN IF NOT EXISTS "contractEndDate" DATE NULL,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS "accountType" TEXT NOT NULL DEFAULT 'individual'
    CHECK ("accountType" IN ('individual', 'enterprise')),
  ADD COLUMN IF NOT EXISTS "enterpriseTier" TEXT NULL
    CHECK ("enterpriseTier" IS NULL OR "enterpriseTier" IN ('pro', 'premium')),
  ADD COLUMN IF NOT EXISTS "enrollmentDate" TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS public."workplaceEnrollmentCode" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workplaceId" UUID NOT NULL REFERENCES public.workplace(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deactivatedAt" TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workplace_enrollment_code_normalized
  ON public."workplaceEnrollmentCode" (upper(btrim(code)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_workplace_enrollment_one_active
  ON public."workplaceEnrollmentCode" ("workplaceId")
  WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_workplace_enrollment_workplace
  ON public."workplaceEnrollmentCode" ("workplaceId", "createdAt" DESC);

CREATE OR REPLACE FUNCTION public.count_workplace_active_seats(p_workplace_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles
  WHERE "workplaceId" = p_workplace_id
    AND "accountType" = 'enterprise';
$$;

GRANT EXECUTE ON FUNCTION public.count_workplace_active_seats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_workplace_active_seats(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.is_workplace_hr_contact(p_workplace_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workplace w
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE w.id = p_workplace_id
      AND lower(btrim(coalesce(p.email, ''))) = lower(btrim(coalesce(w."contactEmail", '')))
      AND btrim(coalesce(w."contactEmail", '')) <> ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workplace_hr_contact(UUID) TO authenticated;

ALTER TABLE public."workplaceEnrollmentCode" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin or HR read workplace enrollment codes"
  ON public."workplaceEnrollmentCode"
  FOR SELECT TO authenticated
  USING (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  );

CREATE POLICY "Admin or HR insert workplace enrollment codes"
  ON public."workplaceEnrollmentCode"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  );

CREATE POLICY "Admin or HR update workplace enrollment codes"
  ON public."workplaceEnrollmentCode"
  FOR UPDATE TO authenticated
  USING (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  )
  WITH CHECK (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact("workplaceId")
  );

GRANT SELECT, INSERT, UPDATE ON public."workplaceEnrollmentCode" TO authenticated;
GRANT ALL ON public."workplaceEnrollmentCode" TO service_role;

-- Protect enterprise entitlement columns from direct client mutation.
CREATE OR REPLACE FUNCTION public.profiles_protect_entitlement_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.billing_sync', true) <> 'true'
       AND current_setting('app.enterprise_sync', true) <> 'true' THEN
      NEW.subscribed := false;
      NEW.tier := 'free';
      NEW."accountType" := 'individual';
      NEW."enterpriseTier" := NULL;
      NEW."enrollmentDate" := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF current_setting('app.enterprise_sync', true) = 'true' THEN
      RETURN NEW;
    END IF;

    IF NEW.subscribed IS DISTINCT FROM OLD.subscribed
       OR NEW.tier IS DISTINCT FROM OLD.tier THEN
      IF current_setting('app.billing_sync', true) = 'true' THEN
        NULL;
      ELSE
        NEW.subscribed := OLD.subscribed;
        NEW.tier := OLD.tier;
      END IF;
    END IF;

    IF NEW."accountType" IS DISTINCT FROM OLD."accountType"
       OR NEW."enterpriseTier" IS DISTINCT FROM OLD."enterpriseTier"
       OR NEW."enrollmentDate" IS DISTINCT FROM OLD."enrollmentDate"
       OR NEW."workplaceId" IS DISTINCT FROM OLD."workplaceId" THEN
      NEW."accountType" := OLD."accountType";
      NEW."enterpriseTier" := OLD."enterpriseTier";
      NEW."enrollmentDate" := OLD."enrollmentDate";
      NEW."workplaceId" := OLD."workplaceId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE UPDATE ("accountType", "enterpriseTier", "enrollmentDate", "workplaceId")
  ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.request_subscription_plan_change(p_plan_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text := lower(btrim(coalesce(p_plan_id, '')));
  v_account_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT "accountType" INTO v_account_type FROM profiles WHERE id = v_user_id;

  IF v_account_type = 'enterprise' THEN
    RETURN jsonb_build_object(
      'status', 'enterprise_covered',
      'subscribed', true,
      'tier', (SELECT tier FROM profiles WHERE id = v_user_id),
      'message', 'Your organization covers this subscription.'
    );
  END IF;

  IF v_plan = 'free' THEN
    PERFORM set_config('app.billing_sync', 'true', true);
    UPDATE profiles
    SET subscribed = false,
        tier = 'free'
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'status', 'ok',
      'subscribed', false,
      'tier', 'free',
      'message', 'Moved to the Free plan.'
    );
  END IF;

  IF v_plan IN ('pro', 'premium') THEN
    RETURN jsonb_build_object(
      'status', 'billing_required',
      'subscribed', (SELECT subscribed FROM profiles WHERE id = v_user_id),
      'tier', (SELECT tier FROM profiles WHERE id = v_user_id),
      'message', 'Checkout is not connected yet. Connect Stripe billing to upgrade your plan.'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'invalid_plan',
    'message', 'Unknown subscription plan.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_chat_session(
  p_user_id uuid,
  p_conversation_id text,
  p_record boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding jsonb;
  v_usage jsonb;
  v_ids jsonb;
  v_tier text;
  v_subscribed boolean;
  v_account_type text;
  v_month_key text;
  v_limit int := 7;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_conversation_id IS NULL OR btrim(p_conversation_id) = '' THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'conversation_required');
  END IF;

  v_month_key := to_char(timezone('utc', now()), 'YYYY-MM');

  SELECT "onboardingData", tier, subscribed, "accountType"
  INTO v_onboarding, v_tier, v_subscribed, v_account_type
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_account_type = 'enterprise'
     OR v_subscribed IS TRUE
     OR lower(coalesce(v_tier, 'free')) NOT IN ('free', 'explorer', '') THEN
    RETURN jsonb_build_object('allowed', true, 'recorded', false);
  END IF;

  v_usage := coalesce(v_onboarding -> 'chat_ai_monthly_usage', '{}'::jsonb);

  IF coalesce(v_usage ->> 'monthKey', '') <> v_month_key THEN
    v_ids := '[]'::jsonb;
  ELSE
    v_ids := coalesce(v_usage -> 'sessionConversationIds', '[]'::jsonb);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(v_ids) AS elem(value)
    WHERE elem.value = p_conversation_id
  ) THEN
    RETURN jsonb_build_object('allowed', true, 'recorded', false);
  END IF;

  IF jsonb_array_length(v_ids) >= v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'free_tier_session_limit');
  END IF;

  IF NOT p_record THEN
    RETURN jsonb_build_object('allowed', true, 'recorded', false);
  END IF;

  v_ids := v_ids || jsonb_build_array(p_conversation_id);
  v_onboarding := jsonb_set(
    coalesce(v_onboarding, '{}'::jsonb),
    '{chat_ai_monthly_usage}',
    jsonb_build_object('monthKey', v_month_key, 'sessionConversationIds', v_ids),
    true
  );

  UPDATE profiles SET "onboardingData" = v_onboarding WHERE id = p_user_id;

  RETURN jsonb_build_object('allowed', true, 'recorded', true);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_chat_session(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_chat_session(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.redeem_workplace_enrollment_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_code_row public."workplaceEnrollmentCode"%ROWTYPE;
  v_workplace public.workplace%ROWTYPE;
  v_active_seats integer;
  v_tier text;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF length(v_code) < 6 OR length(v_code) > 32 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive enrollment code.', 'status', 404);
  END IF;

  SELECT c.*
  INTO v_code_row
  FROM public."workplaceEnrollmentCode" c
  WHERE c."isActive" = true
    AND upper(btrim(c.code)) = v_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive enrollment code.', 'status', 404);
  END IF;

  SELECT w.*
  INTO v_workplace
  FROM public.workplace w
  WHERE w.id = v_code_row."workplaceId"
  FOR UPDATE;

  IF NOT FOUND OR v_workplace."isActive" IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractStartDate" IS NOT NULL AND v_workplace."contractStartDate" > v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractEndDate" IS NOT NULL AND v_workplace."contractEndDate" < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" IS NOT NULL
      AND p."workplaceId" <> v_workplace.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are already enrolled with another organization.', 'status', 409);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" = v_workplace.id
  ) THEN
    v_tier := coalesce(
      (SELECT p."enterpriseTier" FROM public.profiles p WHERE p.id = v_user_id),
      v_workplace."contractTier",
      'pro'
    );
    RETURN jsonb_build_object(
      'ok', true,
      'workplaceId', v_workplace.id,
      'workplaceName', v_workplace.name,
      'enterpriseTier', v_tier,
      'alreadyEnrolled', true
    );
  END IF;

  SELECT public.count_workplace_active_seats(v_workplace.id) INTO v_active_seats;

  IF v_workplace."seatCount" > 0 AND v_active_seats >= v_workplace."seatCount" THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Your organization''s seats are full. Contact your HR team.',
      'status', 409
    );
  END IF;

  v_tier := CASE
    WHEN lower(coalesce(v_workplace."contractTier", 'pro')) = 'premium' THEN 'premium'
    ELSE 'pro'
  END;

  PERFORM set_config('app.enterprise_sync', 'true', true);

  UPDATE public.profiles
  SET "accountType" = 'enterprise',
      "workplaceId" = v_workplace.id,
      "enterpriseTier" = v_tier,
      "enrollmentDate" = now(),
      subscribed = true,
      tier = v_tier
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'workplaceId', v_workplace.id,
    'workplaceName', v_workplace.name,
    'enterpriseTier', v_tier,
    'alreadyEnrolled', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_workplace_enrollment_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_workplace_enrollment_code(text) TO authenticated;
