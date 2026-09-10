import { isNativeApp } from "@/lib/platform/nativeApp";

interface CapacitorAppPlugin {
  addListener: (
    eventName: "resume",
    callback: () => void,
  ) => Promise<{ remove: () => void }> | { remove: () => void };
}

function getAppPlugin(): CapacitorAppPlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { App?: CapacitorAppPlugin } };
  }).Capacitor;
  return bridge?.Plugins?.App ?? null;
}

/**
 * Native-only "resume" hook (e.g. returning from the Browser plugin's in-app
 * sheet after MOB-04's `openExternalUrl`, such as the Stripe billing portal).
 * No-ops on web, where the tab-refocus revalidation in `useAuth.tsx`
 * (commit abb4fd3) already covers this. Returns an unsubscribe function.
 */
export function onNativeAppResume(callback: () => void): () => void {
  if (!isNativeApp()) return () => {};

  const app = getAppPlugin();
  if (!app) return () => {};

  let handle: { remove: () => void } | null = null;
  let cancelled = false;

  Promise.resolve(app.addListener("resume", callback)).then((result) => {
    if (cancelled) {
      result.remove();
      return;
    }
    handle = result;
  });

  return () => {
    cancelled = true;
    handle?.remove();
  };
}
