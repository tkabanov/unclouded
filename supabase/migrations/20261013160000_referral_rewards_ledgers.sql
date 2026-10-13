-- NCLDD-56 slice 2: payment history, B2C referral coach credits, B2B partner commissions,
-- automatic reversal on refunds / disputes.
-- PM REVIEW REQUIRED — do NOT apply until PM accepts this SQL.
-- Depends on 20261013150000_referral_attribution_protection ("referralAttribution").
-- Deploy order: apply this migration BEFORE deploying the updated stripe-webhook function.
--
-- Writers: only the stripe-webhook edge function (service_role) through the SECURITY DEFINER
-- RPCs below, plus settings admins for partner terms. Readers: settings admins (RLS).
-- User / partner facing reads arrive in later slices as column-limited RPCs.
--
-- Rules (OVR-074):
--   * Qualifying payment = a paid Stripe subscription invoice for Pro/Premium with amount > 0.
--   * B2C: the organic referrer of the paying user gets exactly one coach credit per referred
--     user, on the first qualifying payment. Credits are a separate ledger from Premium credits.
--     A user attributed to a partner earns no B2C credit (partner attribution wins, as at signup).
--   * B2B: every qualifying invoice of a partner-attributed user gets one commission row. A
--     commission amount exists only under the partner's confirmed terms that were in effect at
--     payment time; otherwise the row stays "pending_terms" with no amount.
--   * Refunds / disputes: commission is reversed in proportion to (refunded + disputed) / paid.
--     The webhook always sends Stripe's CURRENT charge state (re-fetched), refunds only grow,
--     so out-of-order or retried events converge. A fully reversed qualifying payment takes the
--     B2C credit back if it is still unspent; a won dispute gives it back.
--   * No backfill, and no reward for conversions that happened before this program:
--     users who had already paid are flagged "paidBeforeRewards" (no B2C credit, no
--     first_payment commission; the months window is anchored on their first paid date).

-- ---------------------------------------------------------------------------
-- 0. Cut-off for users who converted before the program existed
-- ---------------------------------------------------------------------------
-- Read-only check before applying (number of registry rows that will be flagged):
--   SELECT count(*) FROM public."referralAttribution" ra
--   WHERE ra."referralFirstPaidAt" IS NOT NULL OR EXISTS (SELECT 1 FROM public."userSubscription" s
--     WHERE s."userId" = ra."userId" AND (s."stripeSubscriptionId" IS NOT NULL OR s."planTier" IN ('pro','premium')));
ALTER TABLE public."referralAttribution"
  ADD COLUMN IF NOT EXISTS "paidBeforeRewards" BOOLEAN NOT NULL DEFAULT false;

UPDATE public."referralAttribution" AS ra
SET "paidBeforeRewards" = true
WHERE ra."referralFirstPaidAt" IS NOT NULL
   OR EXISTS (
     SELECT 1 FROM public."userSubscription" AS s
     WHERE s."userId" = ra."userId"
       AND (s."stripeSubscriptionId" IS NOT NULL OR s."planTier" IN ('pro', 'premium'))
   );

-- Hardening for the slice 1 registry: anon needs nothing on it.
REVOKE ALL ON public."referralAttribution" FROM anon;

-- ---------------------------------------------------------------------------
-- 1. Payment history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."billingInvoicePayment" (
  "stripeInvoiceId" TEXT PRIMARY KEY,
  "userId" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "stripeSubscriptionId" TEXT NULL,
  "stripeChargeId" TEXT NULL,
  "amountPaidCents" INTEGER NOT NULL CHECK ("amountPaidCents" >= 0),
  currency TEXT NOT NULL,
  "tierSlug" TEXT NULL CHECK ("tierSlug" IS NULL OR "tierSlug" IN ('pro', 'premium')),
  "billingReason" TEXT NULL,
  "paidAt" TIMESTAMPTZ NOT NULL,
  "refundedCents" INTEGER NOT NULL DEFAULT 0 CHECK ("refundedCents" >= 0),
  "disputedCents" INTEGER NOT NULL DEFAULT 0 CHECK ("disputedCents" >= 0),
  status TEXT NOT NULL DEFAULT 'paid'
    CHECK (status IN ('paid', 'partially_refunded', 'refunded', 'disputed')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Not unique on purpose: a conflicting charge id must never make the webhook fail forever.
CREATE INDEX IF NOT EXISTS idx_billing_invoice_payment_charge
  ON public."billingInvoicePayment" ("stripeChargeId")
  WHERE "stripeChargeId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_invoice_payment_user_paid
  ON public."billingInvoicePayment" ("userId", "paidAt");

-- ---------------------------------------------------------------------------
-- 2. B2C referral coach credits (1 credit = 1 human-coach 1:1 session; no cap, no expiry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."referralCoachCreditLedger" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Monotonic order; "createdAt" is equal for rows written in one transaction.
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  "userId" UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'referral_reward',
    'redemption',
    'cancel_refund',
    'reversal',
    'reversal_restore',
    'admin_adjustment'
  )),
  "referredUserId" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "stripeInvoiceId" TEXT NULL,
  "coachBookingId" UUID NULL REFERENCES public."coachBooking" (id) ON DELETE SET NULL,
  note TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_coach_credit_delta_matches_reason CHECK (
    (reason IN ('referral_reward', 'cancel_refund', 'reversal_restore') AND delta = 1)
    OR (reason = 'redemption' AND delta = -1)
    -- delta 0 records a reversal that found the credit already spent.
    OR (reason = 'reversal' AND delta IN (-1, 0))
    OR (reason = 'admin_adjustment' AND delta <> 0)
  )
);

-- Exactly one reward per referred user, ever.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_coach_credit_one_reward
  ON public."referralCoachCreditLedger" ("referredUserId")
  WHERE reason = 'referral_reward' AND "referredUserId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_coach_credit_reward_invoice
  ON public."referralCoachCreditLedger" ("stripeInvoiceId")
  WHERE reason = 'referral_reward' AND "stripeInvoiceId" IS NOT NULL;

-- Reversal / restore rows may repeat per invoice (refund after a won dispute); the referrer
-- advisory lock serializes them and the latest row decides the next step.
CREATE INDEX IF NOT EXISTS idx_referral_coach_credit_invoice_events
  ON public."referralCoachCreditLedger" ("stripeInvoiceId", seq)
  WHERE reason IN ('reversal', 'reversal_restore');

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_coach_credit_booking_reason
  ON public."referralCoachCreditLedger" ("coachBookingId", reason)
  WHERE "coachBookingId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_coach_credit_user_created
  ON public."referralCoachCreditLedger" ("userId", "createdAt" DESC);

CREATE OR REPLACE FUNCTION public.available_referral_coach_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT greatest(coalesce(sum(delta), 0), 0)::integer
  FROM public."referralCoachCreditLedger"
  WHERE "userId" = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. Partner commission terms (entered and confirmed by a settings admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."referralPartnerTerms" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "partnerId" UUID NOT NULL REFERENCES public."referralPartner" (id) ON DELETE CASCADE,
  "commissionPercent" NUMERIC(5, 2) NOT NULL
    CHECK ("commissionPercent" > 0 AND "commissionPercent" <= 100),
  scope TEXT NOT NULL CHECK (scope IN ('first_payment', 'months', 'lifetime')),
  "scopeMonths" INTEGER NULL,
  "effectiveFrom" TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'archived')),
  note TEXT NULL,
  "confirmedBy" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "confirmedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "archivedBy" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "archivedAt" TIMESTAMPTZ NULL,
  CONSTRAINT referral_partner_terms_scope_months CHECK (
    (scope = 'months' AND "scopeMonths" BETWEEN 1 AND 120)
    OR (scope <> 'months' AND "scopeMonths" IS NULL)
  ),
  CONSTRAINT referral_partner_terms_archived_at CHECK ((status = 'archived') = ("archivedAt" IS NOT NULL))
);

-- At most one set of confirmed terms per partner; older versions stay as history.
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_partner_terms_one_confirmed
  ON public."referralPartnerTerms" ("partnerId")
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_referral_partner_terms_partner
  ON public."referralPartnerTerms" ("partnerId", "effectiveFrom" DESC);

-- ---------------------------------------------------------------------------
-- 4. Partner commissions: one row per attributed qualifying invoice
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."referralPartnerCommission" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "partnerId" UUID NOT NULL REFERENCES public."referralPartner" (id) ON DELETE CASCADE,
  "referredUserId" UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  "stripeInvoiceId" TEXT NOT NULL UNIQUE
    REFERENCES public."billingInvoicePayment" ("stripeInvoiceId") ON DELETE CASCADE,
  "paidAt" TIMESTAMPTZ NOT NULL,
  "baseCents" INTEGER NOT NULL CHECK ("baseCents" >= 0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_terms', 'accrued', 'out_of_scope')),
  "termsId" UUID NULL REFERENCES public."referralPartnerTerms" (id) ON DELETE SET NULL,
  -- Snapshot of the applied rate, so archived terms never rewrite history.
  "commissionPercent" NUMERIC(5, 2) NULL,
  "commissionCents" INTEGER NULL CHECK ("commissionCents" IS NULL OR "commissionCents" >= 0),
  "reversedCents" INTEGER NOT NULL DEFAULT 0 CHECK ("reversedCents" >= 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT referral_partner_commission_amount_matches_status CHECK (
    (status = 'accrued' AND "commissionCents" IS NOT NULL AND "commissionPercent" IS NOT NULL
      AND "reversedCents" <= "commissionCents")
    OR (status <> 'accrued' AND "commissionCents" IS NULL AND "reversedCents" = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_referral_partner_commission_partner
  ON public."referralPartnerCommission" ("partnerId", "paidAt");

CREATE INDEX IF NOT EXISTS idx_referral_partner_commission_user
  ON public."referralPartnerCommission" ("referredUserId");

-- ---------------------------------------------------------------------------
-- 5. RLS: admin read-only; all writes through the RPCs below
-- ---------------------------------------------------------------------------
ALTER TABLE public."billingInvoicePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."referralCoachCreditLedger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."referralPartnerTerms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."referralPartnerCommission" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings admin selects billingInvoicePayment" ON public."billingInvoicePayment";
CREATE POLICY "Settings admin selects billingInvoicePayment"
  ON public."billingInvoicePayment" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin selects referralCoachCreditLedger" ON public."referralCoachCreditLedger";
CREATE POLICY "Settings admin selects referralCoachCreditLedger"
  ON public."referralCoachCreditLedger" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin selects referralPartnerTerms" ON public."referralPartnerTerms";
CREATE POLICY "Settings admin selects referralPartnerTerms"
  ON public."referralPartnerTerms" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

DROP POLICY IF EXISTS "Settings admin selects referralPartnerCommission" ON public."referralPartnerCommission";
CREATE POLICY "Settings admin selects referralPartnerCommission"
  ON public."referralPartnerCommission" FOR SELECT TO authenticated
  USING (public.is_settings_admin());

REVOKE ALL ON public."billingInvoicePayment" FROM anon;
REVOKE ALL ON public."referralCoachCreditLedger" FROM anon;
REVOKE ALL ON public."referralPartnerTerms" FROM anon;
REVOKE ALL ON public."referralPartnerCommission" FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public."billingInvoicePayment" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public."referralCoachCreditLedger" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public."referralPartnerTerms" FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public."referralPartnerCommission" FROM authenticated;

GRANT ALL ON public."billingInvoicePayment" TO service_role;
GRANT ALL ON public."referralCoachCreditLedger" TO service_role;
GRANT ALL ON public."referralPartnerTerms" TO service_role;
GRANT ALL ON public."referralPartnerCommission" TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Internal helpers
-- ---------------------------------------------------------------------------

-- Share of a payment that has been taken back (0..1).
CREATE OR REPLACE FUNCTION public.referral_payment_reversed_ratio(
  p_amount_cents INTEGER,
  p_refunded_cents INTEGER,
  p_disputed_cents INTEGER
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN coalesce(p_amount_cents, 0) <= 0 THEN 0
    ELSE least(
      coalesce(p_refunded_cents, 0) + coalesce(p_disputed_cents, 0),
      p_amount_cents
    )::numeric / p_amount_cents
  END;
$$;

-- Terms version that governed a payment made at p_paid_at (latest effective one that had not
-- been archived yet at that moment).
CREATE OR REPLACE FUNCTION public.referral_partner_terms_at(p_partner_id UUID, p_paid_at TIMESTAMPTZ)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id
  FROM public."referralPartnerTerms" AS t
  WHERE t."partnerId" = p_partner_id
    AND t."effectiveFrom" <= p_paid_at
    AND (t.status = 'confirmed' OR t."archivedAt" > p_paid_at)
  ORDER BY t."effectiveFrom" DESC, t."confirmedAt" DESC
  LIMIT 1;
$$;

-- Decide status / amount of a commission row. Only "pending_terms" rows are evaluated;
-- accrued / out_of_scope decisions are history and never change when terms are replaced.
-- Lock order everywhere: payment row -> commission row.
CREATE OR REPLACE FUNCTION public.referral_evaluate_partner_commission(p_commission_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id TEXT;
  v_payment public."billingInvoicePayment"%ROWTYPE;
  v_row public."referralPartnerCommission"%ROWTYPE;
  v_terms public."referralPartnerTerms"%ROWTYPE;
  v_attr public."referralAttribution"%ROWTYPE;
  v_first_recorded_at TIMESTAMPTZ;
  v_first_invoice TEXT;
  v_first_reason TEXT;
  v_anchor TIMESTAMPTZ;
  v_eligible BOOLEAN;
  v_commission INTEGER;
BEGIN
  SELECT "stripeInvoiceId" INTO v_invoice_id
  FROM public."referralPartnerCommission" WHERE id = p_commission_id;
  IF v_invoice_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_payment FROM public."billingInvoicePayment"
  WHERE "stripeInvoiceId" = v_invoice_id
  FOR UPDATE;

  SELECT * INTO v_row FROM public."referralPartnerCommission"
  WHERE id = p_commission_id
  FOR UPDATE;

  IF v_row.status <> 'pending_terms' THEN
    RETURN v_row.status;
  END IF;

  SELECT * INTO v_terms FROM public."referralPartnerTerms"
  WHERE id = public.referral_partner_terms_at(v_row."partnerId", v_row."paidAt");

  IF NOT FOUND THEN
    RETURN 'pending_terms';
  END IF;

  SELECT * INTO v_attr FROM public."referralAttribution" WHERE "userId" = v_row."referredUserId";

  -- First recorded qualifying payment of this client.
  SELECT p."paidAt", p."stripeInvoiceId", p."billingReason"
  INTO v_first_recorded_at, v_first_invoice, v_first_reason
  FROM public."billingInvoicePayment" AS p
  WHERE p."userId" = v_row."referredUserId"
    AND p."amountPaidCents" > 0
    AND p."tierSlug" IS NOT NULL
  ORDER BY p."paidAt", p."stripeInvoiceId"
  LIMIT 1;

  -- Clients who paid before the program are anchored on their real first paid date.
  v_anchor := CASE
    WHEN v_attr."referralFirstPaidAt" IS NOT NULL
      THEN least(v_attr."referralFirstPaidAt", v_first_recorded_at)
    ELSE v_first_recorded_at
  END;

  v_eligible := CASE v_terms.scope
    WHEN 'lifetime' THEN true
    -- A first recorded renewal means the client paid before we kept history (e.g. attached to
    -- the partner later by an admin), so it is not their first payment.
    WHEN 'first_payment' THEN v_first_invoice = v_row."stripeInvoiceId"
      AND v_first_reason = 'subscription_create'
      AND NOT coalesce(v_attr."paidBeforeRewards", false)
    WHEN 'months' THEN v_anchor IS NOT NULL
      AND v_row."paidAt" < v_anchor + make_interval(months => v_terms."scopeMonths")
    ELSE false
  END;

  IF NOT coalesce(v_eligible, false) OR v_row."baseCents" <= 0 THEN
    UPDATE public."referralPartnerCommission"
    SET status = 'out_of_scope', "termsId" = v_terms.id, "updatedAt" = now()
    WHERE id = v_row.id;
    RETURN 'out_of_scope';
  END IF;

  v_commission := round(v_row."baseCents" * v_terms."commissionPercent" / 100)::integer;

  UPDATE public."referralPartnerCommission"
  SET status = 'accrued',
      "termsId" = v_terms.id,
      "commissionPercent" = v_terms."commissionPercent",
      "commissionCents" = v_commission,
      "reversedCents" = least(v_commission, round(v_commission * public.referral_payment_reversed_ratio(
        v_payment."amountPaidCents", v_payment."refundedCents", v_payment."disputedCents"))::integer),
      "updatedAt" = now()
  WHERE id = v_row.id;

  RETURN 'accrued';
END;
$$;

-- Bring B2C credit + B2B commission in line with a payment's refunded/disputed amounts.
-- Caller holds the payment row lock.
CREATE OR REPLACE FUNCTION public.referral_apply_payment_reversal(p_invoice_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public."billingInvoicePayment"%ROWTYPE;
  v_ratio NUMERIC;
  v_reward public."referralCoachCreditLedger"%ROWTYPE;
  v_last public."referralCoachCreditLedger"%ROWTYPE;
  v_delta INTEGER;
  v_credit_action TEXT := 'none';
BEGIN
  SELECT * INTO v_payment FROM public."billingInvoicePayment"
  WHERE "stripeInvoiceId" = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('credit', 'none');
  END IF;

  v_ratio := public.referral_payment_reversed_ratio(
    v_payment."amountPaidCents", v_payment."refundedCents", v_payment."disputedCents");

  UPDATE public."referralPartnerCommission"
  SET "reversedCents" = least("commissionCents", round("commissionCents" * v_ratio)::integer),
      "updatedAt" = now()
  WHERE "stripeInvoiceId" = p_invoice_id
    AND status = 'accrued';

  SELECT * INTO v_reward FROM public."referralCoachCreditLedger"
  WHERE "stripeInvoiceId" = p_invoice_id AND reason = 'referral_reward';

  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(hashtext('referral_coach_credit'), hashtext(v_reward."userId"::text));

    -- The latest reversal / restore row is the current state of this reward.
    SELECT * INTO v_last FROM public."referralCoachCreditLedger"
    WHERE "stripeInvoiceId" = p_invoice_id AND reason IN ('reversal', 'reversal_restore')
    ORDER BY seq DESC
    LIMIT 1;

    IF v_ratio >= 1 AND (v_last.id IS NULL OR v_last.reason = 'reversal_restore') THEN
      v_delta := CASE WHEN public.available_referral_coach_credits(v_reward."userId") >= 1 THEN -1 ELSE 0 END;
      INSERT INTO public."referralCoachCreditLedger"
        ("userId", delta, reason, "referredUserId", "stripeInvoiceId", note)
      VALUES (v_reward."userId", v_delta, 'reversal', v_reward."referredUserId", p_invoice_id,
              'Qualifying payment fully refunded or disputed');
      v_credit_action := CASE WHEN v_delta = -1 THEN 'reversed' ELSE 'already_spent' END;
    ELSIF v_ratio < 1 AND v_last.reason = 'reversal' AND v_last.delta = -1 THEN
      INSERT INTO public."referralCoachCreditLedger"
        ("userId", delta, reason, "referredUserId", "stripeInvoiceId", note)
      VALUES (v_reward."userId", 1, 'reversal_restore', v_reward."referredUserId", p_invoice_id,
              'Payment no longer fully reversed (dispute won)');
      v_credit_action := 'restored';
    END IF;
  END IF;

  RETURN jsonb_build_object('credit', v_credit_action, 'reversedRatio', v_ratio);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Webhook RPCs (service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referral_record_invoice_payment(
  p_invoice_id TEXT,
  p_user_id UUID,
  p_subscription_id TEXT,
  p_charge_id TEXT,
  p_amount_cents INTEGER,
  p_currency TEXT,
  p_tier TEXT,
  p_billing_reason TEXT,
  p_paid_at TIMESTAMPTZ
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public."billingInvoicePayment"%ROWTYPE;
  v_attr public."referralAttribution"%ROWTYPE;
  v_qualifying BOOLEAN;
  v_reward_granted BOOLEAN := false;
  v_commission_id UUID;
  v_commission_status TEXT;
BEGIN
  IF p_invoice_id IS NULL OR btrim(p_invoice_id) = '' THEN
    RAISE EXCEPTION 'invoice id required';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents < 0 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  -- Serialize payments of one client so "first payment" is decided once.
  IF p_user_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('referral_payment_user'), hashtext(p_user_id::text));
  END IF;

  INSERT INTO public."billingInvoicePayment" (
    "stripeInvoiceId", "userId", "stripeSubscriptionId", "stripeChargeId",
    "amountPaidCents", currency, "tierSlug", "billingReason", "paidAt"
  )
  VALUES (
    p_invoice_id,
    (SELECT id FROM auth.users WHERE id = p_user_id),
    p_subscription_id,
    nullif(btrim(p_charge_id), ''),
    p_amount_cents,
    lower(coalesce(nullif(btrim(p_currency), ''), 'usd')),
    CASE WHEN lower(p_tier) IN ('pro', 'premium') THEN lower(p_tier) END,
    p_billing_reason,
    coalesce(p_paid_at, now())
  )
  ON CONFLICT ("stripeInvoiceId") DO NOTHING;

  -- Use the stored row from here on, so a redelivery is evaluated exactly like the first run.
  SELECT * INTO v_payment FROM public."billingInvoicePayment"
  WHERE "stripeInvoiceId" = p_invoice_id
  FOR UPDATE;

  v_qualifying := coalesce(
    v_payment."amountPaidCents" > 0 AND v_payment."tierSlug" IN ('pro', 'premium'), false);

  IF v_payment."userId" IS NULL OR NOT v_qualifying THEN
    RETURN jsonb_build_object('recorded', true, 'reward', false, 'commission', null);
  END IF;

  SELECT * INTO v_attr FROM public."referralAttribution" WHERE "userId" = v_payment."userId";

  -- B2C: one coach credit to the organic referrer on the first qualifying payment.
  IF v_attr."referredByUserId" IS NOT NULL
     AND v_attr."referralPartnerId" IS NULL
     AND NOT v_attr."paidBeforeRewards" THEN
    PERFORM pg_advisory_xact_lock(hashtext('referral_coach_credit'), hashtext(v_attr."referredByUserId"::text));

    INSERT INTO public."referralCoachCreditLedger"
      ("userId", delta, reason, "referredUserId", "stripeInvoiceId", note)
    VALUES (v_attr."referredByUserId", 1, 'referral_reward', v_payment."userId", v_payment."stripeInvoiceId",
            'Referred user paid ' || initcap(v_payment."tierSlug"))
    ON CONFLICT DO NOTHING
    RETURNING true INTO v_reward_granted;
  END IF;

  -- B2B: one commission row per attributed qualifying invoice.
  IF v_attr."referralPartnerId" IS NOT NULL THEN
    INSERT INTO public."referralPartnerCommission"
      ("partnerId", "referredUserId", "stripeInvoiceId", "paidAt", "baseCents", currency, status)
    VALUES (v_attr."referralPartnerId", v_payment."userId", v_payment."stripeInvoiceId",
            v_payment."paidAt", v_payment."amountPaidCents", v_payment.currency, 'pending_terms')
    ON CONFLICT ("stripeInvoiceId") DO NOTHING;

    SELECT id INTO v_commission_id FROM public."referralPartnerCommission"
    WHERE "stripeInvoiceId" = v_payment."stripeInvoiceId";

    v_commission_status := public.referral_evaluate_partner_commission(v_commission_id);
  END IF;

  RETURN jsonb_build_object(
    'recorded', true,
    'reward', coalesce(v_reward_granted, false),
    'commission', v_commission_status
  );
END;
$$;

-- Current charge state from Stripe (the webhook re-fetches it): refunds only grow; the disputed
-- amount is authoritative (0 once a dispute is won). NULL keeps the stored value.
CREATE OR REPLACE FUNCTION public.referral_record_payment_reversal(
  p_invoice_id TEXT,
  p_charge_id TEXT,
  p_refunded_cents INTEGER,
  p_disputed_cents INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public."billingInvoicePayment"%ROWTYPE;
  v_refunded INTEGER;
  v_disputed INTEGER;
BEGIN
  SELECT * INTO v_payment FROM public."billingInvoicePayment"
  WHERE "stripeInvoiceId" = nullif(btrim(p_invoice_id), '')
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_payment FROM public."billingInvoicePayment"
    WHERE "stripeChargeId" = nullif(btrim(p_charge_id), '')
    ORDER BY "paidAt" DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    -- Not a recorded subscription payment (one-time add-on), or invoice.paid not processed yet:
    -- invoice.paid re-syncs the charge state itself, so nothing is lost.
    RETURN jsonb_build_object('ok', false, 'code', 'payment_not_found');
  END IF;

  v_refunded := least(greatest(coalesce(p_refunded_cents, 0), v_payment."refundedCents"),
                      v_payment."amountPaidCents");
  v_disputed := least(greatest(coalesce(p_disputed_cents, v_payment."disputedCents"), 0),
                      v_payment."amountPaidCents");

  UPDATE public."billingInvoicePayment"
  SET "refundedCents" = v_refunded,
      "disputedCents" = v_disputed,
      "stripeChargeId" = coalesce("stripeChargeId", nullif(btrim(p_charge_id), '')),
      status = CASE
        WHEN v_disputed > 0 THEN 'disputed'
        WHEN v_refunded >= "amountPaidCents" AND "amountPaidCents" > 0 THEN 'refunded'
        WHEN v_refunded > 0 THEN 'partially_refunded'
        ELSE 'paid'
      END,
      "updatedAt" = now()
  WHERE "stripeInvoiceId" = v_payment."stripeInvoiceId";

  RETURN jsonb_build_object('ok', true, 'invoiceId', v_payment."stripeInvoiceId")
    || public.referral_apply_payment_reversal(v_payment."stripeInvoiceId");
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. Admin RPCs for partner terms
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_confirm_referral_partner_terms(
  p_partner_id UUID,
  p_commission_percent NUMERIC,
  p_scope TEXT,
  p_scope_months INTEGER DEFAULT NULL,
  p_effective_from TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_terms_id UUID;
  v_rows INTEGER := 0;
  v_commission RECORD;
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public."referralPartner" WHERE id = p_partner_id) THEN
    RAISE EXCEPTION 'referral partner not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('referral_partner_terms'), hashtext(p_partner_id::text));

  UPDATE public."referralPartnerTerms"
  SET status = 'archived', "archivedBy" = auth.uid(), "archivedAt" = now()
  WHERE "partnerId" = p_partner_id AND status = 'confirmed';

  INSERT INTO public."referralPartnerTerms" (
    "partnerId", "commissionPercent", scope, "scopeMonths", "effectiveFrom", note, "confirmedBy"
  )
  VALUES (
    p_partner_id,
    p_commission_percent,
    p_scope,
    CASE WHEN p_scope = 'months' THEN p_scope_months END,
    coalesce(p_effective_from, now()),
    nullif(btrim(p_note), ''),
    auth.uid()
  )
  RETURNING id INTO v_terms_id;

  -- Payments that were waiting for terms (only those inside an effective window change).
  FOR v_commission IN
    SELECT c.id FROM public."referralPartnerCommission" AS c
    WHERE c."partnerId" = p_partner_id
      AND c.status = 'pending_terms'
    ORDER BY c."paidAt"
  LOOP
    PERFORM public.referral_evaluate_partner_commission(v_commission.id);
    v_rows := v_rows + 1;
  END LOOP;

  RETURN jsonb_build_object('termsId', v_terms_id, 'reevaluated', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_referral_partner_terms(p_partner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_settings_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public."referralPartnerTerms"
  SET status = 'archived', "archivedBy" = auth.uid(), "archivedAt" = now()
  WHERE "partnerId" = p_partner_id AND status = 'confirmed';
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. Grants. Supabase grants EXECUTE on new public functions to anon/authenticated by
--    default, so revoke from them explicitly.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.available_referral_coach_credits(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_payment_reversed_ratio(INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_partner_terms_at(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_evaluate_partner_commission(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_apply_payment_reversal(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_record_invoice_payment(TEXT, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.referral_record_payment_reversal(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_confirm_referral_partner_terms(UUID, NUMERIC, TEXT, INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_archive_referral_partner_terms(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.available_referral_coach_credits(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.referral_record_invoice_payment(TEXT, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.referral_record_payment_reversal(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_confirm_referral_partner_terms(UUID, NUMERIC, TEXT, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_referral_partner_terms(UUID) TO authenticated;
