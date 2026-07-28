import { Navigate, useLocation } from "react-router-dom";

import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";

/** Stripe return URLs historically used `/settings/subscription`; settings tabs live at `/settings?tab=…`. */
export default function SettingsSubscriptionRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("tab", SETTINGS_TAB.SUBSCRIPTION);
  return <Navigate to={`/settings?${params.toString()}`} replace />;
}
