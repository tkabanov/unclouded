import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { openExternalUrl } from "./openExternalUrl";

const mockIsNativeApp = vi.mocked(isNativeApp);

function setBrowserPlugin(browser: { open: (opts: { url: string }) => Promise<void> } | undefined) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = browser
    ? { Plugins: { Browser: browser } }
    : undefined;
}

describe("openExternalUrl", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
    setBrowserPlugin(undefined);
    vi.restoreAllMocks();
  });

  it("web path calls window.open and clears opener", () => {
    const fakeWindow = { opener: "something" } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    const result = openExternalUrl("https://example.com");

    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank");
    expect(fakeWindow.opener).toBeNull();
  });

  it("web path returns false when window.open is blocked", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(openExternalUrl("https://example.com")).toBe(false);
  });

  it("web path with mode 'replace' navigates the current page", () => {
    // jsdom's window.location.assign isn't configurable, so spyOn can't wrap
    // it directly — replace the whole `location` object for this test.
    const originalLocation = window.location;
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, assign: assignSpy },
      configurable: true,
    });
    const openSpy = vi.spyOn(window, "open");

    try {
      const result = openExternalUrl("https://example.com/portal", "replace");

      expect(result).toBe(true);
      expect(assignSpy).toHaveBeenCalledWith("https://example.com/portal");
      expect(openSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        configurable: true,
      });
    }
  });

  it("native path calls the Capacitor Browser bridge, not window.open", () => {
    mockIsNativeApp.mockReturnValue(true);
    const open = vi.fn().mockResolvedValue(undefined);
    setBrowserPlugin({ open });
    const openSpy = vi.spyOn(window, "open");

    const result = openExternalUrl("https://example.com");

    expect(result).toBe(true);
    expect(open).toHaveBeenCalledWith({ url: "https://example.com" });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("native path falls back to the web path when the Browser plugin is missing", () => {
    mockIsNativeApp.mockReturnValue(true);
    setBrowserPlugin(undefined);
    const fakeWindow = { opener: "x" } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fakeWindow);

    const result = openExternalUrl("https://example.com");

    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalled();
  });

  it("returns false when the native bridge call throws synchronously", () => {
    mockIsNativeApp.mockReturnValue(true);
    setBrowserPlugin({
      open: () => {
        throw new Error("bridge down");
      },
    });

    expect(openExternalUrl("https://example.com")).toBe(false);
  });
});
