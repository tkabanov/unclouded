-- Sync canReassessOnDemand when upgrading to Premium after a completed reassessment.
CREATE OR REPLACE FUNCTION public.billing_webhook_set_entitlement(
  p_user_id uuid,
  p_subscribed boolean,
  p_tier text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text := lower(btrim(coalesce(p_tier, '')));
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_required';
  END IF;

  PERFORM set_config('app.billing_sync', 'true', true);

  UPDATE profiles
  SET subscribed = coalesce(p_subscribed, false),
      tier = CASE
        WHEN v_tier IN ('free', 'explorer', 'pro', 'premium') THEN v_tier
        WHEN coalesce(p_subscribed, false) THEN 'pro'
        ELSE 'free'
      END,
      "canReassessOnDemand" = CASE
        WHEN (
          CASE
            WHEN v_tier IN ('free', 'explorer', 'pro', 'premium') THEN v_tier
            WHEN coalesce(p_subscribed, false) THEN 'pro'
            ELSE 'free'
          END
        ) = 'premium'
          AND "reassessmentCompletedAt" IS NOT NULL THEN true
        WHEN (
          CASE
            WHEN v_tier IN ('free', 'explorer', 'pro', 'premium') THEN v_tier
            WHEN coalesce(p_subscribed, false) THEN 'pro'
            ELSE 'free'
          END
        ) IN ('free', 'pro', 'explorer') THEN false
        ELSE "canReassessOnDemand"
      END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'user_id', p_user_id,
    'subscribed', p_subscribed,
    'tier', (SELECT tier FROM profiles WHERE id = p_user_id)
  );
END;
$$;

-- Backfill Premium users who completed reassessment while on Pro.
UPDATE public.profiles
SET "canReassessOnDemand" = true
WHERE LOWER(COALESCE(tier, '')) = 'premium'
  AND "reassessmentCompletedAt" IS NOT NULL
  AND "canReassessOnDemand" IS DISTINCT FROM true;
