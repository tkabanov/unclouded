import { useCallback, useState } from "react";
import {
  DEFAULT_SETTINGS_TAB,
  SETTINGS_TAB,
  type SettingsTabSlug,
} from "@/lib/settings/settingsTabStub";

export function useSettingsTabStore(
  defaultTab: SettingsTabSlug = DEFAULT_SETTINGS_TAB,
) {
  const [activeTab, setActiveTab] = useState<SettingsTabSlug>(defaultTab);

  const isTabActive = useCallback(
    (tab: SettingsTabSlug) => activeTab === tab,
    [activeTab],
  );

  return {
    activeTab,
    setActiveTab,
    isTabActive,
    isProfileActive: activeTab === SETTINGS_TAB.PROFILE,
    isCoachingActive: activeTab === SETTINGS_TAB.COACHING_PREFERENCES,
    isPrivacyActive: activeTab === SETTINGS_TAB.PRIVACY,
    isSecurityActive: activeTab === SETTINGS_TAB.SECURITY,
    isWorkplaceActive: activeTab === SETTINGS_TAB.WORKPLACE,
    isNotificationsActive: activeTab === SETTINGS_TAB.NOTIFICATIONS,
    isSubscriptionActive: activeTab === SETTINGS_TAB.SUBSCRIPTION,
    isAdminActive: activeTab === SETTINGS_TAB.ADMIN,
  };
}
