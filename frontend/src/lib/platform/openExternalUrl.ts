import { isNativeApp } from "@/lib/platform/nativeApp";

export type OpenExternalUrlMode = "newTab" | "replace";

interface CapacitorBrowserPlugin {
  open: (options: { url: string }) => Promise<void>;
}

function getBrowserPlugin(): CapacitorBrowserPlugin | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as typeof window & {
    Capacitor?: { Plugins?: { Browser?: CapacitorBrowserPlugin } };
  }).Capacitor;
  return bridge?.Plugins?.Browser ?? null;
}

/**
 * Do not pass noopener/noreferrer as window.open features — those force a
 * null return even when the tab opened, which would falsely report failure
 * to callers relying on the boolean (e.g. the coach booking hold). Clearing
 * `opener` on the returned window gives the same isolation as noopener.
 */
function openInWebWindow(url: string, mode: OpenExternalUrlMode): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (mode === "replace") {
      window.location.assign(url);
      return true;
    }
    const opened = window.open(url, "_blank");
    if (!opened) return false;
    opened.opener = null;
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens `url` outside the app shell: the native Capacitor Browser plugin when
 * running in the wrapper (an in-app browser sheet the user dismisses back
 * into the app — never the WebView itself), `window.open`/`window.location`
 * on web. `mode` only affects the web fallback ("newTab" for share/booking
 * links that should not replace the current page; "replace" for a same-tab
 * redirect like the Stripe billing portal). Returns whether the open call
 * itself succeeded, not whether the destination finished loading.
 */
export function openExternalUrl(url: string, mode: OpenExternalUrlMode = "newTab"): boolean {
  if (isNativeApp()) {
    const browser = getBrowserPlugin();
    if (browser) {
      try {
        void browser.open({ url }).catch(() => {
          // Fire-and-forget: a native-side failure here has no UI to report to;
          // callers already got `true` for the synchronous call succeeding.
        });
        return true;
      } catch {
        return false;
      }
    }
    // Bridge present but Browser plugin unavailable: fall through to the web path.
  }
  return openInWebWindow(url, mode);
}
