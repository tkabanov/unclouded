import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAppPlatform,
  getNativeAppVersion,
  getNativePlatform,
  isNativeApp,
} from "./nativeApp";

const ORIGINAL_UA = navigator.userAgent;

function setUserAgent(value: string) {
  vi.stubGlobal("navigator", { ...navigator, userAgent: value });
}

function setCapacitorBridge(bridge: { isNativePlatform?: () => boolean; getPlatform?: () => string } | undefined) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = bridge;
}

describe("nativeApp", () => {
  afterEach(() => {
    setUserAgent(ORIGINAL_UA);
    setCapacitorBridge(undefined);
  });

  it("plain UA + no bridge is web", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");

    expect(isNativeApp()).toBe(false);
    expect(getNativePlatform()).toBeNull();
    expect(getAppPlatform()).toBe("web");
    expect(getNativeAppVersion()).toBeNull();
  });

  it("UA marker only resolves the correct platform and version", () => {
    setUserAgent("Mozilla/5.0 (iPhone) UncloudedApp/1.2.3 (ios)");

    expect(isNativeApp()).toBe(true);
    expect(getNativePlatform()).toBe("ios");
    expect(getAppPlatform()).toBe("ios");
    expect(getNativeAppVersion()).toBe("1.2.3");
  });

  it("bridge present takes precedence for platform", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 13) UncloudedApp/2.0.0 (android)");
    setCapacitorBridge({
      isNativePlatform: () => true,
      getPlatform: () => "android",
    });

    expect(isNativeApp()).toBe(true);
    expect(getNativePlatform()).toBe("android");
    expect(getAppPlatform()).toBe("android");
  });

  it("bridge isNativePlatform true with no UA marker is still native with no platform/version", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    setCapacitorBridge({ isNativePlatform: () => true });

    expect(isNativeApp()).toBe(true);
    expect(getNativePlatform()).toBeNull();
    expect(getNativeAppVersion()).toBeNull();
  });

  it("does not throw when window/navigator access is unusual", () => {
    setCapacitorBridge(undefined);
    expect(() => isNativeApp()).not.toThrow();
    expect(() => getNativePlatform()).not.toThrow();
    expect(() => getNativeAppVersion()).not.toThrow();
  });
});
