/**
 * Settings tab router stub for MOD-DRSAM-SETTINGS.
 */

import {
  SETTINGS_TAB,
  SETTINGS_TAB_LABELS,
  SETTINGS_TAB_OPTION_SET_ID,
  SETTINGS_TAB_ORDER,
  type SettingsTabSlug,
} from "@/lib/enums/settingsTabs";

export const SETTINGS_TAB_CUSTOM_STATE_KEY = "settings_tab_os_" as const;

export {
  SETTINGS_TAB,
  SETTINGS_TAB_LABELS,
  SETTINGS_TAB_OPTION_SET_ID,
  SETTINGS_TAB_ORDER,
  type SettingsTabSlug,
};

export const DEFAULT_SETTINGS_TAB: SettingsTabSlug = SETTINGS_TAB.PROFILE;

export const SETTINGS_TAB_DISPLAY_LABELS: Record<SettingsTabSlug, string> = {
  profile: "Profile",
  security: "Security",
  subscription: "Subscription",
  admin: "Admin",
};

export type SettingsTabRouter = {
  activeTab: SettingsTabSlug;
  setActiveTab: (tab: SettingsTabSlug) => void;
};
