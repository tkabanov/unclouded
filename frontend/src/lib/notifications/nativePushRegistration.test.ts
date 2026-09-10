import { afterEach, describe, expect, it, vi } from "vitest";

const functionsInvoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => functionsInvoke(...args),
    },
  },
}));

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => true),
  getNativePlatform: vi.fn(() => "ios"),
  getNativeAppVersion: vi.fn(() => "1.0.0"),
}));

import { getNativePlatform, isNativeApp } from "@/lib/platform/nativeApp";
import {
  enableNativePushNotifications,
  getNativePushBannerState,
  resetNativePushRegistrationForTests,
  syncNativePushIfGranted,
} from "./nativePushRegistration";

const mockIsNativeApp = vi.mocked(isNativeApp);
const mockGetNativePlatform = vi.mocked(getNativePlatform);

type Listener = (payload: unknown) => void;

function makePushPlugin() {
  const listeners: Record<string, Listener[]> = {};
  return {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    register: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn((eventName: string, callback: Listener) => {
      (listeners[eventName] ??= []).push(callback);
      return Promise.resolve({ remove: vi.fn() });
    }),
    emit(eventName: string, payload: unknown) {
      for (const cb of listeners[eventName] ?? []) cb(payload);
    },
  };
}

function setPushPlugin(plugin: unknown) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = plugin
    ? { Plugins: { PushNotifications: plugin } }
    : undefined;
}

describe("nativePushRegistration", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(true);
    mockGetNativePlatform.mockReturnValue("ios");
    functionsInvoke.mockClear();
    setPushPlugin(undefined);
    resetNativePushRegistrationForTests();
    vi.resetModules();
  });

  describe("getNativePushBannerState", () => {
    it("returns null on web", async () => {
      mockIsNativeApp.mockReturnValue(false);
      expect(await getNativePushBannerState()).toBeNull();
    });

    it("returns unsupported when the bridge is missing", async () => {
      setPushPlugin(undefined);
      expect(await getNativePushBannerState()).toBe("unsupported");
    });

    it("returns null when already granted", async () => {
      const plugin = makePushPlugin();
      plugin.checkPermissions.mockResolvedValue({ receive: "granted" });
      setPushPlugin(plugin);
      expect(await getNativePushBannerState()).toBeNull();
    });

    it("returns denied/prompt otherwise", async () => {
      const plugin = makePushPlugin();
      plugin.checkPermissions.mockResolvedValue({ receive: "denied" });
      setPushPlugin(plugin);
      expect(await getNativePushBannerState()).toBe("denied");

      plugin.checkPermissions.mockResolvedValue({ receive: "prompt" });
      expect(await getNativePushBannerState()).toBe("prompt");
    });
  });

  describe("enableNativePushNotifications", () => {
    it("is unsupported on web", async () => {
      mockIsNativeApp.mockReturnValue(false);
      expect(await enableNativePushNotifications()).toEqual({ status: "unsupported" });
    });

    it("is unsupported when the bridge is missing", async () => {
      setPushPlugin(undefined);
      expect(await enableNativePushNotifications()).toEqual({ status: "unsupported" });
    });

    it("returns denied without calling register() when permission is refused", async () => {
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "denied" });
      setPushPlugin(plugin);

      expect(await enableNativePushNotifications()).toEqual({ status: "denied" });
      expect(plugin.register).not.toHaveBeenCalled();
    });

    it("registers and posts the device token once the registration event fires", async () => {
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "granted" });
      setPushPlugin(plugin);

      const result = await enableNativePushNotifications();
      expect(result).toEqual({ status: "registered" });
      expect(plugin.register).toHaveBeenCalled();

      plugin.emit("registration", { value: "fcm-token-abc" });
      await Promise.resolve();
      await Promise.resolve();

      expect(functionsInvoke).toHaveBeenCalledWith(
        "register-push-subscription",
        expect.objectContaining({
          body: { platform: "ios", deviceToken: "fcm-token-abc", appVersion: "1.0.0" },
        }),
      );
    });

    it("surfaces a register() failure instead of resolving silently", async () => {
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "granted" });
      plugin.register.mockRejectedValue(new Error("device offline"));
      setPushPlugin(plugin);

      expect(await enableNativePushNotifications()).toEqual({
        status: "skipped",
        reason: "device offline",
      });
    });

    it("creates the Android notification channel before registering, only on Android", async () => {
      mockGetNativePlatform.mockReturnValue("android");
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "granted" });
      setPushPlugin(plugin);

      await enableNativePushNotifications();

      expect(plugin.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({ id: "uncloud360_default" }),
      );
    });

    it("does not create an Android channel on iOS", async () => {
      mockGetNativePlatform.mockReturnValue("ios");
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "granted" });
      setPushPlugin(plugin);

      await enableNativePushNotifications();

      expect(plugin.createChannel).not.toHaveBeenCalled();
    });

    it("a channel-creation failure does not block registration", async () => {
      mockGetNativePlatform.mockReturnValue("android");
      const plugin = makePushPlugin();
      plugin.requestPermissions.mockResolvedValue({ receive: "granted" });
      plugin.createChannel.mockRejectedValue(new Error("channel API unavailable"));
      setPushPlugin(plugin);

      expect(await enableNativePushNotifications()).toEqual({ status: "registered" });
      expect(plugin.register).toHaveBeenCalled();
    });
  });

  describe("syncNativePushIfGranted", () => {
    it("skips without calling register() when permission is not granted", async () => {
      const plugin = makePushPlugin();
      plugin.checkPermissions.mockResolvedValue({ receive: "prompt" });
      setPushPlugin(plugin);

      const result = await syncNativePushIfGranted();
      expect(result.status).toBe("skipped");
      expect(plugin.register).not.toHaveBeenCalled();
    });

    it("re-registers when permission was already granted", async () => {
      const plugin = makePushPlugin();
      plugin.checkPermissions.mockResolvedValue({ receive: "granted" });
      setPushPlugin(plugin);

      expect(await syncNativePushIfGranted()).toEqual({ status: "registered" });
      expect(plugin.register).toHaveBeenCalled();
    });
  });
});
