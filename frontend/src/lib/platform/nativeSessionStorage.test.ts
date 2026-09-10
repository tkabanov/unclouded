import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/platform/nativeApp", () => ({
  isNativeApp: vi.fn(() => false),
}));

import { isNativeApp } from "@/lib/platform/nativeApp";
import { createSupabaseAuthStorage } from "./nativeSessionStorage";

const mockIsNativeApp = vi.mocked(isNativeApp);

function setPreferencesPlugin(prefs: unknown) {
  (window as typeof window & { Capacitor?: unknown }).Capacitor = prefs
    ? { Plugins: { Preferences: prefs } }
    : undefined;
}

function makeInMemoryPreferences() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async ({ key }: { key: string }) => ({ value: store.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
    }),
    remove: vi.fn(async ({ key }: { key: string }) => {
      store.delete(key);
    }),
  };
}

describe("createSupabaseAuthStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    mockIsNativeApp.mockReturnValue(false);
    setPreferencesPlugin(undefined);
    localStorage.clear();
  });

  it("returns localStorage unchanged on web", () => {
    const storage = createSupabaseAuthStorage();
    expect(storage).toBe(localStorage);
  });

  it("falls back to localStorage when native but the Preferences bridge is missing", () => {
    mockIsNativeApp.mockReturnValue(true);
    setPreferencesPlugin(undefined);

    const storage = createSupabaseAuthStorage();
    expect(storage).toBe(localStorage);
  });

  it("native path round-trips a token through Preferences and mirrors to localStorage", async () => {
    mockIsNativeApp.mockReturnValue(true);
    const prefs = makeInMemoryPreferences();
    setPreferencesPlugin(prefs);

    const storage = createSupabaseAuthStorage();
    await storage.setItem("sb-test-auth-token", "abc123");

    expect(prefs.set).toHaveBeenCalledWith({ key: "sb-test-auth-token", value: "abc123" });
    expect(localStorage.getItem("sb-test-auth-token")).toBe("abc123");

    const read = await storage.getItem("sb-test-auth-token");
    expect(read).toBe("abc123");

    await storage.removeItem("sb-test-auth-token");
    expect(prefs.remove).toHaveBeenCalledWith({ key: "sb-test-auth-token" });
    expect(localStorage.getItem("sb-test-auth-token")).toBeNull();
  });

  it("migrates an existing localStorage session into Preferences on first native read", async () => {
    mockIsNativeApp.mockReturnValue(true);
    localStorage.setItem("sb-test-auth-token", "pre-existing-session");
    const prefs = makeInMemoryPreferences();
    setPreferencesPlugin(prefs);

    const storage = createSupabaseAuthStorage();
    const value = await storage.getItem("sb-test-auth-token");

    expect(value).toBe("pre-existing-session");
    expect(prefs.set).toHaveBeenCalledWith({
      key: "sb-test-auth-token",
      value: "pre-existing-session",
    });
    expect(prefs.store.get("sb-test-auth-token")).toBe("pre-existing-session");
  });

  it("falls back to the localStorage mirror when a Preferences read throws", async () => {
    mockIsNativeApp.mockReturnValue(true);
    localStorage.setItem("sb-test-auth-token", "mirrored-value");
    setPreferencesPlugin({
      get: vi.fn().mockRejectedValue(new Error("bridge down")),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    });

    const storage = createSupabaseAuthStorage();
    const value = await storage.getItem("sb-test-auth-token");

    expect(value).toBe("mirrored-value");
  });
});
