import { Navigate } from "react-router-dom";
import { ADMIN_CONSOLE_ROUTE } from "@/lib/settings/isSettingsAdminUser";

/** Legacy settings-embedded admin shell → dedicated `/admin` console (OVR-048). */
export default function SettingsAdminShell() {
  return <Navigate to={ADMIN_CONSOLE_ROUTE} replace />;
}
