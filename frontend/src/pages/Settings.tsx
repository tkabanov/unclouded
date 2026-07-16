import AdminLayout from "@/components/admin/AdminLayout";
import DashboardLayout from "@/components/DashboardLayout";
import SettingsMain from "@/components/settings/SettingsMain";
import { isSettingsAdminUser } from "@/lib/settings/isSettingsAdminUser";
import { useUserProfile } from "@/lib/userProfile";

export default function Settings() {
  const { profile } = useUserProfile();
  const Layout = isSettingsAdminUser(profile?.roleType) ? AdminLayout : DashboardLayout;

  return (
    <Layout>
      <SettingsMain />
    </Layout>
  );
}
