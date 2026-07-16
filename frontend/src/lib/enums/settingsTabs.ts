/** Bubble option set: settings_tab_os (Settings Tab OS) */

export const SETTINGS_TAB_OPTION_SET_ID = "settings_tab_os" as const;

export const SETTINGS_TAB = {
  /** bTIiw */
  PROFILE: "profile",
  /** bTIjC */
  SECURITY: "security",
  /** bTIjI */
  SUBSCRIPTION: "subscription",
  /** bTIjJ */
  ADMIN: "admin",
} as const;

export type SettingsTabSlug = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

/** Display strings from ir/inventory.json → settings_tab_os (slug keys per Bubble db_value) */
export const SETTINGS_TAB_LABELS: Record<SettingsTabSlug, string> = {
  profile: "profile", // bTIiw
  security: "security", // bTIjC
  subscription: "subscription", // bTIjI
  admin: "admin", // bTIjJ
};

export const SETTINGS_TAB_ORDER: readonly SettingsTabSlug[] = [
  SETTINGS_TAB.PROFILE,
  SETTINGS_TAB.SECURITY,
  SETTINGS_TAB.SUBSCRIPTION,
  SETTINGS_TAB.ADMIN,
];
