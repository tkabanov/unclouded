-- Individual Subscription Management Flow — daily lifecycle sweep.
--
-- Stripe drives the money; this cron drives the state that Stripe does not own:
-- applying cancellations and downgrades whose date has passed, closing exhausted
-- grace periods, converting Founding Members off the discount after 12 months,
-- releasing credit holds for bookings that never happened, and sending the
-- payment-failure / ending-soon emails.
--
-- Requires the vault secret `subscription_lifecycle_cron_secret` (ops, not git).
-- Schedule (UTC): daily-subscription-lifecycle 17:00

-- Email de-duplication stamps.
ALTER TABLE public."userSubscription"
  ADD COLUMN IF NOT EXISTS "paymentFailureEmailedAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "endingSoonEmailedAt" TIMESTAMPTZ NULL;

/**
 * Clear a notification stamp once the situation it described is over, so the
 * next failure or the next scheduled end is announced again.
 */
CREATE OR REPLACE FUNCTION public.reset_subscription_notice_stamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'pastDue' THEN
    NEW."paymentFailureEmailedAt" := NULL;
  END IF;

  IF NEW."cancelAtPeriodEnd" = false AND NEW."scheduledDowngradeTier" IS NULL THEN
    NEW."endingSoonEmailedAt" := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_subscription_reset_notice_stamps ON public."userSubscription";
CREATE TRIGGER user_subscription_reset_notice_stamps
  BEFORE UPDATE ON public."userSubscription"
  FOR EACH ROW EXECUTE FUNCTION public.reset_subscription_notice_stamps();

-- ---------------------------------------------------------------------------
-- Work queue for the sweep
-- ---------------------------------------------------------------------------

/**
 * Everything whose scheduled moment has arrived, in one round trip.
 *
 * `convertFounding` needs a Stripe price swap before the row can be updated, so
 * it is returned for the edge function to act on rather than applied here.
 */
CREATE OR REPLACE FUNCTION public.billing_list_lifecycle_due(
  p_ending_soon_within INTERVAL DEFAULT interval '3 days',
  p_limit INTEGER DEFAULT 500
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH due AS (
    SELECT
      s."userId",
      'expireCancellation' AS kind,
      s."currentPeriodEnd" AS "dueAt",
      s."planTier",
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s.status = 'scheduledToCancel'
      AND s."currentPeriodEnd" IS NOT NULL
      AND s."currentPeriodEnd" <= now()

    UNION ALL

    SELECT
      s."userId",
      'applyDowngrade',
      s."scheduledDowngradeEffectiveAt",
      s."scheduledDowngradeTier",
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s."scheduledDowngradeTier" IS NOT NULL
      AND s."scheduledDowngradeEffectiveAt" IS NOT NULL
      AND s."scheduledDowngradeEffectiveAt" <= now()

    UNION ALL

    SELECT
      s."userId",
      'closeGracePeriod',
      s."gracePeriodEndsAt",
      s."planTier",
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s.status = 'pastDue'
      AND s."gracePeriodEndsAt" IS NOT NULL
      AND s."gracePeriodEndsAt" <= now()

    UNION ALL

    SELECT
      s."userId",
      'convertFounding',
      s."foundingDiscountEndsAt",
      s."planTier",
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s."isFoundingMember" = true
      AND s."foundingDiscountEndsAt" IS NOT NULL
      AND s."foundingDiscountEndsAt" <= now()
      AND s.status IN ('active', 'scheduledToCancel', 'scheduledToDowngrade', 'pastDue')

    UNION ALL

    -- Notices: payment failed, and paid access ending within the window.
    SELECT
      s."userId",
      'notifyPaymentFailure',
      s."gracePeriodEndsAt",
      s."planTier",
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s.status = 'pastDue'
      AND s."paymentFailureEmailedAt" IS NULL
      AND (s."gracePeriodEndsAt" IS NULL OR s."gracePeriodEndsAt" > now())

    UNION ALL

    SELECT
      s."userId",
      'notifyEndingSoon',
      coalesce(s."scheduledDowngradeEffectiveAt", s."currentPeriodEnd"),
      coalesce(s."scheduledDowngradeTier", 'free'),
      s."billingInterval"
    FROM public."userSubscription" s
    WHERE s."endingSoonEmailedAt" IS NULL
      AND (s."cancelAtPeriodEnd" = true OR s."scheduledDowngradeTier" IS NOT NULL)
      AND coalesce(s."scheduledDowngradeEffectiveAt", s."currentPeriodEnd") IS NOT NULL
      AND coalesce(s."scheduledDowngradeEffectiveAt", s."currentPeriodEnd")
            BETWEEN now() AND now() + p_ending_soon_within
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId', d."userId",
        'kind', d.kind,
        'dueAt', d."dueAt",
        'planTier', d."planTier",
        'billingInterval', d."billingInterval",
        'email', p.email,
        'firstName', p."firstName",
        'stripeSubscriptionId', s."stripeSubscriptionId",
        'gracePeriodEndsAt', s."gracePeriodEndsAt"
      )
      ORDER BY d."dueAt"
    ),
    '[]'::jsonb
  )
  FROM (SELECT * FROM due ORDER BY "dueAt" LIMIT greatest(1, least(coalesce(p_limit, 500), 2000))) d
  JOIN public."userSubscription" s ON s."userId" = d."userId"
  JOIN public.profiles p ON p.id = d."userId";
$$;

REVOKE ALL ON FUNCTION public.billing_list_lifecycle_due(INTERVAL, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_list_lifecycle_due(INTERVAL, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.billing_mark_lifecycle_notice_sent(
  p_user_id UUID,
  p_kind TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_kind = 'notifyPaymentFailure' THEN
    UPDATE public."userSubscription"
    SET "paymentFailureEmailedAt" = now()
    WHERE "userId" = p_user_id;
  ELSIF p_kind = 'notifyEndingSoon' THEN
    UPDATE public."userSubscription"
    SET "endingSoonEmailedAt" = now()
    WHERE "userId" = p_user_id;
  ELSE
    RAISE EXCEPTION 'unknown_notice_kind: %', p_kind;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_mark_lifecycle_notice_sent(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_mark_lifecycle_notice_sent(UUID, TEXT) TO service_role;

/**
 * Return credits reserved for 1:1 bookings that were never confirmed.
 *
 * Without this a stalled booking would hold two credits forever, which reads to
 * the member as credits that silently vanished.
 */
CREATE OR REPLACE FUNCTION public.billing_release_stale_booking_holds(
  p_older_than INTERVAL DEFAULT interval '14 days'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_released integer := 0;
BEGIN
  FOR v_booking IN
    SELECT b.id
    FROM public."coachBooking" b
    WHERE b.status = 'pending'
      AND b."createdAt" < now() - p_older_than
      AND EXISTS (
        SELECT 1 FROM public."premiumCreditLedger" l
        WHERE l."coachBookingId" = b.id AND l.reason = 'hold'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public."premiumCreditLedger" l
        WHERE l."coachBookingId" = b.id AND l.reason IN ('holdRelease', 'redemption')
      )
  LOOP
    PERFORM public.release_one_on_one_booking_hold(
      v_booking.id,
      'Session was never confirmed — credits returned.'
    );
    v_released := v_released + 1;
  END LOOP;

  RETURN jsonb_build_object('status', 'ok', 'released', v_released);
END;
$$;

REVOKE ALL ON FUNCTION public.billing_release_stale_booking_holds(INTERVAL) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_release_stale_booking_holds(INTERVAL) TO service_role;

-- ---------------------------------------------------------------------------
-- Cron wiring
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invoke_scheduled_edge_function(function_slug text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'net', 'cron', 'pg_catalog'
AS $function$
DECLARE
  project_url text;
  service_role_key text;
  cron_secret text;
  secret_name text;
  request_id bigint;
  headers jsonb;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'edge_cron_service_role_key'
  LIMIT 1;

  IF project_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'invoke_scheduled_edge_function(%): missing vault secrets project_url or edge_cron_service_role_key', function_slug;
    RETURN NULL;
  END IF;

  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
  );

  secret_name := CASE function_slug
    WHEN 'module-unlock' THEN 'module_unlock_cron_secret'
    WHEN 'reassessment-due' THEN 'reassessment_due_cron_secret'
    WHEN 'vulnerable-outreach' THEN 'vulnerable_outreach_cron_secret'
    WHEN 'onboarding-dropoff' THEN 'onboarding_dropoff_cron_secret'
    WHEN 'subscription-lifecycle' THEN 'subscription_lifecycle_cron_secret'
    ELSE NULL
  END;

  IF secret_name IS NOT NULL THEN
    SELECT decrypted_secret INTO cron_secret
    FROM vault.decrypted_secrets
    WHERE name = secret_name
    LIMIT 1;

    IF cron_secret IS NOT NULL AND length(trim(cron_secret)) > 0 THEN
      headers := headers || jsonb_build_object('x-cron-secret', cron_secret);
    END IF;
  END IF;

  SELECT net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/' || function_slug,
    headers := headers,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  INTO request_id;

  RETURN request_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.invoke_scheduled_edge_function(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_scheduled_edge_function(text) TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-subscription-lifecycle') THEN
    PERFORM cron.schedule(
      'daily-subscription-lifecycle',
      '0 17 * * *',
      $cron$ SELECT public.invoke_scheduled_edge_function('subscription-lifecycle'); $cron$
    );
  END IF;
END;
$$;
