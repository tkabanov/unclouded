import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { onNativeAppResume } from "./nativeAppResume";

const mockIsNativeApp = vi.mocked(isNativeApp);

function setAppPlugin(app: unknown) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = app
    ? { Plugins: { App: app } }
    : undefined;
}

describe("onNativeAppResume", () => {
  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
    setAppPlugin(undefined);
  });

  it("no-ops on web", () => {
    const callback = vi.fn();
    const unsubscribe = onNativeAppResume(callback);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("no-ops when native but the App plugin bridge is missing", () => {
    mockIsNativeApp.mockReturnValue(true);
    setAppPlugin(undefined);
    const unsubscribe = onNativeAppResume(vi.fn());
    expect(() => unsubscribe()).not.toThrow();
  });

  it("subscribes to the native resume event and unsubscribes on cleanup", async () => {
    mockIsNativeApp.mockReturnValue(true);
    const remove = vi.fn();
    const addListener = vi.fn().mockResolvedValue({ remove });
    setAppPlugin({ addListener });

    const callback = vi.fn();
    const unsubscribe = onNativeAppResume(callback);

    expect(addListener).toHaveBeenCalledWith("resume", callback);
    await Promise.resolve();
    await Promise.resolve();

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});
