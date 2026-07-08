-- SET-10: Gate subscription_plan and workplace admin writes behind settings admin role.
-- Bootstrap: when no profile has role_type = 'admin', all authenticated users may write (demo).
-- Once an admin is designated, only role_type = 'admin' profiles can mutate these tables.

CREATE OR REPLACE FUNCTION public.is_settings_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role_type = 'admin'
    )
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE role_type = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_settings_admin() TO authenticated;

-- subscription_plan write policies
DROP POLICY IF EXISTS "Authenticated users can insert subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can update subscription plans" ON public.subscription_plan;
DROP POLICY IF EXISTS "Authenticated users can delete subscription plans" ON public.subscription_plan;

CREATE POLICY "Settings admins can insert subscription plans"
  ON public.subscription_plan FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can update subscription plans"
  ON public.subscription_plan FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can delete subscription plans"
  ON public.subscription_plan FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());

-- workplace write policies
DROP POLICY IF EXISTS "Authenticated users can upsert workplaces" ON public.workplace;
DROP POLICY IF EXISTS "Authenticated users can update workplaces" ON public.workplace;
DROP POLICY IF EXISTS "Authenticated users can delete workplaces" ON public.workplace;

CREATE POLICY "Settings admins can insert workplaces"
  ON public.workplace FOR INSERT
  TO authenticated
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can update workplaces"
  ON public.workplace FOR UPDATE
  TO authenticated
  USING (public.is_settings_admin())
  WITH CHECK (public.is_settings_admin());

CREATE POLICY "Settings admins can delete workplaces"
  ON public.workplace FOR DELETE
  TO authenticated
  USING (public.is_settings_admin());
