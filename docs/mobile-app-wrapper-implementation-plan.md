# Mobile App (web-app wrapper, iOS + Android) — Implementation Plan

| | |
|---|---|
| **Source** | [`docs/Uncloud360_Phase2_Requirements_v3.docx.md`](./Uncloud360_Phase2_Requirements_v3.docx.md) §10 — Mobile App; [`docs/Unclouded Platform_ Detailed User Stories.md`](./Unclouded%20Platform_%20Detailed%20User%20Stories.md) §7 (US-700…US-704) |
| **Status** | Wave 0 blocking — Ready for implementation waves after `MOB-00` |
| **Audience** | Coding agents |
| **Overrides** | None existing for mobile. `MOB-00` **must append a new `OVR-###`**: the shipped platform is a **React/Vite + Supabase** app, not Bubble — Section 10 / US-700 "Bubble wrapper" is superseded by a Capacitor wrapper around the deployed web app. |
| **Conflict** | US-704 ("direct users to web checkout") vs Apple Guideline 3.1.1/3.1.3 (no linking out to purchase from inside the app, outside the External Purchase Link entitlement). Must be locked in `MOB-00` before any billing-related native work. |
| **Prereq** | Web app deployed at a stable production origin (control-plane task **T-018**). The wrapper loads that origin; the plan assumes `VITE_APP_URL` / prod host is final. |

**How to use**

1. Complete **Wave 0** (`MOB-00`) before any code — the wrapper stack, monetization and store-ownership answers change several tasks.
2. Run tasks in parallel only when `Depends on` is satisfied and **Likely touch** paths do not overlap.
3. One task = one agent session: implement + verify **Acceptance**; do not expand into **Out of scope**.
4. Re-read [`docs/product-overrides.md`](./product-overrides.md) before touching signup, billing, entitlements or admin IA (OVR-001/002/003/009/051 in particular).
5. Migrations / edge deploy: **write only**; PM reviews SQL and function bodies before apply. No `apply_migration`, no `deploy_edge_function` in an agent session unless the user explicitly asks.
6. Native builds are **not** produced by agents beyond a local `npx cap sync` / compile check; store uploads are human ops (`MOB-13`).

**Suggested agent entry**

```text
Implement task MOB-01 from docs/mobile-app-wrapper-implementation-plan.md.
Source of truth: docs/Uncloud360_Phase2_Requirements_v3.docx.md §10 + docs/Unclouded Platform_ Detailed User Stories.md §7.
Read docs/product-overrides.md first.
Respect Depends on / Out of scope / Mode.
Verify Acceptance checklist before finishing.
Run gates from frontend/: lint, test, build, typecheck as applicable.
```

---

## Dependency graph (waves)

```text
Wave 0  MOB-00 (stack + monetization + store lock, doc-only)
   │
Wave 1  ┌────────────────────┬────────────────────┐
        ▼                    ▼                    ▼
     MOB-01              MOB-02               MOB-08
   mobile web shell   native platform lib   push schema (migration)
        │                    │                    │
Wave 2  │        ┌───────────┴──────────┐         │
        ▼        ▼                      ▼         │
     MOB-03 ──► MOB-04  MOB-05  MOB-06  MOB-07    │
   capacitor    ext.    session  billing  files    │
    shell      links   storage   gating  /share    │
        │                                          │
Wave 3  ├──────────────► MOB-09 ──► MOB-10 ──► MOB-11
        │              native token   FCM sender   engagement jobs
        └──────────────► MOB-12
                       deep links
   │
Wave 4  MOB-13 (store readiness / release ops) ──► MOB-14 (device E2E + test plan)
```

---

## Wave 0 — Product & platform lock (blocking, doc-only)

### MOB-00 — Lock wrapper stack, monetization and store ownership

| | |
|---|---|
| **Goal** | Every open mobile decision is written down (new `OVR-###` + decision table in this file) so later waves have no ambiguity. |
| **Mode** | `max` |
| **Depends on** | — |
| **Spec** | Requirements §10; US-700, US-701, US-703, US-704 |
| **Likely touch** | `docs/product-overrides.md`, this file only |

**Confirmed with the user on 2026-09-09 — all rows locked, no BLOCKED rows:**

| Topic | Spec default / options | Locked |
|---|---|---|
| Wrapper tech | Bubble wrapper (§10 Option 2) — obsolete, platform is React/Vite | **Locked: Capacitor 7** monorepo app in `mobile/`, reusing the deployed web app |
| Web content source | (a) `server.url` → prod origin (instant web deploys, no store release; higher App Store 4.2 scrutiny) · (b) bundled `frontend/dist` in the binary (offline shell, store release per UI change) | **Locked: (a) `server.url` → prod origin**, with a native offline screen; matches "обёртка веб-приложения" and keeps one deploy pipeline |
| Native value-add (anti-4.2 rejection) | none / push only / push + share + biometric lock | **Locked: Native push + native share/save + offline screen + deep links** (`MOB-04`, `MOB-07`, `MOB-12`) |
| Monetization in native app | (a) hide all purchase CTAs in native build; upsell copy → "Manage your plan on unclouded.app" without a link · (b) Apple IAP + Google Play Billing (30% fee, needs Stripe↔store reconciliation) · (c) External Purchase Link entitlement (US only, 27% fee, Apple approval) | **Locked: (a)** for v1 — cheapest, compliant, no billing rework; revisit if native conversion matters |
| Enterprise/enrollment flows in native | show as web / hide | **Locked: Show** — no purchase, no fee exposure |
| Push channels | keep web push only / add FCM (Android) + APNs-via-FCM (iOS) | **Locked: Add FCM HTTP v1 for both**, keep existing web push untouched (`MOB-08`…`MOB-10`) |
| Push notification set (§10) | daily check-in reminder · milestone alerts · new path session · 5-day inactivity | **Locked:** Milestone + path/module unlock exist; **daily check-in + 5-day inactivity are new** (`MOB-11`) |
| App identity | bundle id, app name, store name | **Locked: `com.provenunderpressure.unclouded`**, display name **Unclouded** |
| Store accounts (US-703) | Apple Developer $99/yr, Google Play $25 — in **Proven Under Pressure LLC** name | **Locked:** Human ops, tracked in `MOB-13` |
| Min OS | — | **Locked: iOS 15+, Android 8 (API 26)+** |
| Account deletion in app | Apple 5.1.1(v) requires in-app deletion for accounts | **Locked:** Existing Settings → Security deletion path (OVR-004, US-802) is reachable on mobile web through the WebView — no native-only follow-up needed |
| Analytics | PostHog already in web | **Locked:** Tag events with `app_platform: ios|android|web` (`MOB-02`) |

**Deliverables**

- [x] Decision table above filled with **Locked:** values.
- [x] New `OVR-066` appended to `docs/product-overrides.md` recording: Capacitor wrapper instead of Bubble wrapper (US-700), and the locked native monetization behavior vs US-704's "direct users to web checkout".
- [x] No unresolved rows.
- [x] Agents may proceed to Wave 1. **This session implements Wave 1 only** (`MOB-01`, `MOB-02`, `MOB-08`); Wave 2+ (native Capacitor project, billing UI, push send, deep links) are separate follow-up sessions.

**Out of scope**

- Any application code, `mobile/` scaffold, store account creation.

---

## Wave 1 — Mobile-web readiness + shared plumbing

### MOB-01 — Mobile web shell: viewport, safe areas, installability

| | |
|---|---|
| **Goal** | The deployed web app renders correctly inside a full-screen WebView on notched devices — done when key screens have no clipped content, no horizontal scroll, no iOS input auto-zoom. |
| **Mode** | `max` |
| **Depends on** | `MOB-00` |
| **Spec** | Requirements §10 "Mobile-tested screens"; US-702 |
| **Likely touch** | `frontend/index.html`, `frontend/src/index.css`, `frontend/tailwind.config.ts`, `frontend/public/manifest.webmanifest` (new), `frontend/public/icons/` (new), app shell/layout components (`frontend/src/components/layout/**`, sidebar/topbar) |

**Implement**

- `index.html`: `viewport` → `width=device-width, initial-scale=1, viewport-fit=cover`; add `theme-color`, `apple-mobile-web-app-*` tags; fix the leftover Lovable `TODO`/title/author metadata to Unclouded values.
- Add a `manifest.webmanifest` + maskable icons (512/192) generated from the existing brand assets; link it from `index.html`. (Web installability is a side benefit; the WebView needs the icons/theme anyway.)
- Tailwind: add `safe-area` spacing utilities backed by `env(safe-area-inset-*)`; apply to the app shell top bar, bottom-anchored chat composer, and any fixed/sticky element.
- Replace viewport-height traps: `100vh` → `100dvh` (or the existing `--app-height` pattern if one exists) in the shell, chat and wizard screens so the iOS keyboard does not push content out.
- Ensure ≥16px font-size on all text inputs (iOS zoom-on-focus), and ≥44px tap targets in nav/wizard controls.
- Prevent horizontal overflow: audit tables/wide grids on Dashboard, admin screens, results screens; wrap in `overflow-x-auto` containers rather than shrinking layout.

**Acceptance**

- [ ] At 390×844 and 360×740 emulation, these screens show no horizontal page scroll and no content under the notch/home indicator: onboarding wizard, chat/coaching session, check-in, path session, dashboard, paywall/`/subscription`, coach booking.
- [ ] Chat composer stays visible with the software keyboard open (verified in mobile emulation).
- [ ] `manifest.webmanifest` validates; icons resolve at both sizes.
- [ ] No text input smaller than 16px in the audited screens.
- [ ] `lint`, `test`, `build`, `typecheck` pass in `frontend/`.

**Out of scope**

- Service worker/offline caching for web (the native offline screen lives in `MOB-03`).
- Redesigning any screen; layout fixes only.
- Native project files.

---

### MOB-02 — Native platform detection library

| | |
|---|---|
| **Goal** | The web app can reliably answer "am I running inside the Unclouded native wrapper, on iOS or Android?" — done when a single typed helper + hook is exported and unit-tested. |
| **Mode** | `max` |
| **Depends on** | `MOB-00` |
| **Spec** | US-702, US-704 (native-conditional behavior) |
| **Likely touch** | `frontend/src/lib/platform/nativeApp.ts` (new), `frontend/src/lib/platform/nativeApp.test.ts` (new), `frontend/src/lib/platform/useNativePlatform.ts` (new), `frontend/src/lib/analytics/**` (PostHog super-property) |

**Implement**

- `nativeApp.ts`: detect via (1) the Capacitor bridge global (`window.Capacitor?.isNativePlatform?.()`, `getPlatform()`), and (2) a fallback UA marker the shell appends (`UncloudedApp/<version> (<ios|android>)` — the exact string is fixed here and consumed by `MOB-03`'s `appendUserAgent`).
- Export `isNativeApp()`, `getNativePlatform(): "ios" | "android" | null`, `getNativeAppVersion()`, and a `useNativePlatform()` hook returning a memoized snapshot. No dynamic import of `@capacitor/core` in the web bundle — read the injected globals so the web build stays dependency-free.
- Set a PostHog super-property / register call with `app_platform` = `ios|android|web` at the existing analytics init site.
- Document the contract in a short header comment: the shell owns the UA marker; the web app never assumes the native bridge exists.

**Acceptance**

- [ ] Unit tests cover: no bridge + plain UA → `web`; UA marker only → correct platform; bridge present → platform from bridge; SSR/`window`-less → `web`, no throw.
- [ ] `grep` shows no `@capacitor/*` import inside `frontend/src` (bundle stays clean).
- [ ] Analytics events carry `app_platform` (verified in a unit test or a local PostHog debug check).
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Using the flag to change UI (that is `MOB-04`, `MOB-06`, `MOB-07`).
- Adding Capacitor packages to `frontend/package.json`.

---

### MOB-08 — Push schema: native device tokens (migration, write-only)

| | |
|---|---|
| **Goal** | `pushDeviceSubscription` can store FCM/APNs device tokens alongside existing web-push rows without breaking web push — done when the migration SQL is written and reviewed. |
| **Mode** | `ultracode` |
| **Depends on** | `MOB-00` |
| **Spec** | Requirements §10 push requirements; US-701 |
| **Likely touch** | `supabase/migrations/<ts>_push_native_device_tokens.sql` (new), `frontend/src/integrations/supabase/types.ts` (regen after apply) |

**Implement**

- Additive migration on `public."pushDeviceSubscription"` (current shape: `endpoint`, `p256dh`, `auth`, `platform DEFAULT 'web'`, unique index on `endpoint`):
  - Replace the `push_device_subscription_platform_check` constraint with `CHECK (platform IN ('web','ios','android'))`.
  - Add nullable `"deviceToken" TEXT`, `"appVersion" TEXT`, `"lastSeenAt" TIMESTAMPTZ`.
  - Make `p256dh`/`auth`/`endpoint` compatible with native rows: keep them NOT NULL and store the FCM token in `endpoint` **or** relax to nullable and use `"deviceToken"` — pick one and enforce it with a row-level `CHECK` (`platform = 'web'` ⇒ web keys present; native ⇒ `"deviceToken"` present). State the choice in a migration header comment.
  - Partial unique index on `("deviceToken")` where `"deviceToken" IS NOT NULL`.
- Do not touch existing RLS policies (owner-only select/insert/update/delete via `public.userOwnsRow`) except to confirm they still cover the new columns; no new member-visible columns are sensitive.
- Note in the header: web-push rows must keep working unchanged (`_shared/webPushDelivery.ts` reads `endpoint/p256dh/auth`).

**Acceptance**

- [ ] Migration is additive-only; no `DROP COLUMN`, no policy loosening.
- [ ] SQL is idempotent (`IF NOT EXISTS` / `DROP CONSTRAINT IF EXISTS` before re-add).
- [ ] A stated CHECK guarantees a native row cannot exist without a token, and a web row cannot exist without VAPID keys.
- [ ] Existing web-push insert payload from `register-push-subscription` still satisfies every constraint (walk the payload in the task notes).
- [ ] Migration **not applied** — PM review pending.

**Out of scope**

- Sending native push (`MOB-10`), registering tokens (`MOB-09`).
- Any change to `notificationLog`-style tables unless a new column is genuinely required.

---

## Wave 2 — Native shell and native-conditional web behavior

### MOB-03 — Capacitor shell: `mobile/` project, iOS + Android

| | |
|---|---|
| **Goal** | `npx cap sync` produces buildable iOS and Android projects that open the production web app full-screen with correct splash, icons, back-button and offline handling. |
| **Mode** | `ultracode` (WebView navigation allowlist is a security boundary) |
| **Depends on** | `MOB-00`, `MOB-01`, `MOB-02` |
| **Spec** | Requirements §10 Option 2; US-700, US-702 |
| **Likely touch** | `mobile/package.json`, `mobile/capacitor.config.ts`, `mobile/ios/**`, `mobile/android/**`, `mobile/README.md`, `mobile/resources/` (icon + splash source), `mobile/www/offline.html` (new), root `.gitignore` |

**Implement**

- Scaffold a standalone Capacitor app in `mobile/` (own `package.json`; do **not** add Capacitor deps to `frontend/`). Plugins: `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/browser`, `@capacitor/network`, `@capacitor/preferences`, `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/push-notifications` (used in later tasks).
- `capacitor.config.ts` per the `MOB-00` lock: `appId`/`appName`, `server.url` = production origin, `server.androidScheme: "https"`, `appendUserAgent` = the exact marker string fixed in `MOB-02`, `webDir` = a minimal local `www/` holding only `offline.html`.
- **Navigation allowlist:** `server.allowNavigation` limited to the app origin plus the Supabase project host; everything else (Stripe, Google Meet/Calendar, LinkedIn, Wix marketing pages) must leave the WebView — implement the native-side interception so unknown hosts open in the system browser, and pair with the in-app changes in `MOB-04`.
- Splash + adaptive/rounded icons generated from brand assets; status bar style matched to the app theme; iOS `WKWebView` inline media and `contentInsetAdjustmentBehavior` configured for `viewport-fit=cover`.
- Android hardware back: subscribe to `App.backButton` → if the WebView has history, `window.history.back()`; on the app root, minimize instead of killing the session.
- Offline handling: on `Network` offline / initial load failure, show the bundled `offline.html` (branded, with a Retry that reloads `server.url`); auto-retry when connectivity returns.
- Deep-link plumbing is only registered here if trivial; the routing contract lives in `MOB-12`.
- `mobile/README.md`: prerequisites, `npm i && npx cap sync`, how to run on simulator/device, where the app origin is configured, and the rule that web changes ship via web deploy (no store release needed).

**Acceptance**

- [ ] `npx cap sync` completes clean; `mobile/ios/App/App.xcworkspace` and `mobile/android/` exist and compile locally (or the task notes state exactly which SDK/toolchain was unavailable in the environment).
- [ ] Config review shows `allowNavigation` does **not** contain a wildcard (`*`) and does not include payment hosts.
- [ ] Airplane-mode cold start shows the branded offline screen, and Retry recovers after reconnecting.
- [ ] Android back button navigates in-app history and does not close the app from a nested route.
- [ ] UA marker observable from the WebView matches what `MOB-02` parses (verified against `navigator.userAgent`).
- [ ] No secrets in `mobile/` (no `service_role`, no VAPID private key, no Stripe key).

**Out of scope**

- Push registration/send, deep links, store submission, CI signing.
- Editing `frontend/` beyond nothing — this task is native-side only.

---

### MOB-04 — Route external flows to the system browser when native

| | |
|---|---|
| **Goal** | Stripe portal, Google Meet/Calendar and social share links open outside the WebView with a working return path — done when no external flow can trap or dead-end the user inside the app. |
| **Mode** | `max` |
| **Depends on** | `MOB-02`, `MOB-03` |
| **Spec** | Requirements §10; US-702; US-704 (billing must not run inside the WebView) |
| **Likely touch** | `frontend/src/lib/platform/openExternalUrl.ts` (new), `frontend/src/lib/coach/coachBookingApi.ts` (`openExternalBookingUrl`), `frontend/src/lib/subscription/subscriptionApi.ts` (portal/checkout URL handling and its callers), `frontend/src/components/share/ClassificationShareCard.tsx` |

**Implement**

- `openExternalUrl(url)`: on native, call the Capacitor Browser plugin through the injected bridge (`window.Capacitor.Plugins.Browser.open`) with a graceful fallback to `window.open`; on web, keep exactly today's behavior.
- Refactor `openExternalBookingUrl` in `coachBookingApi.ts` to delegate to it **without** changing its boolean contract — the booking hold aborts when the open fails (keep the existing "do not pass noopener as window features" comment and reasoning).
- Route the Stripe **portal** redirect (`stripe-portal` result URL) and any Meet/Calendar links through the same helper; LinkedIn share in `ClassificationShareCard` likewise.
- Native return path: after an external session, the app must re-validate subscription state on resume — hook the existing revalidation used at tab refocus (see commit `abb4fd3` deferred auth revalidation) so returning from the browser refreshes entitlements without a full reload.

**Acceptance**

- [ ] Unit tests: native path calls the bridge; web path still calls `window.open`; blocked/throwing open returns `false` so the booking hold aborts (existing `coachBookingApi` test stays green).
- [ ] `grep -rn "window.open" frontend/src` shows no remaining direct call for external destinations outside the helper.
- [ ] On device/simulator, tapping the calendar link leaves the WebView and returning to the app does not reload the whole SPA or log the user out.
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Hiding purchase CTAs (`MOB-06`).
- File downloads/share sheets (`MOB-07`).

---

### MOB-05 — Durable auth session storage inside the WebView

| | |
|---|---|
| **Goal** | A native user stays signed in across app restarts and iOS storage pressure — done when the Supabase client persists its session through native `Preferences` when running in the wrapper. |
| **Mode** | `ultracode` (auth) |
| **Depends on** | `MOB-02`, `MOB-03` |
| **Spec** | US-702 ("no functionality is lost on mobile") |
| **Likely touch** | `frontend/src/integrations/supabase/client.ts`, `frontend/src/lib/platform/nativeSessionStorage.ts` (new + test), `frontend/src/lib/auth/sessionAuth.ts` (only if it reads storage directly) |

**Implement**

- Implement a Supabase `auth.storage` adapter: on native, read/write through the Capacitor Preferences bridge; mirror to `localStorage` for synchronous reads and treat Preferences as the source of truth on cold start. On web, keep the default storage untouched.
- Handle the async gap explicitly: the adapter's `getItem` may be async (Supabase supports it) — do not block first paint; document the ordering.
- One-time migration: on first native launch with an existing `localStorage` session, copy it into Preferences.
- Sign-out must clear **both** stores (and the recovery-session `sessionStorage` state already used by `recoverySession.ts`).

**Acceptance**

- [ ] Unit tests: adapter falls back to `localStorage` when the bridge is absent; native path round-trips a token; sign-out clears both stores.
- [ ] On a device/simulator, force-quit and relaunch keeps the user signed in; sign-out then relaunch lands on the auth screen.
- [ ] No token is written anywhere new on the **web** build (verify by test that the web path is byte-identical to current behavior).
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Biometric app lock, PIN, session timeout policy.
- Changing token lifetimes or Supabase auth settings.

---

### MOB-06 — Native billing compliance: purchase CTAs per `MOB-00` lock

| | |
|---|---|
| **Goal** | The native build contains no purchase or purchase-link flow (per the locked option), while entitlement state, gating copy and enterprise flows stay correct. |
| **Mode** | `max` |
| **Depends on** | `MOB-00` (locked monetization option), `MOB-02` |
| **Spec** | US-704; Apple 3.1.1 / 3.1.3; OVR-003 / OVR-051 (settings IA), OVR-009 (no module-side tier gate) |
| **Likely touch** | `frontend/src/lib/subscription/lockedFeatureUpsell.ts`, `frontend/src/lib/subscription/subscriptionCopy.ts`, `frontend/src/lib/subscription/subscriptionActions.ts` (native-aware action filter), `frontend/src/pages/Subscription*.tsx`, paywall/upsell components, sidebar entry for `/subscription` |

**Implement**

- Add a native-aware filter over `resolveAllowedActions`: in the native build, drop `startCheckout` / `upgradeToPremium` / `scheduleDowngrade`-as-purchase actions per the locked decision, keeping read-only plan state, `cancel`/`resume` only if the lock allows, and enterprise's existing "no self-serve billing" behavior (already returns `[]`).
- Replace upsell CTA copy in the native build with the locked non-linking wording (e.g. "Plan changes are available in your Unclouded account on the web") — **no** tappable external purchase URL if option (a) is locked.
- Keep the `/subscription` screen reachable (plan status, renewal date, entitlements) so users are not left guessing; the removed part is purchase intent only.
- Do not weaken any server-side entitlement checks — this is presentation only; edges keep re-validating.

**Acceptance**

- [ ] Unit tests: with `isNativeApp() === true`, `resolveAllowedActions` returns no purchase action for free/pro/premium fixtures; with `false`, output is unchanged from today's snapshot tests.
- [ ] No component renders a link/button to Stripe checkout when native (verified by test on the paywall + locked-feature upsell components).
- [ ] Entitlement gating for locked features still works in the native build (locked feature shows its gate, not a purchase CTA).
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Implementing Apple IAP / Google Play Billing or the External Purchase Link entitlement (separate ticket if `MOB-00` locks option (b)/(c)).
- Changing Stripe edge functions or webhook logic.

---

### MOB-07 — Native file save/share for PDF and share card

| | |
|---|---|
| **Goal** | PDF report and classification share-card actions work in the WebView — done when a native user can save/share the generated file instead of hitting a silently failing anchor download. |
| **Mode** | `max` |
| **Depends on** | `MOB-02`, `MOB-03` |
| **Spec** | US-702; Phase 2 §3 (PDF report) |
| **Likely touch** | `frontend/src/lib/share/classificationShareCardImage.ts` (`downloadShareCardBlob`), `frontend/src/lib/platform/saveOrShareBlob.ts` (new + test), the PUP PDF download call site (`frontend/src/lib/reassessment/pdf/**` + its component), `frontend/src/components/share/ClassificationShareCard.tsx` |

**Implement**

- `saveOrShareBlob(blob, filename)`: on web keep the current object-URL + `<a download>` path; on native write the blob (base64) via the Filesystem bridge into a cache/documents directory, then open the native Share sheet on that URI.
- Route both consumers through it: the jsPDF-produced report blob and `downloadShareCardBlob`.
- Surface honest failures: if the native write/share is unavailable, show the existing error toast — never a silent no-op.

**Acceptance**

- [ ] Unit tests: web path creates and revokes the object URL as today; native path calls Filesystem write then Share with the written URI; failure surfaces an error rather than resolving silently.
- [ ] On device, "Download PDF" produces a shareable/saveable file with the correct filename and non-zero size.
- [ ] Share-card image action works on native and web.
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Changing PDF content, `generate-pup-pdf` edge, or jsPDF layout.
- Native photo-library permissions beyond what Share requires.

---

## Wave 3 — Push notifications and deep links

### MOB-09 — Register native push tokens

| | |
|---|---|
| **Goal** | A native user who grants notification permission has an `ios`/`android` row in `pushDeviceSubscription` with a live FCM token, refreshed on rotation. |
| **Mode** | `ultracode` (write path + auth-scoped data) |
| **Depends on** | `MOB-08` (migration reviewed), `MOB-03` |
| **Spec** | Requirements §10 push requirements; US-701 |
| **Likely touch** | `supabase/functions/register-push-subscription/index.ts`, `frontend/src/lib/notifications/nativePushRegistration.ts` (new + test), `frontend/src/lib/notifications/webPushRegistration.ts` (branch on native — keep web path intact), the existing push-permission banner component |

**Implement**

- Extend the edge function's body contract: accept `platform: "ios" | "android"` with `deviceToken` (and optional `appVersion`), keeping the current web payload (`endpoint` + `keys.p256dh/auth`) working unchanged. Validate strictly — reject a native payload without a token, reject an unknown platform (current code already rejects `platform !== "web"`).
- Upsert on the native unique key from `MOB-08`; refresh `"lastSeenAt"`/`"appVersion"` on repeat calls; keep the row owner = the authenticated JWT user (never a client-supplied user id).
- Native client module: request permission via the PushNotifications bridge from a user gesture, read the FCM registration token, POST it through the same `register-push-subscription` invoke, and re-register on token refresh and on sign-in.
- In `webPushRegistration.ts`, short-circuit the native case so the wrapper never tries VAPID/service-worker subscription (which is not what iOS WKWebView provides).
- Foreground behavior: tapping a delivered notification passes its `url` to the deep-link handler contract defined in `MOB-12` (stub the call if `MOB-12` is not merged yet, but do not duplicate routing logic).

**Acceptance**

- [ ] Edge tests/manual `curl` notes: web payload → 200 and unchanged row shape; native payload → 200 with token stored; native payload missing token → 4xx; unknown platform → 4xx; no JWT → 401.
- [ ] A second registration with the same token updates rather than duplicating rows.
- [ ] Unit tests: on native, web-push subscription is never attempted; on web, behavior is unchanged (existing `webPushRegistration.test.ts` stays green).
- [ ] Edge function **not deployed** — user/PM decides.
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Sending notifications (`MOB-10`).
- Notification preferences UI/per-type opt-out (file as follow-up if not already specced).

---

### MOB-10 — FCM sender and dispatch fan-out

| | |
|---|---|
| **Goal** | Every notification the platform already sends by web push also reaches native devices — done when one shared sender handles `ios`/`android` rows and all existing dispatch sites use it. |
| **Mode** | `ultracode` (secrets + delivery to all users) |
| **Depends on** | `MOB-09` |
| **Spec** | Requirements §10 (push types); US-701 |
| **Likely touch** | `supabase/functions/_shared/nativePushDelivery.ts` (new), `supabase/functions/_shared/pushFanout.ts` (new — platform-aware dispatch), `supabase/functions/_shared/vulnerableOutreachDelivery.ts`, `supabase/functions/notification-milestone/index.ts`, `supabase/functions/module-unlock/index.ts`, `supabase/functions/_shared/webPushDelivery.ts` (unchanged behavior, reused) |

**Implement**

- `nativePushDelivery.ts`: FCM HTTP v1 send using a service-account credential read from an edge secret (`FCM_SERVICE_ACCOUNT_JSON`); OAuth token minted per invocation and cached in-module like `webPushDelivery`'s VAPID config; APNs delivery for iOS goes through FCM (no separate APNs key path).
- Payload parity with web push: `title`, `body`, `data.url`; iOS gets `notification` + `apns` config (sound/badge sensible defaults), Android gets a channel id matching the one the shell registers.
- Token hygiene: on `UNREGISTERED`/`INVALID_ARGUMENT`, delete the row (same pattern as the existing `expired` handling for web-push endpoints).
- `pushFanout.ts`: load a user's subscriptions once, split by `platform`, send web via `sendWebPushToSubscription` and native via the new sender, and return a per-channel result the callers can log. Keep the existing `channel: "web-push" | "email" | "none"` reporting shape working — extend it additively (e.g. `"native-push"`) rather than renaming existing values.
- Wire the fan-out into every current dispatch site (vulnerable outreach, milestone, module/path unlock) without changing their eligibility or content logic.
- `isNativePushConfigured()` guard so environments without the secret degrade to today's web-push-only behavior instead of throwing.

**Acceptance**

- [ ] Unit tests: fan-out with mixed rows calls both senders; native-only user gets no web-push call; missing FCM secret → skipped with a logged reason, no exception; invalid-token response deletes the row.
- [ ] Existing web-push delivery tests unchanged and green.
- [ ] No secret is read in the frontend; `FCM_SERVICE_ACCOUNT_JSON` documented as an edge secret in the task notes/README, value never committed.
- [ ] Manual send notes: one real device receives a notification with a working `data.url` (or the task states the device step is deferred to `MOB-14`).
- [ ] Edges **not deployed** — PM/user gate.

**Out of scope**

- New notification types (`MOB-11`).
- Rich media, action buttons, badge-count bookkeeping.

---

### MOB-11 — Missing engagement notifications: daily check-in + 5-day inactivity

| | |
|---|---|
| **Goal** | The two §10 notification types that do not exist yet are implemented and scheduled — done when both jobs select the right users, respect quiet hours/timezone, and send once per period. |
| **Mode** | `ultracode` (cron + fan-out to all users) |
| **Depends on** | `MOB-10` |
| **Spec** | Requirements §10 "Push notifications: daily check-in reminder, milestone alerts, new path session, 5-day inactivity follow-up"; US-701 |
| **Likely touch** | `supabase/functions/daily-checkin-reminder/index.ts` (new), `supabase/functions/inactivity-followup/index.ts` (new), `supabase/migrations/<ts>_engagement_push_jobs.sql` (new — cron schedules + dedupe table/columns), `supabase/functions/_shared/pushFanout.ts` (reuse) |

**Implement**

- Reuse the established cron pattern from `20260720120000_scheduled_edge_cron_jobs.sql` / `20260825130000_coach_booking_reminders.sql` (pg_cron → edge invoke with the cron secret); do not invent a new scheduling mechanism.
- Daily check-in reminder: eligible = user has not completed today's check-in; send in the **user's** timezone (`profiles.timeZone`, empty → UTC — same convention as OVR-063), one per calendar day per user, respecting a sane local hour window.
- 5-day inactivity follow-up: eligible = no qualifying activity for 5 days (define "activity" explicitly in a header comment — chat session, check-in, module, or path progress) and not already sent for this inactivity streak.
- Idempotency: a dedupe key per (user, job, period) in a small table or an additive column, so a cron retry cannot double-send.
- Delivery through `pushFanout` (web + native), with the same "skip silently when unconfigured" behavior; email fallback only if an existing pattern already does that for a comparable notification — otherwise push-only.
- Deep-link `url` values that `MOB-12` can route (check-in screen, dashboard).

**Acceptance**

- [ ] Unit tests for eligibility: user who checked in today is skipped; user idle exactly 5 days is selected; already-notified user in the same period is skipped; timezone-empty user treated as UTC.
- [ ] Dedupe proven by a test that runs the selection twice and sends once.
- [ ] Cron SQL follows the existing pattern and is idempotent; migration **not applied**, edges **not deployed**.
- [ ] Gates pass where applicable.

**Out of scope**

- Redesigning existing milestone / module-unlock notifications.
- User-facing notification preference settings (follow-up ticket).
- Marketing pushes.

---

### MOB-12 — Deep links: universal links, app links, notification routing

| | |
|---|---|
| **Goal** | Password-reset/confirm emails and notification taps open the app on the right screen — done when a cold and warm launch from a link both land on the target route. |
| **Mode** | `ultracode` (auth-bearing links) |
| **Depends on** | `MOB-03`, `MOB-02` |
| **Spec** | US-701, US-702; existing redirect contract in `frontend/src/lib/appUrl.ts`, `passwordResetApi.ts` (`/reset_pw`) |
| **Likely touch** | `frontend/public/.well-known/apple-app-site-association` (new), `frontend/public/.well-known/assetlinks.json` (new), `mobile/ios/**` (associated domains entitlement), `mobile/android/**` (intent filters), `frontend/src/lib/platform/deepLinkRouting.ts` (new + test), router entry (`frontend/src/lib/router/**`), notification tap handler from `MOB-09` |

**Implement**

- Serve the two association files from the production web origin (Vercel: confirm they are served at `/.well-known/...` with the right content type and no redirect); fill in team id / bundle id / SHA-256 signing fingerprints from `MOB-00` + `MOB-13`.
- Register associated domains (iOS) and `android:autoVerify` intent filters for the app origin.
- `deepLinkRouting.ts`: map an incoming URL (from `App.appUrlOpen` or a notification `data.url`) to an in-app route, allowlisting only same-origin paths; unknown or cross-origin → open externally (via `MOB-04`'s helper), never navigated inside the WebView.
- Preserve the auth recovery contract: a `/reset_pw` link with recovery tokens must reach the existing recovery-session handling (`recoverySession.ts`) intact — token fragments/query preserved, no double-consumption.
- Cold start: queue the deep link until the router is mounted, then navigate once.

**Acceptance**

- [ ] Unit tests: same-origin path → internal navigation; foreign origin → external open; `/reset_pw` link keeps its token payload; malformed URL → no navigation, no throw.
- [ ] `apple-app-site-association` and `assetlinks.json` are valid JSON and reachable on the deployed origin (verify after web deploy; note it if pending).
- [ ] On device, tapping a password-reset email link opens the app at the reset screen and the reset completes.
- [ ] Notification tap opens the URL from the payload (uses the `MOB-10` `data.url`).
- [ ] Gates pass in `frontend/`.

**Out of scope**

- Changing Supabase Auth redirect configuration in the Dashboard (ops — coordinate with control-plane task T-014).
- Marketing/attribution deep links, deferred deep linking.

---

## Wave 4 — Release readiness and verification

### MOB-13 — Store readiness and release pipeline

| | |
|---|---|
| **Goal** | Both apps can be submitted: accounts owned by the LLC, identifiers registered, store metadata and privacy answers drafted, build steps documented. |
| **Mode** | `max` |
| **Depends on** | `MOB-03`, `MOB-06`, `MOB-09` (permission strings), `MOB-12` (fingerprints) |
| **Spec** | US-703, US-700; Requirements §10 "Developer accounts"; §14 Launch Readiness ("App Store submission complete OR mobile-optimized web confirmed tested") |
| **Likely touch** | `mobile/README.md`, `docs/mobile-app-release-ops.md` (new), `mobile/store/` (listing copy, screenshot notes), optionally `.github/workflows/mobile-build.yml` |

**Implement**

- Ops checklist (human actions flagged as such, with owner): Apple Developer ($99/yr) and Google Play ($25) accounts in **Proven Under Pressure LLC**; bundle id registration; signing keys/keystore custody; TestFlight and Play internal testing tracks.
- Store metadata pack: name, subtitle, description, keywords, category, support/marketing URLs, privacy policy URL (must match the in-app links per US-800), age rating, screenshots list per required device size (screens from `MOB-01`'s tested set).
- Compliance answers drafted and reviewed against the app's actual behavior: Apple privacy nutrition labels + Google Data Safety (auth data, health-adjacent self-reported content, analytics via PostHog, push tokens), account-deletion URL/in-app path, export compliance.
- iOS permission usage strings (notifications; camera/photos only if the avatar picker is reachable for the signed-in user role).
- Review-risk notes for the submission: what the reviewer must see to pass Guideline 4.2 (native push, share/save, offline screen, deep links) and 3.1.1 (no purchase path in-app), plus a demo account with seeded data.
- Optional CI: a build workflow that runs `npx cap sync` and compiles both platforms on tag — no signing secrets committed.

**Acceptance**

- [ ] `docs/mobile-app-release-ops.md` lists every human ops step with owner and status, and every value an agent cannot know is marked **TODO(owner)** rather than invented.
- [ ] Privacy/Data-Safety answers each cite the code path that justifies them.
- [ ] `mobile/README.md` build steps are reproducible from a clean checkout.
- [ ] No credential, keystore or `.p8` file is committed (verify with a repo scan note).

**Out of scope**

- Actually creating accounts, uploading builds or submitting for review (user action).
- Paid Ionic/Appflow live-update services.

---

### MOB-14 — Device E2E verification + test plan

| | |
|---|---|
| **Goal** | Prove the §10 mobile-tested screens and all four push types work on real iOS and Android devices; gates green. |
| **Mode** | `max` |
| **Depends on** | all `MOB-01`…`MOB-13` |
| **Spec** | US-702, US-701; Requirements §13 Testing Plan, §14 Launch Readiness |
| **Likely touch** | `docs/mobile-app-test-plan.md` (new — or the output of `/test-plan`), test notes only |

**Verify**

- [ ] Screens per §10 on iOS and Android, portrait and landscape: onboarding, coaching/chat session, check-in, path session, dashboard, paywall/`/subscription`, coach booking, settings/Know Yourself, results screens (OVR-065).
- [ ] Auth: signup, login, password reset via email link (deep link), sign-out, relaunch persistence (`MOB-05`).
- [ ] Push: daily check-in reminder, milestone, new path/module unlock, 5-day inactivity — received on both platforms, tap routes correctly.
- [ ] Billing: no purchase path is reachable in the native build; plan status still renders; entitlement gates still gate (`MOB-06`).
- [ ] External flows: calendar/Meet and Stripe portal open outside the WebView and return cleanly (`MOB-04`).
- [ ] Files: PDF and share-card save/share succeed (`MOB-07`).
- [ ] Offline screen, Android back button, safe areas, keyboard behavior.
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck` pass in `frontend/`.

**Deliverables**

- [ ] `docs/mobile-app-test-plan.md` (via `/test-plan mobile app wrapper`) with pass/fail per row and device/OS versions.
- [ ] Gaps filed as follow-up tickets — no silent scope creep, no "works on my machine" claims without a device note.

**Out of scope**

- Automated device farm / Appium suites.
- Performance profiling beyond obvious jank notes.

---

## Parallelism cheat sheet

| Wave | Can run in parallel | Shared caution |
|---|---|---|
| 0 | — | `MOB-00` blocks everything |
| 1 | `MOB-01` ‖ `MOB-02` ‖ `MOB-08` | Different trees (web CSS/HTML · new lib · SQL) |
| 2 | `MOB-03` first, then `MOB-04` ‖ `MOB-05` ‖ `MOB-07`; `MOB-06` after | `MOB-04` and `MOB-06` both touch subscription code — run sequentially or split by file (`subscriptionApi` vs `subscriptionActions`/components) |
| 3 | `MOB-09` → `MOB-10` → `MOB-11` sequential; `MOB-12` parallel to the push chain | `MOB-09` and `MOB-12` both touch the notification tap handler — `MOB-09` stubs, `MOB-12` owns routing |
| 4 | `MOB-13` then `MOB-14` | `MOB-14` alone, needs devices |

---

## Explicit non-goals (all agents)

Do **not** build unless separately scoped:

- React Native / Flutter / any parallel UI codebase (§10 Option 3 is explicitly future).
- Apple IAP or Google Play Billing, receipt validation, Stripe↔store reconciliation (only if `MOB-00` locks option (b)).
- Offline data sync, local caching of user content, background sync.
- Biometric/PIN app lock, jailbreak detection, certificate pinning.
- Native rewrites of any screen; widgets, watch app, Siri/App Actions.
- Notification preference UI, quiet-hours settings screen.
- Changes to Bubble/Wix surfaces or the marketing site.
- Applying migrations or deploying edge functions.

---

## Traceability (spec → tasks)

| Spec | Tasks |
|---|---|
| §10 wrapper option / US-700 | `MOB-00`, `MOB-03`, `MOB-13` |
| §10 push notifications / US-701 | `MOB-08`, `MOB-09`, `MOB-10`, `MOB-11`, `MOB-12` |
| §10 mobile-tested screens / US-702 | `MOB-01`, `MOB-04`, `MOB-05`, `MOB-07`, `MOB-14` |
| §10 developer accounts / US-703 | `MOB-00`, `MOB-13` |
| §10 IAP strategy / US-704 | `MOB-00`, `MOB-06` |
| §13 Testing Plan / §14 Launch Readiness | `MOB-13`, `MOB-14` |
| OVR precedence (new mobile OVR) | `MOB-00` |

---

## Agent prompt template (copy per task)

```text
Implement task MOB-{NN} from docs/mobile-app-wrapper-implementation-plan.md.
Source of truth: docs/Uncloud360_Phase2_Requirements_v3.docx.md §10 and
docs/Unclouded Platform_ Detailed User Stories.md §7 (US-700…US-704).
Read docs/product-overrides.md first, plus the MOB-00 locked decisions in the plan.
Respect Depends on / Out of scope / Mode ({max|ultracode}).
Architecture: UI → frontend/src/lib → Supabase; no service_role or private keys in frontend
or in mobile/; native shell code lives in mobile/ only.
Verify the task Acceptance checklist before finishing.
Do not apply migrations, deploy edge functions, or upload store builds unless the user explicitly asks.
```
