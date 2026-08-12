import DashboardLayout from "@/components/DashboardLayout";
import SettingsMain from "@/components/settings/SettingsMain";
import { Navigate, useSearchParams } from "react-router-dom";
import { isSettingsAdminUser } from "@/lib/settings/isSettingsAdminUser";
import { SETTINGS_TAB } from "@/lib/settings/settingsTabStub";
import { SUBSCRIPTION_ROUTE } from "@/lib/subscription/routes";
import { useUserProfile } from "@/lib/userProfile";

export default function Settings() {
  const { profile } = useUserProfile();
  const [searchParams] = useSearchParams();
  const isAdmin = isSettingsAdminUser(profile?.roleType);
  const tab = searchParams.get("tab");

  // Legacy deep link → Lovable-style `/admin` console (OVR-048).
  if (isAdmin && tab === SETTINGS_TAB.ADMIN) {
    return <Navigate to="/admin" replace />;
  }

  // Legacy Settings → Subscription tab → dedicated sidebar route (OVR-051).
  if (tab === SETTINGS_TAB.SUBSCRIPTION) {
    const params = new URLSearchParams(searchParams);
    params.delete("tab");
    const qs = params.toString();
    return <Navigate to={qs ? `${SUBSCRIPTION_ROUTE}?${qs}` : SUBSCRIPTION_ROUTE} replace />;
  }

  return (
    <DashboardLayout>
      <SettingsMain />
    </DashboardLayout>
  );
}
