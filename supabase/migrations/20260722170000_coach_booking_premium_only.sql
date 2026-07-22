-- US-204 / US-603: human coach booking is Premium-only.

CREATE OR REPLACE FUNCTION public.userHasPremiumTier()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND lower(coalesce(tier, '')) = 'premium'
  );
$$;

GRANT EXECUTE ON FUNCTION public.userHasPremiumTier() TO authenticated;

DROP POLICY IF EXISTS "Owner inserts coachBooking" ON public."coachBooking";
CREATE POLICY "Premium owner inserts coachBooking" ON public."coachBooking"
  FOR INSERT TO authenticated
  WITH CHECK (public.userOwnsRow("userId") AND public.userHasPremiumTier());
