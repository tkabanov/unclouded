-- NCLDD-52 slice 2: monthly USD limits per plan/mode, per-user overrides, Restore baselines,
-- audit log, effective-limit resolver, admin mutations and the server-side budget check.
-- Additive only.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."aiPlanLimit" (
  "planTier" text NOT NULL CHECK ("planTier" IN ('free', 'pro', 'premium')),
  mode text NOT NULL CHECK (mode IN ('text', 'voice')),
  -- NULL = not set: no monetary limit for this plan/mode.
  "monthlyUsd" numeric(10, 2) CHECK ("monthlyUsd" IS NULL OR ("monthlyUsd" >= 0 AND "monthlyUsd" <= 100000)),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY ("planTier", mode)
);

INSERT INTO public."aiPlanLimit" ("planTier", mode)
SELECT t, m FROM unnest(ARRAY['free', 'pro', 'premium']) AS t, unnest(ARRAY['text', 'voice']) AS m
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public."aiUserLimitOverride" (
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('text', 'voice')),
  kind text NOT NULL CHECK (kind IN ('custom', 'unlimited')),
  "monthlyUsd" numeric(10, 2),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY ("userId", mode),
  CONSTRAINT "aiUserLimitOverride_amount_check" CHECK (
    (kind = 'custom' AND "monthlyUsd" IS NOT NULL AND "monthlyUsd" >= 0 AND "monthlyUsd" <= 100000)
    OR (kind = 'unlimited' AND "monthlyUsd" IS NULL)
  )
);

-- Restore = a spend baseline for the current month; used = monthSpend - latest baseline.
CREATE TABLE IF NOT EXISTS public."aiUserLimitRestore" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('text', 'voice')),
  "monthKey" text NOT NULL,
  "spendBaselineUsd" numeric(12, 6) NOT NULL CHECK ("spendBaselineUsd" >= 0),
  "createdBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "aiUserLimitRestore_user_month_idx"
  ON public."aiUserLimitRestore" ("userId", "monthKey", mode, "createdAt" DESC);

CREATE TABLE IF NOT EXISTS public."aiLimitAuditLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorUserId" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (
    action IN (
      'plan_limit_set', 'user_override_set', 'user_unlimited_set',
      'user_override_cleared', 'user_limit_restored'
    )
  ),
  "planTier" text,
  "targetUserId" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('text', 'voice')),
  "oldValue" jsonb,
  "newValue" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "aiLimitAuditLog_createdAt_idx" ON public."aiLimitAuditLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "aiLimitAuditLog_target_idx"
  ON public."aiLimitAuditLog" ("targetUserId", "createdAt" DESC);

-- RLS: tables are only reachable through definer RPCs; the audit log is also admin-readable.
ALTER TABLE public."aiPlanLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."aiUserLimitOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."aiUserLimitRestore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."aiLimitAuditLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public."aiPlanLimit", public."aiUserLimitOverride", public."aiUserLimitRestore",
  public."aiLimitAuditLog" FROM anon, authenticated;
GRANT ALL ON public."aiPlanLimit", public."aiUserLimitOverride", public."aiUserLimitRestore",
  public."aiLimitAuditLog" TO service_role;
GRANT SELECT ON public."aiLimitAuditLog" TO authenticated;

DROP POLICY IF EXISTS "Admin reads aiLimitAuditLog" ON public."aiLimitAuditLog";
CREATE POLICY "Admin reads aiLimitAuditLog" ON public."aiLimitAuditLog"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());

-- ---------------------------------------------------------------------------
-- Effective limit resolver (internal: no grant to authenticated)
-- ---------------------------------------------------------------------------

/** Billing tier normalised to the three limit tiers. */
CREATE OR REPLACE FUNCTION public.ai_limit_tier(p_user uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(public.effective_user_tier(p_user), 'free'))
    WHEN 'premium' THEN 'premium'
    WHEN 'pro' THEN 'pro'
    ELSE 'free'
  END;
$$;

REVOKE ALL ON FUNCTION public.ai_limit_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_limit_tier(uuid) TO service_role;

/**
 * Effective limit + current-month usage for one user and mode (text|voice).
 * Order: user override -> plan limit -> unset. Unlimited / unset never block.
 * Single source for the edge budget check and every admin screen.
 */
CREATE OR REPLACE FUNCTION public.ai_effective_limit(
  p_user uuid,
  p_mode text,
  p_month text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month text := coalesce(p_month, to_char(timezone('utc', now()), 'YYYY-MM'));
  v_tier text := public.ai_limit_tier(p_user);
  v_override public."aiUserLimitOverride"%ROWTYPE;
  v_limit numeric;
  v_source text;
  v_spend numeric;
  v_baseline numeric;
  v_used numeric;
BEGIN
  IF p_mode NOT IN ('text', 'voice') THEN
    RAISE EXCEPTION 'invalid mode' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_override
  FROM public."aiUserLimitOverride"
  WHERE "userId" = p_user AND mode = p_mode;

  IF FOUND THEN
    IF v_override.kind = 'unlimited' THEN
      v_source := 'unlimited';
      v_limit := NULL;
    ELSE
      v_source := 'custom';
      v_limit := v_override."monthlyUsd";
    END IF;
  ELSE
    SELECT "monthlyUsd" INTO v_limit
    FROM public."aiPlanLimit"
    WHERE "planTier" = v_tier AND mode = p_mode;
    v_source := CASE WHEN v_limit IS NULL THEN 'unset' ELSE 'plan' END;
  END IF;

  SELECT coalesce(sum("costUsd"), 0) INTO v_spend
  FROM public."aiUsageEvent"
  WHERE "userId" = p_user AND "monthKey" = v_month AND mode = p_mode;

  SELECT "spendBaselineUsd" INTO v_baseline
  FROM public."aiUserLimitRestore"
  WHERE "userId" = p_user AND mode = p_mode AND "monthKey" = v_month
  ORDER BY "createdAt" DESC
  LIMIT 1;

  v_used := greatest(v_spend - coalesce(v_baseline, 0), 0);

  RETURN jsonb_build_object(
    'mode', p_mode,
    'tier', v_tier,
    'source', v_source,
    'limitUsd', v_limit,
    'monthSpendUsd', v_spend,
    'baselineUsd', coalesce(v_baseline, 0),
    'usedUsd', v_used,
    'remainingUsd', CASE WHEN v_limit IS NULL THEN NULL ELSE greatest(v_limit - v_used, 0) END,
    'exceeded', v_limit IS NOT NULL AND v_used >= v_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ai_effective_limit(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_effective_limit(uuid, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Budget check used by edge functions (service_role only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_ai_budget(p_user uuid, p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eff jsonb;
BEGIN
  IF p_mode NOT IN ('text', 'voice') THEN
    -- 'other' is visible in the dashboard but never limited.
    RETURN jsonb_build_object(
      'allowed', true, 'tier', public.ai_limit_tier(p_user), 'remainingUsd', NULL
    );
  END IF;

  v_eff := public.ai_effective_limit(p_user, p_mode);
  IF (v_eff ->> 'exceeded')::boolean THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'code', 'ai_monthly_limit_reached',
      'mode', p_mode,
      'tier', v_eff ->> 'tier',
      'remainingUsd', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'mode', p_mode,
    'tier', v_eff ->> 'tier',
    'remainingUsd', v_eff -> 'remainingUsd'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_budget(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ai_budget(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Admin mutations (SECURITY DEFINER; change + audit row in one transaction)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_set_ai_plan_limit(
  p_tier text,
  p_mode text,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old numeric;
  v_new numeric := p_amount;
BEGIN
  IF v_actor IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_tier IS NULL OR p_tier NOT IN ('free', 'pro', 'premium') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_tier', 'error', 'Unknown plan.');
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('text', 'voice') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_mode', 'error', 'Unknown mode.');
  END IF;
  IF v_new IS NOT NULL AND (v_new < 0 OR v_new > 100000 OR v_new <> round(v_new, 2)) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_amount',
      'error', 'Amount must be between 0 and 100000 with at most 2 decimals.'
    );
  END IF;

  SELECT "monthlyUsd" INTO v_old
  FROM public."aiPlanLimit"
  WHERE "planTier" = p_tier AND mode = p_mode
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found', 'error', 'Limit row not found.');
  END IF;

  IF v_old IS NOT DISTINCT FROM v_new THEN
    RETURN jsonb_build_object(
      'ok', true, 'code', 'no_change',
      'before', jsonb_build_object('monthlyUsd', v_old),
      'after', jsonb_build_object('monthlyUsd', v_new)
    );
  END IF;

  UPDATE public."aiPlanLimit"
  SET "monthlyUsd" = v_new, "updatedAt" = now(), "updatedBy" = v_actor
  WHERE "planTier" = p_tier AND mode = p_mode;

  INSERT INTO public."aiLimitAuditLog" ("actorUserId", action, "planTier", mode, "oldValue", "newValue")
  VALUES (
    v_actor, 'plan_limit_set', p_tier, p_mode,
    jsonb_build_object('monthlyUsd', v_old), jsonb_build_object('monthlyUsd', v_new)
  );

  RETURN jsonb_build_object(
    'ok', true, 'code', 'updated',
    'before', jsonb_build_object('monthlyUsd', v_old),
    'after', jsonb_build_object('monthlyUsd', v_new)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_ai_user_limit(
  p_user uuid,
  p_mode text,
  p_kind text,
  p_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old public."aiUserLimitOverride"%ROWTYPE;
  v_had boolean;
  v_before jsonb;
  v_after jsonb;
  v_action text;
BEGIN
  IF v_actor IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'error', 'User not found.');
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('text', 'voice') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_mode', 'error', 'Unknown mode.');
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('plan', 'custom', 'unlimited') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_kind', 'error', 'Unknown limit type.');
  END IF;
  IF p_kind = 'custom' AND (
    p_amount IS NULL OR p_amount < 0 OR p_amount > 100000 OR p_amount <> round(p_amount, 2)
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_amount',
      'error', 'Amount must be between 0 and 100000 with at most 2 decimals.'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_mode, 52));

  SELECT * INTO v_old
  FROM public."aiUserLimitOverride"
  WHERE "userId" = p_user AND mode = p_mode;
  v_had := FOUND;

  v_before := CASE WHEN v_had
    THEN jsonb_build_object('kind', v_old.kind, 'monthlyUsd', v_old."monthlyUsd")
    ELSE jsonb_build_object('kind', 'plan', 'monthlyUsd', NULL) END;

  IF p_kind = 'plan' THEN
    v_after := jsonb_build_object('kind', 'plan', 'monthlyUsd', NULL);
    v_action := 'user_override_cleared';
    IF NOT v_had THEN
      RETURN jsonb_build_object('ok', true, 'code', 'no_change', 'before', v_before, 'after', v_after);
    END IF;
    DELETE FROM public."aiUserLimitOverride" WHERE "userId" = p_user AND mode = p_mode;
  ELSIF p_kind = 'unlimited' THEN
    v_after := jsonb_build_object('kind', 'unlimited', 'monthlyUsd', NULL);
    v_action := 'user_unlimited_set';
    IF v_had AND v_old.kind = 'unlimited' THEN
      RETURN jsonb_build_object('ok', true, 'code', 'no_change', 'before', v_before, 'after', v_after);
    END IF;
    INSERT INTO public."aiUserLimitOverride" ("userId", mode, kind, "monthlyUsd", "updatedBy")
    VALUES (p_user, p_mode, 'unlimited', NULL, v_actor)
    ON CONFLICT ("userId", mode) DO UPDATE
      SET kind = 'unlimited', "monthlyUsd" = NULL, "updatedAt" = now(), "updatedBy" = v_actor;
  ELSE
    v_after := jsonb_build_object('kind', 'custom', 'monthlyUsd', p_amount);
    v_action := 'user_override_set';
    IF v_had AND v_old.kind = 'custom' AND v_old."monthlyUsd" = p_amount THEN
      RETURN jsonb_build_object('ok', true, 'code', 'no_change', 'before', v_before, 'after', v_after);
    END IF;
    INSERT INTO public."aiUserLimitOverride" ("userId", mode, kind, "monthlyUsd", "updatedBy")
    VALUES (p_user, p_mode, 'custom', p_amount, v_actor)
    ON CONFLICT ("userId", mode) DO UPDATE
      SET kind = 'custom', "monthlyUsd" = p_amount, "updatedAt" = now(), "updatedBy" = v_actor;
  END IF;

  INSERT INTO public."aiLimitAuditLog" (
    "actorUserId", action, "targetUserId", "planTier", mode, "oldValue", "newValue"
  )
  VALUES (v_actor, v_action, p_user, public.ai_limit_tier(p_user), p_mode, v_before, v_after);

  RETURN jsonb_build_object('ok', true, 'code', 'updated', 'before', v_before, 'after', v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_ai_user_limit(p_user uuid, p_mode text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_eff jsonb;
  v_month text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'user_not_found', 'error', 'User not found.');
  END IF;
  IF p_mode IS NULL OR p_mode NOT IN ('text', 'voice') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_mode', 'error', 'Unknown mode.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_mode, 52));

  v_eff := public.ai_effective_limit(p_user, p_mode, v_month);
  v_before := jsonb_build_object(
    'usedUsd', v_eff -> 'usedUsd', 'remainingUsd', v_eff -> 'remainingUsd'
  );

  IF (v_eff ->> 'usedUsd')::numeric <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'code', 'no_change', 'before', v_before, 'after', v_before);
  END IF;

  INSERT INTO public."aiUserLimitRestore" ("userId", mode, "monthKey", "spendBaselineUsd", "createdBy")
  VALUES (p_user, p_mode, v_month, (v_eff ->> 'monthSpendUsd')::numeric, v_actor);

  v_eff := public.ai_effective_limit(p_user, p_mode, v_month);
  v_after := jsonb_build_object(
    'usedUsd', v_eff -> 'usedUsd', 'remainingUsd', v_eff -> 'remainingUsd'
  );

  INSERT INTO public."aiLimitAuditLog" (
    "actorUserId", action, "targetUserId", "planTier", mode, "oldValue", "newValue"
  )
  VALUES (
    v_actor, 'user_limit_restored', p_user, public.ai_limit_tier(p_user), p_mode, v_before, v_after
  );

  RETURN jsonb_build_object('ok', true, 'code', 'restored', 'before', v_before, 'after', v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_ai_plan_limit(text, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_ai_user_limit(uuid, text, text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_ai_user_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_plan_limit(text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_ai_user_limit(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_ai_user_limit(uuid, text) TO authenticated;
