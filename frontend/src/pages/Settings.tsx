import DashboardLayout from "@/components/DashboardLayout";
import SettingsMain from "@/components/settings/SettingsMain";
import {
  SETTINGS_HEADER_INSTANCE_BUBBLE_ID,
  SETTINGS_PAGE_BUBBLE_ID,
  SETTINGS_SIDEBAR_INSTANCE_BUBBLE_ID,
} from "@/lib/settings/routes";

const settingsShellProps = {
  pageBubbleId: SETTINGS_PAGE_BUBBLE_ID,
  headerBubbleId: SETTINGS_HEADER_INSTANCE_BUBBLE_ID,
  sidebarBubbleId: SETTINGS_SIDEBAR_INSTANCE_BUBBLE_ID,
} as const;

export default function Settings() {
  return (
    <DashboardLayout {...settingsShellProps}>
      <SettingsMain />
    </DashboardLayout>
  );
}
