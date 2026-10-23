-- NCLDD-64 / OVR-080: Free tier AI coaching sessions cut from 7 to 3 per UTC calendar month.
-- Same body as 20260727140000_paid_feature_server_enforcement.sql; only v_limit changes.
-- Applies from the current month: a Free user who already used 3+ sessions is blocked until the 1st.

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
  v_limit int := 3;
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
