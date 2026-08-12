import { SETTINGS_TAB, SETTINGS_TAB_ORDER, type SettingsTabSlug } from "@/lib/settings/settingsTabStub";

/** Matches Bubble `is_admin` / profiles.roleType admin gate for settings admin tab. */
export function isSettingsAdminUser(roleType: string | null | undefined): boolean {
  return roleType === "admin";
}

/** Lovable-style dedicated admin console (OVR-048). */
export const ADMIN_CONSOLE_ROUTE = "/admin" as const;

export function isAdminAppLocation(pathname: string, _tabParam?: string | null): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function visibleSettingsTabs(
  roleType: string | null | undefined,
): SettingsTabSlug[] {
  // Admins use `/admin` for console; Settings stays Profile / Security (OVR-051).
  void roleType;
  return SETTINGS_TAB_ORDER.filter((tab) => tab !== SETTINGS_TAB.ADMIN);
}
