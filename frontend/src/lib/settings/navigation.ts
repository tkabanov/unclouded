import { SETTINGS_TAB, type SettingsTabSlug } from "@/lib/settings/settingsTabStub";

export const SETTINGS_ROUTE = "/settings" as const;

export function settingsPath(tab?: SettingsTabSlug): string {
  if (!tab || tab === SETTINGS_TAB.PROFILE) {
    return SETTINGS_ROUTE;
  }
  return `${SETTINGS_ROUTE}?tab=${tab}`;
}

export function isSettingsTabSlug(value: string | null): value is SettingsTabSlug {
  if (!value) return false;
  return Object.values(SETTINGS_TAB).includes(value as SettingsTabSlug);
}
