-- Part A §1 Goal — enterprise admin org controls:
-- billing model / payment method / notes / maxSeats / invoice status,
-- multi-active enrollment codes (6–8), audit log, seat-cap helper,
-- join-code peek, monthly active-users report, tier sync on contract change.

-- ---------------------------------------------------------------------------
-- workplace contract columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.workplace
  ADD COLUMN IF NOT EXISTS "billingModel" TEXT NOT NULL DEFAULT 'flat_rate'
    CHECK ("billingModel" IN ('flat_rate', 'pay_per_active')),
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'manual_invoice'
    CHECK ("paymentMethod" IN ('manual_invoice', 'stripe')),
  ADD COLUMN IF NOT EXISTS "billingNotes" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "maxSeats" INTEGER NULL
    CHECK ("maxSeats" IS NULL OR "maxSeats" > 0),
  ADD COLUMN IF NOT EXISTS "invoiceStatus" TEXT NOT NULL DEFAULT 'draft'
    CHECK ("invoiceStatus" IN ('draft', 'sent', 'paid', 'overdue'));

COMMENT ON COLUMN public.workplace."billingModel" IS
  'flat_rate = hard seatCount cap; pay_per_active = soft seatCount target, optional maxSeats hard cap';
COMMENT ON COLUMN public.workplace."paymentMethod" IS
  'manual_invoice | stripe (stripe is metadata only until org Stripe billing ships)';
COMMENT ON COLUMN public.workplace."maxSeats" IS
  'Optional hard enrollment cap for pay_per_active; ignored for flat_rate';
COMMENT ON COLUMN public.workplace."invoiceStatus" IS
  'Manual invoice tracking status: draft | sent | paid | overdue';

-- Require contract dates going forward (backfill nulls first).
UPDATE public.workplace
SET "contractStartDate" = coalesce("contractStartDate", ("createdAt" AT TIME ZONE 'utc')::date)
WHERE "contractStartDate" IS NULL;

UPDATE public.workplace
SET "contractEndDate" = coalesce(
  "contractEndDate",
  greatest(
    coalesce("contractStartDate", ("createdAt" AT TIME ZONE 'utc')::date) + 365,
    (("createdAt" AT TIME ZONE 'utc')::date) + 365
  )
)
WHERE "contractEndDate" IS NULL;

ALTER TABLE public.workplace
  ALTER COLUMN "contractStartDate" SET NOT NULL,
  ALTER COLUMN "contractEndDate" SET NOT NULL;

ALTER TABLE public.workplace
  DROP CONSTRAINT IF EXISTS workplace_contract_dates_check;
ALTER TABLE public.workplace
  ADD CONSTRAINT workplace_contract_dates_check
  CHECK ("contractEndDate" >= "contractStartDate");

ALTER TABLE public.workplace
  DROP CONSTRAINT IF EXISTS workplace_billing_period_required_check;
ALTER TABLE public.workplace
  ADD CONSTRAINT workplace_billing_period_required_check
  CHECK (
    "billingPeriod" IS NULL
    OR "billingPeriod" IN ('monthly', 'quarterly', 'half_yearly', 'yearly')
  );

-- Prefer required billingPeriod for new rows via app validation; keep NULL allowed for legacy.

-- ---------------------------------------------------------------------------
-- enrollment codes: multi-active; uniqueness among active only
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_workplace_enrollment_one_active;
DROP INDEX IF EXISTS public.idx_workplace_enrollment_code_normalized;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workplace_enrollment_active_code_normalized
  ON public."workplaceEnrollmentCode" (upper(btrim(code)))
  WHERE "isActive" = true;

-- ---------------------------------------------------------------------------
-- audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."adminOrgAuditLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  "workplaceId" UUID NULL REFERENCES public.workplace(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  field TEXT NULL,
  "oldValue" TEXT NULL,
  "newValue" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_org_audit_workplace_created
  ON public."adminOrgAuditLog" ("workplaceId", "createdAt" DESC);

ALTER TABLE public."adminOrgAuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings admin selects adminOrgAuditLog" ON public."adminOrgAuditLog";
CREATE POLICY "Settings admin selects adminOrgAuditLog"
  ON public."adminOrgAuditLog"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

GRANT SELECT ON public."adminOrgAuditLog" TO authenticated;
GRANT ALL ON public."adminOrgAuditLog" TO service_role;

CREATE OR REPLACE FUNCTION public.write_admin_org_audit(
  p_actor_user_id UUID,
  p_workplace_id UUID,
  p_action TEXT,
  p_field TEXT DEFAULT NULL,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."adminOrgAuditLog" (
    "actorUserId", "workplaceId", action, field, "oldValue", "newValue"
  ) VALUES (
    p_actor_user_id, p_workplace_id, p_action, p_field, p_old_value, p_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_org_audit(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.write_admin_org_audit(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.write_admin_org_audit(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.workplace_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."seatCount" IS DISTINCT FROM OLD."seatCount" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'seatCount', OLD."seatCount"::text, NEW."seatCount"::text);
    END IF;
    IF NEW."billingModel" IS DISTINCT FROM OLD."billingModel" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'billingModel', OLD."billingModel", NEW."billingModel");
    END IF;
    IF NEW."price" IS DISTINCT FROM OLD."price" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'price', OLD."price"::text, NEW."price"::text);
    END IF;
    IF NEW."billingPeriod" IS DISTINCT FROM OLD."billingPeriod" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'billingPeriod', OLD."billingPeriod", NEW."billingPeriod");
    END IF;
    IF NEW."contractEndDate" IS DISTINCT FROM OLD."contractEndDate" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'contractEndDate', OLD."contractEndDate"::text, NEW."contractEndDate"::text);
    END IF;
    IF NEW."isActive" IS DISTINCT FROM OLD."isActive" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'isActive', OLD."isActive"::text, NEW."isActive"::text);
    END IF;
    IF NEW."paymentMethod" IS DISTINCT FROM OLD."paymentMethod" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'paymentMethod', OLD."paymentMethod", NEW."paymentMethod");
    END IF;
    IF NEW."maxSeats" IS DISTINCT FROM OLD."maxSeats" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'maxSeats', OLD."maxSeats"::text, NEW."maxSeats"::text);
    END IF;
    IF NEW."invoiceStatus" IS DISTINCT FROM OLD."invoiceStatus" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'invoiceStatus', OLD."invoiceStatus", NEW."invoiceStatus");
    END IF;
    IF NEW."contractTier" IS DISTINCT FROM OLD."contractTier" THEN
      PERFORM public.write_admin_org_audit(v_actor, NEW.id, 'workplace_update', 'contractTier', OLD."contractTier", NEW."contractTier");
      -- Immediate entitlement flip for enrolled members
      PERFORM set_config('app.enterprise_sync', 'true', true);
      UPDATE public.profiles p
      SET "enterpriseTier" = CASE
            WHEN lower(NEW."contractTier") = 'premium' THEN 'premium'
            ELSE 'pro'
          END,
          tier = CASE
            WHEN lower(NEW."contractTier") = 'premium' THEN 'premium'
            ELSE 'pro'
          END,
          subscribed = true
      WHERE p."workplaceId" = NEW.id
        AND p."accountType" = 'enterprise';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workplace_audit ON public.workplace;
CREATE TRIGGER trg_workplace_audit
  AFTER UPDATE ON public.workplace
  FOR EACH ROW
  EXECUTE FUNCTION public.workplace_audit_trigger();

-- ---------------------------------------------------------------------------
-- Hard enrollment seat limit helper
-- flat_rate → seatCount; pay_per_active → maxSeats if set, else NULL (no hard cap)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workplace_hard_seat_limit(
  p_billing_model TEXT,
  p_seat_count INTEGER,
  p_max_seats INTEGER
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_billing_model, 'flat_rate')) = 'pay_per_active' THEN p_max_seats
    WHEN coalesce(p_seat_count, 0) > 0 THEN p_seat_count
    ELSE NULL
  END;
$$;

-- ---------------------------------------------------------------------------
-- Update redeem + assign to respect billing model / maxSeats + 6–8 codes
-- ---------------------------------------------------------------------------
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
  v_hard_limit integer;
  v_tier text;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Accept optional single hyphen; effective length 6–8 after normalizing hyphen out for length check
  IF length(replace(v_code, '-', '')) < 6
     OR length(replace(v_code, '-', '')) > 8
     OR v_code !~ '^[A-Z0-9]+(-[A-Z0-9]+)?$'
     OR length(v_code) < 6
     OR length(v_code) > 8 THEN
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
  v_hard_limit := public.workplace_hard_seat_limit(
    v_workplace."billingModel",
    v_workplace."seatCount",
    v_workplace."maxSeats"
  );

  IF v_hard_limit IS NOT NULL AND v_active_seats >= v_hard_limit THEN
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

CREATE OR REPLACE FUNCTION public.enroll_profile_in_workplace(
  p_workplace_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workplace public.workplace%ROWTYPE;
  v_active_seats integer;
  v_hard_limit integer;
  v_tier text;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF p_target_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is required.', 'status', 400);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_target_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User not found.', 'status', 404);
  END IF;

  SELECT w.*
  INTO v_workplace
  FROM public.workplace w
  WHERE w.id = p_workplace_id
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
    WHERE p.id = p_target_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" IS NOT NULL
      AND p."workplaceId" <> p_workplace_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'User is already enrolled with another organization.', 'status', 409);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_target_user_id
      AND p."accountType" = 'enterprise'
      AND p."workplaceId" = p_workplace_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'alreadyEnrolled', true, 'workplaceId', p_workplace_id);
  END IF;

  SELECT public.count_workplace_active_seats(p_workplace_id) INTO v_active_seats;
  v_hard_limit := public.workplace_hard_seat_limit(
    v_workplace."billingModel",
    v_workplace."seatCount",
    v_workplace."maxSeats"
  );

  IF v_hard_limit IS NOT NULL AND v_active_seats >= v_hard_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Organization seats are full.',
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
      "workplaceId" = p_workplace_id,
      "enterpriseTier" = v_tier,
      "enrollmentDate" = coalesce("enrollmentDate", now()),
      subscribed = true,
      tier = v_tier
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'alreadyEnrolled', false,
    'workplaceId', p_workplace_id,
    'enterpriseTier', v_tier
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_workplace_member_to_workplace(
  p_workplace_id UUID,
  p_target_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT public.can_manage_workplace_members(p_workplace_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN public.enroll_profile_in_workplace(p_workplace_id, p_target_user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Peek join code (public validation for /join/:code) — no enrollment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.peek_workplace_enrollment_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_code_row public."workplaceEnrollmentCode"%ROWTYPE;
  v_workplace public.workplace%ROWTYPE;
  v_active_seats integer;
  v_hard_limit integer;
  v_today date := timezone('utc', now())::date;
BEGIN
  IF length(replace(v_code, '-', '')) < 6
     OR length(replace(v_code, '-', '')) > 8
     OR v_code !~ '^[A-Z0-9]+(-[A-Z0-9]+)?$'
     OR length(v_code) < 6
     OR length(v_code) > 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive enrollment code.', 'status', 404);
  END IF;

  SELECT c.* INTO v_code_row
  FROM public."workplaceEnrollmentCode" c
  WHERE c."isActive" = true
    AND upper(btrim(c.code)) = v_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or inactive enrollment code.', 'status', 404);
  END IF;

  SELECT w.* INTO v_workplace
  FROM public.workplace w
  WHERE w.id = v_code_row."workplaceId";

  IF NOT FOUND OR v_workplace."isActive" IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractStartDate" IS NOT NULL AND v_workplace."contractStartDate" > v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  IF v_workplace."contractEndDate" IS NOT NULL AND v_workplace."contractEndDate" < v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This organization''s enrollment is not active.', 'status', 400);
  END IF;

  SELECT public.count_workplace_active_seats(v_workplace.id) INTO v_active_seats;
  v_hard_limit := public.workplace_hard_seat_limit(
    v_workplace."billingModel",
    v_workplace."seatCount",
    v_workplace."maxSeats"
  );

  IF v_hard_limit IS NOT NULL AND v_active_seats >= v_hard_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Your organization''s seats are full. Contact your HR team.',
      'status', 409,
      'seatsFull', true
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'workplaceId', v_workplace.id,
    'workplaceName', v_workplace.name,
    'code', v_code_row.code,
    'contractTier', v_workplace."contractTier"
  );
END;
$$;

REVOKE ALL ON FUNCTION public.peek_workplace_enrollment_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_workplace_enrollment_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.peek_workplace_enrollment_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.peek_workplace_enrollment_code(text) TO service_role;

-- ---------------------------------------------------------------------------
-- US-208 — monthly active enterprise users per org
-- Active = enrolled enterprise member with ≥1 of:
--   chatConversation, pathSessionCompletion, journalEntry, assessmentResult, dailyCheckin
-- in the calendar month (UTC).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_workplace_monthly_active_users(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  workplace_id UUID,
  workplace_name TEXT,
  billing_model TEXT,
  billing_period TEXT,
  seat_count INTEGER,
  max_seats INTEGER,
  price NUMERIC,
  enrolled_count INTEGER,
  active_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_year < 2000 OR p_year > 2100 OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'invalid period';
  END IF;

  v_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_end := v_start + INTERVAL '1 month';

  RETURN QUERY
  WITH enrolled AS (
    SELECT p.id AS user_id, p."workplaceId" AS wid
    FROM public.profiles p
    WHERE p."accountType" = 'enterprise'
      AND p."workplaceId" IS NOT NULL
  ),
  active_users AS (
    SELECT DISTINCT e.user_id, e.wid
    FROM enrolled e
    WHERE EXISTS (
      SELECT 1 FROM public."chatConversation" c
      WHERE c."userId" = e.user_id
        AND c."createdAt" >= v_start AND c."createdAt" < v_end
    )
    OR EXISTS (
      SELECT 1 FROM public."pathSessionCompletion" psc
      WHERE psc."userId" = e.user_id
        AND psc."createdAt" >= v_start AND psc."createdAt" < v_end
    )
    OR EXISTS (
      SELECT 1 FROM public."journalEntry" j
      WHERE j."userId" = e.user_id
        AND j."createdAt" >= v_start AND j."createdAt" < v_end
    )
    OR EXISTS (
      SELECT 1 FROM public."assessmentResult" ar
      WHERE ar."userId" = e.user_id
        AND ar."createdAt" >= v_start AND ar."createdAt" < v_end
    )
    OR EXISTS (
      SELECT 1 FROM public."dailyCheckin" d
      WHERE d."userId" = e.user_id
        AND d."createdAt" >= v_start AND d."createdAt" < v_end
    )
  )
  SELECT
    w.id,
    w.name,
    w."billingModel",
    w."billingPeriod",
    w."seatCount",
    w."maxSeats",
    w.price,
    (SELECT count(*)::integer FROM enrolled e WHERE e.wid = w.id),
    (SELECT count(*)::integer FROM active_users a WHERE a.wid = w.id)
  FROM public.workplace w
  ORDER BY w.name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_workplace_monthly_active_users(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_workplace_monthly_active_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_workplace_monthly_active_users(INTEGER, INTEGER) TO service_role;

-- Period active count for a single workplace (org detail).
CREATE OR REPLACE FUNCTION public.count_workplace_period_active_users(
  p_workplace_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER := coalesce(p_year, extract(year from timezone('utc', now()))::integer);
  v_month INTEGER := coalesce(p_month, extract(month from timezone('utc', now()))::integer);
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF NOT (
    public.is_settings_admin()
    OR public.is_workplace_hr_contact(p_workplace_id)
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_start := make_timestamptz(v_year, v_month, 1, 0, 0, 0, 'UTC');
  v_end := v_start + INTERVAL '1 month';

  SELECT count(DISTINCT p.id)::integer INTO v_count
  FROM public.profiles p
  WHERE p."workplaceId" = p_workplace_id
    AND p."accountType" = 'enterprise'
    AND (
      EXISTS (
        SELECT 1 FROM public."chatConversation" c
        WHERE c."userId" = p.id AND c."createdAt" >= v_start AND c."createdAt" < v_end
      )
      OR EXISTS (
        SELECT 1 FROM public."pathSessionCompletion" psc
        WHERE psc."userId" = p.id AND psc."createdAt" >= v_start AND psc."createdAt" < v_end
      )
      OR EXISTS (
        SELECT 1 FROM public."journalEntry" j
        WHERE j."userId" = p.id AND j."createdAt" >= v_start AND j."createdAt" < v_end
      )
      OR EXISTS (
        SELECT 1 FROM public."assessmentResult" ar
        WHERE ar."userId" = p.id AND ar."createdAt" >= v_start AND ar."createdAt" < v_end
      )
      OR EXISTS (
        SELECT 1 FROM public."dailyCheckin" d
        WHERE d."userId" = p.id AND d."createdAt" >= v_start AND d."createdAt" < v_end
      )
    );

  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.count_workplace_period_active_users(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_workplace_period_active_users(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_workplace_period_active_users(UUID, INTEGER, INTEGER) TO service_role;
