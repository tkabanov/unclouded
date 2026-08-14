import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  isAdminAppLocation,
  isSettingsAdminUser,
} from "@/lib/settings/isSettingsAdminUser";
import { useUserProfile } from "@/lib/userProfile";

/**
 * - Non-admins cannot open `/admin/*`.
 * - Admins may use the main app (Lovable “Back to app”) as well as the console (OVR-048).
 */
export default function AdminRouteGuard() {
  const location = useLocation();
  const { profile, loading } = useUserProfile();

  // Keep the current route mounted while a profile already exists. A full-screen
  // spinner on every refresh unmounts onboarding and resets wizard step state.
  if (loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = isSettingsAdminUser(profile?.roleType);
  const onAdmin = isAdminAppLocation(location.pathname);

  if (onAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
