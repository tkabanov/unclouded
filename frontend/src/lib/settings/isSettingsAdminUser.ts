import { SETTINGS_TAB, SETTINGS_TAB_ORDER, type SettingsTabSlug } from "@/lib/settings/settingsTabStub";

/** Matches Bubble `is_admin` / profiles.roleType admin gate for settings admin tab. */
export function isSettingsAdminUser(roleType: string | null | undefined): boolean {
  return roleType === "admin";
}

export const ADMIN_CONSOLE_ROUTE = "/settings?tab=admin" as const;

export function isAdminAppLocation(pathname: string, tabParam: string | null): boolean {
  if (pathname !== "/settings") return false;
  if (!tabParam || tabParam === SETTINGS_TAB.ADMIN) return true;
  return false;
}

export function visibleSettingsTabs(
  roleType: string | null | undefined,
): SettingsTabSlug[] {
  if (isSettingsAdminUser(roleType)) {
    return [SETTINGS_TAB.ADMIN];
  }
  return SETTINGS_TAB_ORDER.filter((tab) => tab !== SETTINGS_TAB.ADMIN);
}
