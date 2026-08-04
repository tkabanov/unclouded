-- Wix Bookings webhook processing for Premium 1:1 credit hold → redeem/release.

CREATE TABLE IF NOT EXISTS public."wixWebhookEvent" (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public."wixWebhookEvent" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."wixWebhookEvent" FROM PUBLIC;
GRANT ALL ON TABLE public."wixWebhookEvent" TO service_role;

/**
 * Resolve a pending `coachBooking` from Wix webhook metadata.
 *
 * Priority: explicit internal UUID → Wix booking id on externalBookingRef →
 * contact email on the member's most recent pending 1:1 request.
 */
CREATE OR REPLACE FUNCTION public.wix_resolve_coach_booking(
  p_wix_booking_id TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_internal_booking_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_user_id UUID;
BEGIN
  IF p_internal_booking_id IS NOT NULL THEN
    SELECT id INTO v_booking_id
    FROM public."coachBooking"
    WHERE id = p_internal_booking_id
      AND status = 'pending'
    LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
      RETURN v_booking_id;
    END IF;
  END IF;

  IF p_wix_booking_id IS NOT NULL AND btrim(p_wix_booking_id) <> '' THEN
    SELECT id INTO v_booking_id
    FROM public."coachBooking"
    WHERE "externalBookingRef" = btrim(p_wix_booking_id)
      AND status IN ('pending', 'confirmed')
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF v_booking_id IS NOT NULL THEN
      RETURN v_booking_id;
    END IF;
  END IF;

  IF p_contact_email IS NULL OR btrim(p_contact_email) = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO v_user_id
  FROM public.profiles p
  WHERE lower(btrim(p.email)) = lower(btrim(p_contact_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_booking_id
  FROM public."coachBooking"
  WHERE "userId" = v_user_id
    AND status = 'pending'
  ORDER BY "createdAt" DESC
  LIMIT 1;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.wix_resolve_coach_booking(TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wix_resolve_coach_booking(TEXT, TEXT, UUID) TO service_role;

/**
 * Apply a Wix booking lifecycle event to Premium credit holds.
 *
 * Confirmed → mark booking confirmed and redeem credits.
 * Canceled / declined → release hold and return credits.
 */
CREATE OR REPLACE FUNCTION public.wix_process_coach_booking_event(
  p_event_id TEXT,
  p_event_slug TEXT,
  p_wix_booking_id TEXT,
  p_contact_email TEXT DEFAULT NULL,
  p_internal_booking_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_slug TEXT := lower(btrim(coalesce(p_event_slug, '')));
  v_redeem jsonb;
  v_release jsonb;
BEGIN
  IF p_event_id IS NULL OR btrim(p_event_id) = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'event_id_required');
  END IF;

  BEGIN
    INSERT INTO public."wixWebhookEvent" (id, type)
    VALUES (btrim(p_event_id), coalesce(v_slug, 'unknown'));
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', true, 'code', 'duplicate_event');
  END;

  v_booking_id := public.wix_resolve_coach_booking(
    p_wix_booking_id,
    p_contact_email,
    p_internal_booking_id
  );

  IF v_booking_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'booking_not_found');
  END IF;

  IF p_wix_booking_id IS NOT NULL AND btrim(p_wix_booking_id) <> '' THEN
    UPDATE public."coachBooking"
    SET "externalBookingRef" = btrim(p_wix_booking_id)
    WHERE id = v_booking_id
      AND ("externalBookingRef" IS NULL OR "externalBookingRef" = btrim(p_wix_booking_id));
  END IF;

  IF v_slug IN ('confirmed', 'booking_confirmed', 'confirm') THEN
    UPDATE public."coachBooking"
    SET status = 'confirmed',
        "confirmedAt" = coalesce("confirmedAt", now())
    WHERE id = v_booking_id
      AND status = 'pending';

    v_redeem := public.redeem_premium_credits_for_booking(v_booking_id);

    RETURN jsonb_build_object(
      'ok', true,
      'code', 'confirmed',
      'bookingId', v_booking_id,
      'redeem', v_redeem
    );
  END IF;

  IF v_slug IN ('canceled', 'cancelled', 'declined', 'booking_canceled', 'booking_cancelled') THEN
    v_release := public.release_one_on_one_booking_hold(
      v_booking_id,
      'Wix booking canceled — credits returned.'
    );

    RETURN jsonb_build_object(
      'ok', true,
      'code', 'canceled',
      'bookingId', v_booking_id,
      'release', v_release
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ignored',
    'bookingId', v_booking_id,
    'slug', v_slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wix_process_coach_booking_event(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wix_process_coach_booking_event(TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
