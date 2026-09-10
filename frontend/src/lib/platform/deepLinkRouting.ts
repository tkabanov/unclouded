import { getAppOrigin } from "@/lib/appUrl";
import { isNativeApp } from "@/lib/platform/nativeApp";
import { openExternalUrl } from "@/lib/platform/openExternalUrl";

export type ResolvedDeepLink =
  | { kind: "internal"; path: string }
  | { kind: "external"; url: string };

/**
 * Maps an incoming URL (from Capacitor's `App.appUrlOpen`, or a push
 * notification's `data.url`) to either an in-app route or an external open.
 *
 * Same-origin as `appOrigin` → `"internal"`, with the path/query/hash
 * preserved verbatim so `/reset_pw#access_token=...&type=recovery` keeps its
 * token payload for `recoverySession.ts` to consume unchanged. Anything else
 * — a foreign origin, or a URL that fails to parse — never reaches the
 * in-app router: `null` for malformed input, `"external"` otherwise, which
 * callers hand to `openExternalUrl` (MOB-04).
 */
export function resolveDeepLink(url: string, appOrigin: string): ResolvedDeepLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  let origin: URL;
  try {
    origin = new URL(appOrigin);
  } catch {
    return null;
  }

  if (parsed.origin === origin.origin) {
    return { kind: "internal", path: `${parsed.pathname}${parsed.search}${parsed.hash}` };
  }

  return { kind: "external", url: parsed.toString() };
}

type Navigate = (path: string) => void;

let pendingPaths: string[] = [];
let activeNavigate: Navigate | null = null;

function deliverOrQueueInternalPath(path: string): void {
  if (activeNavigate) {
    activeNavigate(path);
    return;
  }
  pendingPaths.push(path);
}

/**
 * Routes one incoming URL: external destinations leave the WebView via
 * `openExternalUrl` immediately (no router dependency); internal paths are
 * delivered to the currently-registered navigator or queued for the next one
 * (cold start: the deep link can arrive before the router mounts).
 */
export function routeDeepLink(url: string, appOrigin: string = getAppOrigin()): void {
  const resolved = resolveDeepLink(url, appOrigin);
  if (!resolved) return;

  if (resolved.kind === "external") {
    openExternalUrl(resolved.url);
    return;
  }

  deliverOrQueueInternalPath(resolved.path);
}

/**
 * Called once by the mounted router-aware listener component. Immediately
 * flushes any path(s) queued before the router existed (cold start), then
 * receives new ones as they arrive.
 */
export function registerDeepLinkNavigator(navigate: Navigate): () => void {
  activeNavigate = navigate;

  const queued = pendingPaths;
  pendingPaths = [];
  for (const path of queued) navigate(path);

  return () => {
    if (activeNavigate === navigate) activeNavigate = null;
  };
}

/** Test-only reset of module state between cases. */
export function resetDeepLinkRoutingForTests(): void {
  pendingPaths = [];
  activeNavigate = null;
}

interface CapacitorAppUrlOpenEvent {
  url: string;
}

interface CapacitorAppPlugin {
  addListener: (
    eventName: "appUrlOpen",
    callback: (event: CapacitorAppUrlOpenEvent) => void,
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
 * Native-only: subscribes to `App.appUrlOpen` (universal/app-link taps while
 * the app is running or brought to foreground) and routes each URL. Returns
 * an unsubscribe function; no-ops on web or when the bridge is unavailable.
 */
export function initNativeDeepLinkListener(): () => void {
  if (!isNativeApp()) return () => {};

  const app = getAppPlugin();
  if (!app) return () => {};

  let handle: { remove: () => void } | null = null;
  let cancelled = false;

  Promise.resolve(
    app.addListener("appUrlOpen", (event) => routeDeepLink(event.url)),
  ).then((result) => {
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
