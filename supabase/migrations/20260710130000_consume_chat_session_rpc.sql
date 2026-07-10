-- T-007: Atomic Free-tier session consume via SECURITY DEFINER RPC.
-- PM REVIEW REQUIRED — do NOT apply (`supabase db push` / MCP apply_migration) until PM accepts this SQL.

-- Fix camelCase rename drift: profiles."updatedAt" vs trigger still setting updated_at.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_jsonb(NEW) ? 'updatedAt' THEN
    NEW."updatedAt" = now();
  ELSIF to_jsonb(NEW) ? 'updated_at' THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
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

  SELECT "onboardingData", tier, subscribed
  INTO v_onboarding, v_tier, v_subscribed
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_subscribed IS TRUE OR lower(coalesce(v_tier, 'free')) NOT IN ('free', 'explorer', '') THEN
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
