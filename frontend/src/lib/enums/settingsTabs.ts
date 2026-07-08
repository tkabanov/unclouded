/** Bubble option set: settings_tab_os (Settings Tab OS) */

export const SETTINGS_TAB_OPTION_SET_ID = "settings_tab_os" as const;

export const SETTINGS_TAB = {
  /** bTIiw */
  PROFILE: "profile",
  /** bTIix */
  COACHING_PREFERENCES: "coaching_preferences",
  /** bTIiy */
  PRIVACY: "privacy",
  /** bTIjC */
  SECURITY: "security",
  /** bTIjD */
  WORKPLACE: "workplace",
  /** bTIjE */
  NOTIFICATIONS: "notifications",
  /** bTIjI */
  SUBSCRIPTION: "subscription",
  /** bTIjJ */
  ADMIN: "admin",
} as const;

export type SettingsTabSlug = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

/** Display strings from ir/inventory.json → settings_tab_os (slug keys per Bubble db_value) */
export const SETTINGS_TAB_LABELS: Record<SettingsTabSlug, string> = {
  profile: "profile", // bTIiw
  coaching_preferences: "coaching_preferences", // bTIix
  privacy: "privacy", // bTIiy
  security: "security", // bTIjC
  workplace: "workplace", // bTIjD
  notifications: "notifications", // bTIjE
  subscription: "subscription", // bTIjI
  admin: "admin", // bTIjJ
};

export const SETTINGS_TAB_ORDER: readonly SettingsTabSlug[] = [
  SETTINGS_TAB.PROFILE,
  SETTINGS_TAB.COACHING_PREFERENCES,
  SETTINGS_TAB.PRIVACY,
  SETTINGS_TAB.SECURITY,
  SETTINGS_TAB.WORKPLACE,
  SETTINGS_TAB.NOTIFICATIONS,
  SETTINGS_TAB.SUBSCRIPTION,
  SETTINGS_TAB.ADMIN,
];
