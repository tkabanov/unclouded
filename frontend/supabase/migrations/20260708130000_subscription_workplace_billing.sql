-- SET-07 subscription plans + billing RPC stubs; workplace directory for SET-08/SET-10.

CREATE TABLE IF NOT EXISTS public.subscription_plan (
  id TEXT PRIMARY KEY,
  name_text TEXT NOT NULL,
  price_number NUMERIC NOT NULL DEFAULT 0,
  description_text TEXT,
  features_text TEXT,
  tier_slug TEXT
);

ALTER TABLE public.subscription_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read subscription plans"
  ON public.subscription_plan FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.subscription_plan (id, name_text, price_number, description_text, features_text, tier_slug)
VALUES
  (
    'free',
    'Free',
    0,
    'Everything you need to get started with AI coaching.',
    E'AI coaching chat (limited)\nDaily check-ins & journal\nFree guided paths\nCrisis resources always available',
    'free'
  ),
  (
    'pro',
    'Pro',
    29,
    'Deeper coaching, richer insights, and your 90-day reassessment.',
    E'Unlimited AI coaching chat\nAll guided paths & resources\nAI journal reflections\n90-day reassessment to track progress\nAdvanced insights & milestones\nPriority support',
    'pro'
  ),
  (
    'premium',
    'Premium',
    0,
    '1:1 human coaching with the Proven Under Pressure team, matched to your PuP 360 data.',
    E'Everything in Pro\n1:1 sessions with the Proven Under Pressure coaching team\nLed & certified by Dr. Sam\nCoach matched to your PuP 360 data\nPersonalized between-session support',
    'premium'
  )
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.workplace (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name_text TEXT NOT NULL,
  contact_email_text TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workplaces"
  ON public.workplace FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upsert workplaces"
  ON public.workplace FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workplaces"
  ON public.workplace FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.open_billing_portal()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('status', 'demo', 'message', 'Billing portal stub — connect Stripe in production.');
$$;

CREATE OR REPLACE FUNCTION public.list_billing_invoices()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_array(
    jsonb_build_object('id', 'demo-inv-001', 'amount', '$29.00', 'date', '2026-06-01'),
    jsonb_build_object('id', 'demo-inv-002', 'amount', '$29.00', 'date', '2026-05-01')
  );
$$;

GRANT SELECT ON public.subscription_plan TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.workplace TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_billing_portal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_billing_invoices() TO authenticated;
