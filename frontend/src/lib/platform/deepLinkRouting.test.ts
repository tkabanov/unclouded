import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

const openExternalUrl = vi.fn();
vi.mock("@/lib/platform/openExternalUrl", () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import {
  initNativeDeepLinkListener,
  registerDeepLinkNavigator,
  resetDeepLinkRoutingForTests,
  resolveDeepLink,
  routeDeepLink,
} from "./deepLinkRouting";

const mockIsNativeApp = vi.mocked(isNativeApp);
const APP_ORIGIN = "https://uncloud360.vercel.app";

function setAppPlugin(app: unknown) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = app
    ? { Plugins: { App: app } }
    : undefined;
}

describe("resolveDeepLink", () => {
  it("resolves a same-origin path as internal", () => {
    const result = resolveDeepLink(`${APP_ORIGIN}/dashboard`, APP_ORIGIN);
    expect(result).toEqual({ kind: "internal", path: "/dashboard" });
  });

  it("preserves the /reset_pw recovery token payload (hash + query)", () => {
    const url = `${APP_ORIGIN}/reset_pw?foo=bar#access_token=abc123&type=recovery`;
    const result = resolveDeepLink(url, APP_ORIGIN);
    expect(result).toEqual({
      kind: "internal",
      path: "/reset_pw?foo=bar#access_token=abc123&type=recovery",
    });
  });

  it("resolves a foreign origin as external", () => {
    const result = resolveDeepLink("https://evil.example.com/dashboard", APP_ORIGIN);
    expect(result).toEqual({ kind: "external", url: "https://evil.example.com/dashboard" });
  });

  it("returns null for a malformed URL", () => {
    expect(resolveDeepLink("not a url", APP_ORIGIN)).toBeNull();
    expect(resolveDeepLink("", APP_ORIGIN)).toBeNull();
  });

  it("returns null when appOrigin itself is malformed, without throwing", () => {
    expect(() => resolveDeepLink(`${APP_ORIGIN}/dashboard`, "not-an-origin")).not.toThrow();
    expect(resolveDeepLink(`${APP_ORIGIN}/dashboard`, "not-an-origin")).toBeNull();
  });
});

describe("routeDeepLink / registerDeepLinkNavigator", () => {
  afterEach(() => {
    resetDeepLinkRoutingForTests();
    openExternalUrl.mockClear();
  });

  it("delivers an internal path to the registered navigator immediately", () => {
    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    routeDeepLink(`${APP_ORIGIN}/dashboard`, APP_ORIGIN);

    expect(navigate).toHaveBeenCalledWith("/dashboard");
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("opens an external URL immediately, never touching the navigator", () => {
    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    routeDeepLink("https://evil.example.com/x", APP_ORIGIN);

    expect(openExternalUrl).toHaveBeenCalledWith("https://evil.example.com/x");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not navigate or throw for a malformed URL", () => {
    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    expect(() => routeDeepLink("not a url", APP_ORIGIN)).not.toThrow();
    expect(navigate).not.toHaveBeenCalled();
    expect(openExternalUrl).not.toHaveBeenCalled();
  });

  it("queues a cold-start deep link and flushes it once a navigator registers", () => {
    routeDeepLink(`${APP_ORIGIN}/settings`, APP_ORIGIN);

    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    expect(navigate).toHaveBeenCalledWith("/settings");
  });

  it("flushes multiple queued links in arrival order", () => {
    routeDeepLink(`${APP_ORIGIN}/a`, APP_ORIGIN);
    routeDeepLink(`${APP_ORIGIN}/b`, APP_ORIGIN);

    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    expect(navigate).toHaveBeenNthCalledWith(1, "/a");
    expect(navigate).toHaveBeenNthCalledWith(2, "/b");
  });

  it("an unregistered navigator no longer receives new deep links", () => {
    const navigate = vi.fn();
    const unregister = registerDeepLinkNavigator(navigate);
    unregister();

    routeDeepLink(`${APP_ORIGIN}/dashboard`, APP_ORIGIN);

    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("initNativeDeepLinkListener", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
    setAppPlugin(undefined);
    resetDeepLinkRoutingForTests();
    vi.unstubAllEnvs();
  });

  it("no-ops on web", () => {
    const unsubscribe = initNativeDeepLinkListener();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("no-ops when native but the App plugin bridge is missing", () => {
    mockIsNativeApp.mockReturnValue(true);
    setAppPlugin(undefined);
    const unsubscribe = initNativeDeepLinkListener();
    expect(() => unsubscribe()).not.toThrow();
  });

  it("subscribes to appUrlOpen and routes the tapped URL", async () => {
    mockIsNativeApp.mockReturnValue(true);
    vi.stubEnv("VITE_APP_URL", "https://uncloud360.vercel.app");
    const navigate = vi.fn();
    registerDeepLinkNavigator(navigate);

    let capturedCallback: ((event: { url: string }) => void) | null = null;
    const remove = vi.fn();
    setAppPlugin({
      addListener: vi.fn((_event: string, cb: (event: { url: string }) => void) => {
        capturedCallback = cb;
        return Promise.resolve({ remove });
      }),
    });

    const unsubscribe = initNativeDeepLinkListener();
    await Promise.resolve();
    await Promise.resolve();

    expect(capturedCallback).not.toBeNull();
    capturedCallback?.({ url: "https://uncloud360.vercel.app/dashboard" });

    expect(navigate).toHaveBeenCalledWith("/dashboard");

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});
