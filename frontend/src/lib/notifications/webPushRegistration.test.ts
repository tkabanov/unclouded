import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WEB_PUSH_DISMISSED_KEY,
  dismissWebPushOffer,
  getWebPushBannerState,
  isWebPushDismissed,
} from "@/lib/notifications/webPushRegistration";

describe("webPushRegistration helpers", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "test-vapid-public-key");
    window.localStorage.clear();
    vi.stubGlobal("Notification", {
      permission: "default",
    });
    vi.stubGlobal("navigator", {
      serviceWorker: {},
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("shows prompt state for vulnerable users who have not decided yet", () => {
    expect(getWebPushBannerState()).toBe("prompt");
  });

  it("hides banner after dismiss", () => {
    dismissWebPushOffer();
    expect(isWebPushDismissed()).toBe(true);
    expect(getWebPushBannerState()).toBeNull();
  });

  it("shows denied state instead of hiding completely", () => {
    vi.stubGlobal("Notification", { permission: "denied" });
    expect(getWebPushBannerState()).toBe("denied");
  });

  it("shows misconfigured state when VAPID public key is missing", () => {
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "");
    expect(getWebPushBannerState()).toBe("misconfigured");
  });

  it("stores dismiss flag in localStorage", () => {
    dismissWebPushOffer();
    expect(window.localStorage.getItem(WEB_PUSH_DISMISSED_KEY)).toBe("1");
  });
});
