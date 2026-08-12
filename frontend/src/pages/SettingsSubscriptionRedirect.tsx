import { Navigate, useLocation } from "react-router-dom";

import { SUBSCRIPTION_ROUTE } from "@/lib/subscription/routes";

/**
 * Legacy Stripe / deep links used `/settings/subscription` or `/settings?tab=subscription`.
 * Subscription management now lives at `/subscription` (OVR-051).
 */
export default function SettingsSubscriptionRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.delete("tab");
  const qs = params.toString();
  return <Navigate to={qs ? `${SUBSCRIPTION_ROUTE}?${qs}` : SUBSCRIPTION_ROUTE} replace />;
}
