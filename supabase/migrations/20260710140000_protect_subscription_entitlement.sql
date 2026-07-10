-- T-010: Protect subscription entitlement columns; route tier changes through billing RPCs.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.

CREATE OR REPLACE FUNCTION public.profiles_protect_entitlement_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_setting('app.billing_sync', true) <> 'true' THEN
      NEW.subscribed := false;
      NEW.tier := 'free';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.subscribed IS DISTINCT FROM OLD.subscribed
       OR NEW.tier IS DISTINCT FROM OLD.tier THEN
      IF current_setting('app.billing_sync', true) = 'true' THEN
        RETURN NEW;
      END IF;
      NEW.subscribed := OLD.subscribed;
      NEW.tier := OLD.tier;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_entitlement_columns ON public.profiles;
CREATE TRIGGER profiles_protect_entitlement_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_entitlement_columns();

-- Defense in depth: authenticated clients cannot mutate entitlement columns directly.
REVOKE UPDATE (subscribed, tier) ON public.profiles FROM authenticated;

DROP POLICY IF EXISTS "Owner inserts profile" ON public.profiles;
CREATE POLICY "Owner inserts profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND subscribed IS NOT TRUE
    AND (tier IS NULL OR lower(tier) IN ('free', 'explorer', ''))
  );

CREATE OR REPLACE FUNCTION public.request_subscription_plan_change(p_plan_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan text := lower(btrim(coalesce(p_plan_id, '')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden';
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

REVOKE ALL ON FUNCTION public.request_subscription_plan_change(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_subscription_plan_change(text) TO authenticated;

REVOKE ALL ON FUNCTION public.billing_webhook_set_entitlement(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_webhook_set_entitlement(uuid, boolean, text) TO service_role;
