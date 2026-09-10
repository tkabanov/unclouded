import type { CapacitorConfig } from "@capacitor/cli";

/**
 * MOB-00 lock: the shell loads the deployed web app via `server.url` (no
 * bundled frontend build) — web changes ship through the normal web deploy,
 * no store release needed. `webDir` only holds the local offline fallback.
 *
 * MOB-03 security boundary: `allowNavigation` is the WebView's navigation
 * allowlist. It intentionally does NOT include payment hosts (Stripe) or any
 * third-party destination (Google Meet/Calendar, LinkedIn, marketing sites) —
 * those must leave the WebView via the system browser (MOB-04's
 * `openExternalUrl`), never navigate inside it.
 *
 * The `appendUserAgent` marker format (`UncloudedApp/<version> (<platform>)`)
 * is fixed by MOB-02's `nativeApp.ts` UA_MARKER_PATTERN — changing it here
 * requires updating that regex too.
 */
const APP_VERSION = "1.0.0";
const PROD_ORIGIN = "uncloud360.vercel.app";
const SUPABASE_HOST = "szkextipgpupqoppccoy.supabase.co";

const config: CapacitorConfig = {
  appId: "com.provenunderpressure.unclouded",
  appName: "Unclouded",
  webDir: "www",
  server: {
    url: `https://${PROD_ORIGIN}`,
    androidScheme: "https",
    allowNavigation: [PROD_ORIGIN, SUPABASE_HOST],
    errorPath: "offline.html",
  },
  ios: {
    appendUserAgent: `UncloudedApp/${APP_VERSION} (ios)`,
    contentInset: "always",
    scrollEnabled: true,
  },
  android: {
    appendUserAgent: `UncloudedApp/${APP_VERSION} (android)`,
    // MOB-UI-001: targetSdk 35 enforces edge-to-edge regardless of the theme
    // opt-out attribute, and env(safe-area-inset-*) isn't reliably populated
    // in this Chromium WebView — so the header/banner render under the
    // status bar with no offset. "force" makes Capacitor apply system-bar +
    // cutout insets as native WebView margins on every Android version,
    // independent of CSS safe-area support.
    adjustMarginsForEdgeToEdge: "force",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 400,
      backgroundColor: "#f2f8fa",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#f2f8fa",
    },
  },
};

export default config;
