import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  ADMIN_CONSOLE_ROUTE,
  isAdminAppLocation,
  isSettingsAdminUser,
} from "@/lib/settings/isSettingsAdminUser";
import { useUserProfile } from "@/lib/userProfile";

/** Restricts platform admins to the admin console route only. */
export default function AdminRouteGuard() {
  const location = useLocation();
  const { profile, loading } = useUserProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isSettingsAdminUser(profile?.roleType)) {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (!isAdminAppLocation(location.pathname, tabParam)) {
      return <Navigate to={ADMIN_CONSOLE_ROUTE} replace />;
    }
  }

  return <Outlet />;
}
