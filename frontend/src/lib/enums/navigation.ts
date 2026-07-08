/** Sidebar primary navigation — IR copy from ai_RNbBKLUe reusable */

export const SIDEBAR_NAV = {
  DASHBOARD: "dashboard",
  CHAT: "chat",
  JOURNAL: "journal",
  PATHS: "paths",
  SETTINGS: "settings",
} as const;

export type SidebarNavSlug = (typeof SIDEBAR_NAV)[keyof typeof SIDEBAR_NAV];

/** Display strings from drsam-99657.bubble → sidebar nav links */
export const SIDEBAR_NAV_LABELS: Record<SidebarNavSlug, string> = {
  dashboard: "Dashboard", // ai_RNbBHWkZ
  chat: "Chat", // ai_RNbBHWkc
  journal: "Journal", // ai_RNbBHWkf
  paths: "Paths & Resources", // ai_RNbBHWki
  settings: "Settings", // ai_RNbBHWkl
};

export const SIDEBAR_NAV_ROUTES: Record<SidebarNavSlug, string> = {
  dashboard: "/dashboard",
  chat: "/chat",
  journal: "/journal",
  paths: "/paths",
  settings: "/settings",
};

export const SIDEBAR_NAV_BUBBLE_IDS: Record<SidebarNavSlug, string> = {
  dashboard: "ai_RNbBHWkZ",
  chat: "ai_RNbBHWkc",
  journal: "ai_RNbBHWkf",
  paths: "ai_RNbBHWki",
  settings: "ai_RNbBHWkl",
};

export const SIDEBAR_NAV_ORDER: readonly SidebarNavSlug[] = [
  SIDEBAR_NAV.DASHBOARD,
  SIDEBAR_NAV.CHAT,
  SIDEBAR_NAV.JOURNAL,
  SIDEBAR_NAV.PATHS,
  SIDEBAR_NAV.SETTINGS,
];

/** ai_RNbBHWkW — static IR copy */
export const SIDEBAR_MODE_LABEL = "Current Mode";

/** ai_RNbBHWkX — IR placeholder when profile mode is unavailable */
export const SIDEBAR_MODE_VALUE_PLACEHOLDER = "Professional • Executive Coaching";

/** Header logged-in nav — IR copy from ai_RNbBKLUc reusable (subset of sidebar routes) */

export const HEADER_NAV = {
  DASHBOARD: "dashboard",
  CHAT: "chat",
  JOURNAL: "journal",
  PATHS: "paths",
} as const;

export type HeaderNavSlug = (typeof HEADER_NAV)[keyof typeof HEADER_NAV];

/** Display strings from drsam-99657.bubble → header nav links */
export const HEADER_NAV_LABELS: Record<HeaderNavSlug, string> = {
  dashboard: "Dashboard", // ai_RNbBHWbA
  chat: "Chat", // ai_RNbBHWbB
  journal: "Journal", // ai_RNbBHWbC
  paths: "Paths & Resources", // ai_RNbBHWbD
};

export const HEADER_NAV_ROUTES: Record<HeaderNavSlug, string> = {
  dashboard: "/dashboard",
  chat: "/chat",
  journal: "/journal",
  paths: "/paths",
};

export const HEADER_NAV_BUBBLE_IDS: Record<HeaderNavSlug, string> = {
  dashboard: "ai_RNbBHWbA",
  chat: "ai_RNbBHWbB",
  journal: "ai_RNbBHWbC",
  paths: "ai_RNbBHWbD",
};

export const HEADER_NAV_ORDER: readonly HeaderNavSlug[] = [
  HEADER_NAV.DASHBOARD,
  HEADER_NAV.CHAT,
  HEADER_NAV.JOURNAL,
  HEADER_NAV.PATHS,
];

/** ai_RNbBHWbL — dropdown settings link */
export const HEADER_PROFILE_SETTINGS_LABEL = "Settings";

/** ai_RNbBHWbO — dropdown logout control */
export const HEADER_PROFILE_LOGOUT_LABEL = "Log Out";
