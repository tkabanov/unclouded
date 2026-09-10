# Unclouded mobile shell (Capacitor)

Native iOS + Android wrapper around the deployed web app. Locked in `MOB-00`
(see [`docs/mobile-app-wrapper-implementation-plan.md`](../docs/mobile-app-wrapper-implementation-plan.md)
and [OVR-066](../docs/product-overrides.md)): the shell loads the production
web app via `server.url` — it does **not** bundle `frontend/dist`. A UI change
ships through the normal web deploy pipeline; no store release is needed
unless native code itself changes (permissions, plugins, icons, deep-link
config).

This is a **separate npm project** from `frontend/` — Capacitor packages are
not added to `frontend/package.json`, and nothing under `frontend/src` imports
`@capacitor/*` (the web bundle stays dependency-free; see
`frontend/src/lib/platform/nativeApp.ts`).

## Prerequisites

- Node 20+
- For Android builds: Android Studio (or the standalone Android SDK
  command-line tools) with `ANDROID_HOME`/`ANDROID_SDK_ROOT` set, and **JDK 21**
  (the `capacitor-android` module compiles with `sourceCompatibility 21`; a
  JDK 17 `JAVA_HOME` fails with `invalid source release: 21`). Point Gradle at
  a JDK 21 install via `JAVA_HOME` or `org.gradle.java.home` in
  `android/gradle.properties` if your default JDK is older.
- For iOS builds: macOS with Xcode 15+ and CocoaPods (`sudo gem install cocoapods`).

## Setup

```bash
cd mobile
npm install
npx cap sync
```

`cap sync` copies `capacitor.config.ts`, the local `www/offline.html` fallback,
and plugin native code into `android/` and `ios/`. Re-run it after editing
`capacitor.config.ts` or changing the plugin list in `package.json`.

## Run

```bash
npx cap open android   # opens android/ in Android Studio
npx cap open ios       # opens ios/App/App.xcworkspace in Xcode (macOS only)
```

Run/debug from the IDE as normal. The app loads `capacitor.config.ts`'s
`server.url` (production origin) — to point at a local dev build instead,
temporarily change `PROD_ORIGIN` in `capacitor.config.ts` to your machine's
LAN IP + Vite dev port and re-run `cap sync` (never commit that change).

## Where things live

- `capacitor.config.ts` — app id, `server.url`/`allowNavigation` (the WebView
  navigation allowlist — a security boundary, see the file's header comment),
  the `appendUserAgent` marker (`UncloudedApp/<version> (<platform>)`) that
  `frontend/src/lib/platform/nativeApp.ts` parses, and splash/status-bar config.
- `www/offline.html` — the only local web content; shown when `server.url`
  can't be reached (`server.errorPath`) or on a native network-offline event.
- `resources/` — 1024×1024 `icon.png` and 2732×2732 `splash.png` /
  `splash-dark.png` source images (generated from the existing brand favicon
  via `npx capacitor-assets generate`, which writes the per-density
  Android/iOS assets into `android/`/`ios/`). Regenerate after brand assets
  change: replace the files in `resources/`, then re-run
  `npx capacitor-assets generate` (requires `@capacitor/assets`, installed
  on demand with `npm install --no-save @capacitor/assets`).
- `android/app/src/main/java/.../MainActivity.java` — hardware back button:
  goes back in WebView history, minimizes the task (does not kill the
  process/session) at the app root.
- `android/`, `ios/` — generated native projects; do not hand-edit generated
  Gradle/Xcode boilerplate beyond what's documented here.
- **MOB-12 deep links** — `ios/App/App/App.entitlements` (associated domains)
  and the `AndroidManifest.xml` App Links `<intent-filter android:autoVerify="true">`
  both point at `uncloud360.vercel.app`; the matching
  `frontend/public/.well-known/apple-app-site-association` and `assetlinks.json`
  files must be reachable at that origin for the OS to verify the link once
  deployed (Vercel is configured in `vercel.json` to serve `.well-known/*`
  as-is with the right content type, instead of falling through to the SPA
  rewrite). Two values in those two files are placeholders that only exist
  once the real accounts/keys do (**MOB-13**, human ops):
  - `apple-app-site-association`'s `appID` needs the real Apple Developer
    **Team ID** prefix (currently `TODOTEAMID.com.provenunderpressure.unclouded`).
  - `assetlinks.json`'s `sha256_cert_fingerprints` needs the SHA-256
    fingerprint of the release signing keystore (`keytool -list -v -keystore
    <path> | grep SHA256`), once that keystore exists.
  - In-app routing: `frontend/src/lib/platform/deepLinkRouting.ts` (+
    `DeepLinkListener` mounted in `App.tsx`) maps an incoming URL to an
    in-app route only when it's same-origin; anything else opens externally
    via `openExternalUrl` (`MOB-04`), never inside the WebView.

## Environment notes (this repo's dev machine)

Verified in this environment (Windows, no Android SDK / no Xcode installed):

- `npm install` + `npx cap sync` complete cleanly for both platforms.
- `cd android && ./gradlew assembleDebug` resolves all Gradle plugins and
  configures the project successfully, then fails at
  **`SDK location not found`** — i.e. no Android SDK is installed on this
  machine (`ANDROID_HOME`/`local.properties` unset). This is an environment
  gap, not a project misconfiguration; installing Android Studio (or the
  command-line SDK tools) and setting `ANDROID_HOME` is expected to unblock
  the build.
- iOS: `npx cap add ios` scaffolded `ios/App/App.xcworkspace`, but
  `pod install` and `xcodebuild` were skipped (CocoaPods/Xcode are
  Mac-only tools, unavailable on Windows). Building requires a Mac.

## Permissions / secrets

No `service_role` key, VAPID private key, or Stripe key is present anywhere
under `mobile/` (grep-verified). Native push (`MOB-09` client registration,
`MOB-10` FCM send):

- **Android** — `google-services.json` is now present at
  `mobile/android/app/google-services.json` (Firebase project `unclouded-a1e83`,
  gitignored — never commit it). `cap sync android` + `gradlew assembleDebug`
  verified clean with it in place.
- **iOS** — still needs an APNs auth key (`.p8`) uploaded to Firebase Cloud
  Messaging, plus the `aps-environment` entitlement in
  `ios/App/App/App.entitlements` and the Push Notifications capability in
  Xcode. Requires Apple Developer account access; not done yet.
- The edge secret **`FCM_SERVICE_ACCOUNT_JSON`** (Supabase project settings →
  Edge Functions → Secrets) — the full JSON key for a Firebase service
  account with the "Firebase Cloud Messaging API" role. Read only via
  `Deno.env`/`process.env` in
  `supabase/functions/_shared/nativePushDelivery.ts`, the same pattern as the
  existing `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets — never committed,
  and the push send degrades to a logged skip (never throws) when it's unset.

### Getting/setting `FCM_SERVICE_ACCOUNT_JSON`

1. Firebase console → Project settings → **Service accounts** →
   `https://console.firebase.google.com/project/unclouded-a1e83/settings/serviceaccounts/adminsdk`
   → **Generate new private key** → downloads a
   `unclouded-a1e83-firebase-adminsdk-*.json` file. Treat it as a secret:
   never commit it, never paste it into chat/tickets, delete the local copy
   once it's pushed to Supabase.
2. Push it to Supabase Edge Functions secrets (from the repo root, with the
   Supabase CLI logged in and linked to the project):

   ```bash
   supabase secrets set FCM_SERVICE_ACCOUNT_JSON="$(cat path/to/unclouded-a1e83-firebase-adminsdk-*.json)"
   ```

   Or paste the same JSON as one value in the Dashboard: Project settings →
   Edge Functions → Secrets → Add secret → name `FCM_SERVICE_ACCOUNT_JSON`.
3. No local `.env` file is needed for this secret — `mobile/` ships no env
   file and the edge function reads it from Supabase's secret store at
   runtime, not from a checked-in `.env`.
