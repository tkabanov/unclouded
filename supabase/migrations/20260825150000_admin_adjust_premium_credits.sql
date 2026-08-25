-- NCLDD-31 §7 — Admin manual premium credit adjustments (adminAdjustment ledger).

/**
 * Settings admin: add or remove Premium credits for a user.
 * Writes premiumCreditLedger.reason = 'adminAdjustment' with a required note.
 * Rejects adjustments that would drive balance below zero.
 */
CREATE OR REPLACE FUNCTION public.admin_adjust_premium_credits(
  p_user_id UUID,
  p_delta INTEGER,
  p_note TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_note text;
  v_balance integer;
  v_ledger_id uuid;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'user_required',
      'error', 'User id is required.'
    );
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'invalid_delta',
      'error', 'Credit delta must be a non-zero integer.'
    );
  END IF;

  IF abs(p_delta) > 100 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'delta_too_large',
      'error', 'Credit delta must be between -100 and 100.'
    );
  END IF;

  v_note := btrim(COALESCE(p_note, ''));
  IF v_note = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'note_required',
      'error', 'A note is required for manual credit adjustments.'
    );
  END IF;

  IF char_length(v_note) > 500 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'note_too_long',
      'error', 'Note must be 500 characters or fewer.'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'user_not_found',
      'error', 'User not found.'
    );
  END IF;

  v_balance := public.available_premium_credits(p_user_id);
  IF p_delta < 0 AND v_balance + p_delta < 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'insufficient_balance',
      'balance', v_balance,
      'error', format(
        'Cannot remove %s credit%s; user only has %s.',
        abs(p_delta),
        CASE WHEN abs(p_delta) = 1 THEN '' ELSE 's' END,
        v_balance
      )
    );
  END IF;

  INSERT INTO public."premiumCreditLedger" ("userId", delta, reason, note)
  VALUES (
    p_user_id,
    p_delta,
    'adminAdjustment',
    format('Admin %s: %s', v_admin_id::text, v_note)
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledgerId', v_ledger_id,
    'delta', p_delta,
    'balance', public.available_premium_credits(p_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_adjust_premium_credits(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_premium_credits(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_premium_credits(UUID, INTEGER, TEXT) TO service_role;

COMMENT ON FUNCTION public.admin_adjust_premium_credits(UUID, INTEGER, TEXT) IS
  'NCLDD-31 §7: settings admin add/remove Premium credits; writes adminAdjustment ledger row.';
