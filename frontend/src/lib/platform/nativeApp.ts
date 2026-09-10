/**
 * Contract: the Capacitor shell (`mobile/`) owns two signals and this module
 * only reads them — the web bundle never imports `@capacitor/core`, so it
 * stays dependency-free:
 *  1. `window.Capacitor` — the native bridge global, when running in the shell.
 *  2. A UA marker the shell appends via `capacitor.config.ts` `appendUserAgent`:
 *     `UncloudedApp/<version> (<ios|android>)`. This is the fallback used
 *     whenever the bridge global isn't available yet (or for platform/version
 *     info the bridge doesn't expose).
 */

export type NativePlatform = "ios" | "android";
export type AppPlatform = NativePlatform | "web";

const UA_MARKER_PATTERN = /UncloudedApp\/([\w.-]+) \((ios|android)\)/i;

interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function getCapacitorBridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  return (window as typeof window & { Capacitor?: CapacitorBridge }).Capacitor ?? null;
}

function parseUserAgentMarker(): { version: string; platform: NativePlatform } | null {
  if (typeof navigator === "undefined" || typeof navigator.userAgent !== "string") return null;
  const match = navigator.userAgent.match(UA_MARKER_PATTERN);
  if (!match) return null;
  const platform = match[2].toLowerCase();
  if (platform !== "ios" && platform !== "android") return null;
  return { version: match[1], platform };
}

export function isNativeApp(): boolean {
  if (getCapacitorBridge()?.isNativePlatform?.()) return true;
  return parseUserAgentMarker() !== null;
}

export function getNativePlatform(): NativePlatform | null {
  const bridgePlatform = getCapacitorBridge()?.getPlatform?.();
  if (bridgePlatform === "ios" || bridgePlatform === "android") return bridgePlatform;
  return parseUserAgentMarker()?.platform ?? null;
}

export function getNativeAppVersion(): string | null {
  return parseUserAgentMarker()?.version ?? null;
}

/** `app_platform` value for analytics: `ios` | `android` | `web`. */
export function getAppPlatform(): AppPlatform {
  return getNativePlatform() ?? "web";
}
