import { isNativeApp } from "@/lib/platform/nativeApp";

export interface SupabaseAuthStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

interface CapacitorPreferencesPlugin {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
}

function getPreferencesPlugin(): CapacitorPreferencesPlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { Preferences?: CapacitorPreferencesPlugin } };
  }).Capacitor;
  return bridge?.Plugins?.Preferences ?? null;
}

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Best-effort mirror; Preferences remains the source of truth on native.
  }
}

function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

/**
 * Supabase auth storage adapter.
 *
 * Web (no native bridge): returns `localStorage` itself, unchanged — the web
 * build's persisted-session behavior is byte-identical to before MOB-05.
 *
 * Native: Capacitor `Preferences` is the source of truth (it survives iOS
 * evicting a backgrounded WKWebView's localStorage under storage pressure,
 * which plain localStorage does not). `localStorage` is kept as a
 * synchronous mirror — Supabase's client accepts an async `getItem`, but
 * `sessionAuth.ts`'s forced clear-on-sign-out reads the token key from
 * localStorage directly, so every native write/remove updates both stores.
 * `getItem` does not block on Preferences before returning something: it
 * resolves the async read, but first paint isn't gated on it since this is
 * only invoked from Supabase's own internal session bootstrap, which is
 * already async.
 *
 * One-time migration: the first `getItem` call on a native launch where
 * Preferences has nothing yet but localStorage already holds a session
 * (upgrading from a pre-MOB-05 build, or a Preferences read failure) copies
 * that value into Preferences so it survives from then on.
 */
export function createSupabaseAuthStorage(): SupabaseAuthStorage {
  if (!isNativeApp()) return localStorage;

  const preferences = getPreferencesPlugin();
  if (!preferences) return localStorage;

  return {
    async getItem(key) {
      try {
        const { value } = await preferences.get({ key });
        if (value !== null) {
          writeLocalStorage(key, value);
          return value;
        }
      } catch {
        // Preferences unavailable this call; fall through to the mirror below.
      }

      const migrated = readLocalStorage(key);
      if (migrated !== null) {
        try {
          await preferences.set({ key, value: migrated });
        } catch {
          // Migration is best-effort; the mirror still has the value.
        }
      }
      return migrated;
    },
    async setItem(key, value) {
      writeLocalStorage(key, value);
      try {
        await preferences.set({ key, value });
      } catch {
        // Preferences write failed; the localStorage mirror still has it.
      }
    },
    async removeItem(key) {
      removeLocalStorage(key);
      try {
        await preferences.remove({ key });
      } catch {
        // Best-effort.
      }
    },
  };
}
