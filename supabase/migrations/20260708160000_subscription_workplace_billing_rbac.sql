-- Allow authenticated users (admin console) to create/update/delete subscription plans
-- and delete workplaces. Required because the main migration grants SELECT/INSERT/UPDATE
-- but omits write policies under Row Level Security.

-- Subscription plans (subscription_plan)
ALTER TABLE public.subscription_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert subscription plans"
  ON public.subscription_plan FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subscription plans"
  ON public.subscription_plan FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete subscription plans"
  ON public.subscription_plan FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plan TO authenticated;

-- Workplaces (workplace)
ALTER TABLE public.workplace ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can delete workplaces"
  ON public.workplace FOR DELETE
  TO authenticated
  USING (true);

GRANT DELETE ON public.workplace TO authenticated;

