-- Individual Subscription Management Flow — server-side enforcement of paid features (AC-28).
--
-- Every paid feature must be enforced where the client cannot reach it, and from
-- one source of truth: `effective_user_tier()`. Before this migration three
-- different sources were in use — `profiles.subscribed`, `profiles.tier`, and
-- the new subscription state machine — which meant a cancelled subscription
-- could still pass a gate that read the denormalized boolean.
--
-- Closed here:
--   * chat session limit read `profiles.subscribed` / `profiles.tier` directly
--   * path enrollment had no tier check at all (Pro/Premium paths were open)
--   * reassessment had no server gate (Free could insert a reassessment row)
--   * `billing_webhook_set_entitlement` could write entitlement behind the
--     subscription state machine's back

-- ---------------------------------------------------------------------------
-- Shared tier comparison
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tier_rank(p_tier TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(btrim(p_tier), 'free'))
    WHEN 'premium' THEN 2
    WHEN 'pro' THEN 1
    ELSE 0
  END;
$$;

GRANT EXECUTE ON FUNCTION public.tier_rank(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_rank(TEXT) TO service_role;

-- The parameterized resolvers answer questions about *any* user, so clients get
-- the `my_*` wrappers instead: a member has no business learning another
-- member's tier, credit balance, or reassessment eligibility. RLS policies use
-- the wrappers too, since `userOwnsRow` already pins the row to the caller.
REVOKE EXECUTE ON FUNCTION public.effective_user_tier(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.available_premium_credits(UUID) FROM authenticated;

/** True when the caller's effective tier is at least `p_required_tier`. */
CREATE OR REPLACE FUNCTION public.my_tier_allows(p_required_tier TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.tier_rank(public.effective_user_tier(auth.uid()))
       >= public.tier_rank(p_required_tier);
$$;

REVOKE ALL ON FUNCTION public.my_tier_allows(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_tier_allows(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_tier_allows(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- Free monthly AI session limit — now driven by effective tier
-- ---------------------------------------------------------------------------

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

  SELECT "onboardingData"
  INTO v_onboarding
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  -- Paid access is unlimited. `effective_user_tier` already covers enterprise
  -- (workplace contract) and keeps paid access through a scheduled cancellation
  -- or an open grace period.
  IF public.effective_user_tier(p_user_id) <> 'free' THEN
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

-- ---------------------------------------------------------------------------
-- Guided paths — Pro / Premium paths require the tier
-- ---------------------------------------------------------------------------

/** Tier required by a path; unknown or unset means Free. */
CREATE OR REPLACE FUNCTION public.path_required_tier(p_path_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(nullif(lower(btrim(p.tier)), ''), 'free')
  FROM public.path p
  WHERE p.id = p_path_id;
$$;

GRANT EXECUTE ON FUNCTION public.path_required_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.path_required_tier(UUID) TO service_role;

-- Enrolling was owner-only, so a Free client could enroll itself into a Premium
-- path and read its sessions through the enrollment-based policies.
DROP POLICY IF EXISTS "Owner inserts pathEnrollment" ON public."pathEnrollment";
CREATE POLICY "Owner with tier inserts pathEnrollment" ON public."pathEnrollment"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND public.my_tier_allows(coalesce(public.path_required_tier("pathId"), 'free'))
  );

-- Existing enrollments stay readable and updatable: a member who downgrades
-- keeps their history, and the catalog and detail views mark the path locked.

-- ---------------------------------------------------------------------------
-- Reassessment — Pro at 90 days, Premium on demand after day 30
-- ---------------------------------------------------------------------------

/**
 * Server-side mirror of `frontend/src/lib/reassessment/reassessmentEntitlements.ts`.
 *
 * Free is never eligible. Pro waits for `nextReassessmentDate` (90 days from the
 * last assessment). Premium may reassess on demand once 30 days have passed,
 * which is what `canReassessOnDemand` unlocks after the first reassessment.
 */
CREATE OR REPLACE FUNCTION public.user_can_reassess_now(
  p_user_id UUID DEFAULT auth.uid(),
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_profile record;
  v_anchor timestamptz;
  v_due timestamptz;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  v_tier := public.effective_user_tier(p_user_id);
  IF v_tier NOT IN ('pro', 'premium') THEN
    RETURN false;
  END IF;

  SELECT
    "lastAssessmentDate",
    "nextReassessmentDate",
    "onboardingCompletedAt",
    "canReassessOnDemand",
    "reassessmentCompletedAt"
  INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_anchor := coalesce(v_profile."lastAssessmentDate", v_profile."onboardingCompletedAt");
  IF v_anchor IS NULL THEN
    RETURN false;
  END IF;

  -- Premium on demand, once the 30-day floor has passed.
  IF v_tier = 'premium'
     AND (v_profile."canReassessOnDemand" IS TRUE
          OR v_profile."reassessmentCompletedAt" IS NOT NULL)
     AND p_now >= v_anchor + interval '30 days' THEN
    RETURN true;
  END IF;

  v_due := coalesce(v_profile."nextReassessmentDate", v_anchor + interval '90 days');
  RETURN p_now >= v_due;
END;
$$;

REVOKE ALL ON FUNCTION public.user_can_reassess_now(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_reassess_now(UUID, TIMESTAMPTZ) TO service_role;

/** Reassessment eligibility for the current user, for the dashboard CTA. */
CREATE OR REPLACE FUNCTION public.can_i_reassess_now()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_can_reassess_now(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.can_i_reassess_now() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_i_reassess_now() TO authenticated;

-- The initial assessment is part of onboarding and stays open to Free; only the
-- reassessment rows are gated.
DROP POLICY IF EXISTS "Owner inserts assessmentResult" ON public."assessmentResult";
CREATE POLICY "Owner inserts eligible assessmentResult" ON public."assessmentResult"
  FOR INSERT TO authenticated
  WITH CHECK (
    public.userOwnsRow("userId")
    AND ("isInitial" = true OR public.can_i_reassess_now())
  );

-- ---------------------------------------------------------------------------
-- Retire the pre-Stripe entitlement writer
-- ---------------------------------------------------------------------------

-- `userSubscription` is the source of truth and syncs `profiles.subscribed` /
-- `profiles.tier` by trigger. This RPC wrote those columns directly, so any use
-- of it would leave the state machine and the cache disagreeing.
DROP FUNCTION IF EXISTS public.billing_webhook_set_entitlement(uuid, boolean, text);
