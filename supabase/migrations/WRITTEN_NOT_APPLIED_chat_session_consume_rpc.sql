-- WRITTEN NOT APPLIED — T-005 optional follow-up
-- Atomic Free-tier session consume via SECURITY DEFINER RPC.
-- Apply only after PM review; edge tierGate.ts currently uses service-role read-modify-write.

CREATE OR REPLACE FUNCTION public.consume_chat_session(
  p_user_id uuid,
  p_conversation_id text,
  p_month_key text,
  p_limit int DEFAULT 3
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
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT "onboardingData", tier, subscribed
  INTO v_onboarding, v_tier, v_subscribed
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_subscribed IS TRUE OR lower(coalesce(v_tier, 'free')) NOT IN ('free', 'explorer', '') THEN
    RETURN jsonb_build_object('allowed', true, 'recorded', false);
  END IF;

  v_usage := coalesce(v_onboarding -> 'chat_ai_monthly_usage', '{}'::jsonb);

  IF coalesce(v_usage ->> 'monthKey', '') <> p_month_key THEN
    v_ids := '[]'::jsonb;
  ELSE
    v_ids := coalesce(v_usage -> 'sessionConversationIds', '[]'::jsonb);
  END IF;

  IF v_ids ? p_conversation_id THEN
    RETURN jsonb_build_object('allowed', true, 'recorded', false);
  END IF;

  IF jsonb_array_length(v_ids) >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'free_tier_session_limit');
  END IF;

  v_ids := v_ids || to_jsonb(p_conversation_id);
  v_onboarding := jsonb_set(
    coalesce(v_onboarding, '{}'::jsonb),
    '{chat_ai_monthly_usage}',
    jsonb_build_object('monthKey', p_month_key, 'sessionConversationIds', v_ids),
    true
  );

  UPDATE profiles SET "onboardingData" = v_onboarding WHERE id = p_user_id;

  RETURN jsonb_build_object('allowed', true, 'recorded', true);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_chat_session(uuid, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_chat_session(uuid, text, text, int) TO authenticated;
