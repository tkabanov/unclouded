/** Sidebar primary navigation */

export const SIDEBAR_NAV = {
  DASHBOARD: "dashboard",
  CHAT: "chat",
  JOURNAL: "journal",
  PATHS: "paths",
  SETTINGS: "settings",
} as const;

export type SidebarNavSlug = (typeof SIDEBAR_NAV)[keyof typeof SIDEBAR_NAV];

export const SIDEBAR_NAV_LABELS: Record<SidebarNavSlug, string> = {
  dashboard: "Dashboard",
  chat: "Chat",
  journal: "Journal",
  paths: "Paths & Resources",
  settings: "Settings",
};

export const SIDEBAR_NAV_ROUTES: Record<SidebarNavSlug, string> = {
  dashboard: "/dashboard",
  chat: "/chat",
  journal: "/journal",
  paths: "/paths",
  settings: "/settings",
};

export const SIDEBAR_NAV_ORDER: readonly SidebarNavSlug[] = [
  SIDEBAR_NAV.DASHBOARD,
  SIDEBAR_NAV.CHAT,
  SIDEBAR_NAV.JOURNAL,
  SIDEBAR_NAV.PATHS,
  SIDEBAR_NAV.SETTINGS,
];

export const SIDEBAR_MODE_LABEL = "Current Mode";

export const SIDEBAR_MODE_VALUE_PLACEHOLDER = "Professional • Executive Coaching";

/** Header logged-in nav */

export const HEADER_NAV = {
  DASHBOARD: "dashboard",
  CHAT: "chat",
  JOURNAL: "journal",
  PATHS: "paths",
} as const;

export type HeaderNavSlug = (typeof HEADER_NAV)[keyof typeof HEADER_NAV];

export const HEADER_NAV_LABELS: Record<HeaderNavSlug, string> = {
  dashboard: "Dashboard",
  chat: "Chat",
  journal: "Journal",
  paths: "Paths & Resources",
};

export const HEADER_NAV_ROUTES: Record<HeaderNavSlug, string> = {
  dashboard: "/dashboard",
  chat: "/chat",
  journal: "/journal",
  paths: "/paths",
};

export const HEADER_NAV_ORDER: readonly HeaderNavSlug[] = [
  HEADER_NAV.DASHBOARD,
  HEADER_NAV.CHAT,
  HEADER_NAV.JOURNAL,
  HEADER_NAV.PATHS,
];

export const HEADER_PROFILE_SETTINGS_LABEL = "Settings";

export const HEADER_PROFILE_LOGOUT_LABEL = "Log Out";
