-- REQ-05 — settings admins need read access to flagged users' check-ins for outreach queue.

DROP POLICY IF EXISTS "Settings admin selects dailyCheckin" ON public."dailyCheckin";
CREATE POLICY "Settings admin selects dailyCheckin" ON public."dailyCheckin"
  FOR SELECT TO authenticated
  USING (public.is_settings_admin());
