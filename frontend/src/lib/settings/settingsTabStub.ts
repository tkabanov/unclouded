/**
 * Settings tab router stub for MOD-DRSAM-SETTINGS.
 * Bubble page custom state: settings_tab_os_ (custom_state:bTHDh:settings_tab_os_).
 * Tab bar, conditional panels, and admin popups are implemented in SET-01+.
 */

import {
  SETTINGS_TAB,
  SETTINGS_TAB_LABELS,
  SETTINGS_TAB_OPTION_SET_ID,
  SETTINGS_TAB_ORDER,
  type SettingsTabSlug,
} from "@/lib/enums/settingsTabs";

/** Bubble page custom state key on bTHDh. */
export const SETTINGS_TAB_CUSTOM_STATE_KEY = "settings_tab_os_" as const;

export {
  SETTINGS_TAB,
  SETTINGS_TAB_LABELS,
  SETTINGS_TAB_OPTION_SET_ID,
  SETTINGS_TAB_ORDER,
  type SettingsTabSlug,
};

/** Bubble default tab on first visit (option value bTIiw / profile). */
export const DEFAULT_SETTINGS_TAB: SettingsTabSlug = SETTINGS_TAB.PROFILE;

/** Tab button bubble ids (ai_RNbBHYUx … ai_RNbBHYVE) keyed by ENUM-01 slug. */
export const SETTINGS_TAB_BUTTON_BUBBLE_IDS: Record<SettingsTabSlug, string> = {
  profile: "ai_RNbBHYUx", // bTIiw
  coaching_preferences: "ai_RNbBHYUy", // bTIix
  privacy: "ai_RNbBHYUz", // bTIiy
  security: "ai_RNbBHYVA", // bTIjC
  workplace: "ai_RNbBHYVB", // bTIjD
  notifications: "ai_RNbBHYVC", // bTIjE
  subscription: "ai_RNbBHYVD", // bTIjI
  admin: "ai_RNbBHYVE", // bTIjJ
};

/** Tab panels container under settings-tab-bar (G - settings). */
export const SETTINGS_TAB_PANELS_BUBBLE_ID = "ai_RNbBHYVF" as const;

/** Tab panel root bubble ids (G - * groups under ai_RNbBHYVF). */
export const SETTINGS_TAB_PANEL_BUBBLE_IDS: Record<SettingsTabSlug, string> = {
  profile: "ai_RNbBHYVG",
  coaching_preferences: "ai_RNbBHYWU",
  privacy: "ai_RNbBHYWu",
  security: "ai_RNbBHYXg",
  workplace: "ai_RNbBHYYM",
  notifications: "ai_RNbBHYXy",
  subscription: "ai_RNbBHYYc",
  admin: "ai_RNbBHYZD",
};

/** Human-readable tab labels for the settings tab bar UI. */
export const SETTINGS_TAB_DISPLAY_LABELS: Record<SettingsTabSlug, string> = {
  profile: "Profile",
  coaching_preferences: "Coaching",
  privacy: "Privacy",
  security: "Security",
  workplace: "Workplace",
  notifications: "Notifications",
  subscription: "Subscription",
  admin: "Admin",
};

/** Contract for settings_tab_os_ router — SET-01 implements the live store. */
export type SettingsTabRouter = {
  activeTab: SettingsTabSlug;
  setActiveTab: (tab: SettingsTabSlug) => void;
};
