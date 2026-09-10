# Mobile app release ops (MOB-13)

Status tracker for getting the Unclouded iOS + Android apps submittable.
Every row an agent cannot know or do is marked **TODO(owner)**. Nothing in
this document was invented — where a value doesn't exist yet in the repo or
in a live account, that's stated explicitly rather than guessed.

Source of truth for the wrapper itself: `docs/mobile-app-wrapper-implementation-plan.md`
(`MOB-00` lock) and `mobile/README.md`. This doc does not re-explain the
architecture — it tracks what's left to actually ship to the stores.

## 1. Accounts, identifiers, signing (human ops)

| Step | Owner | Status |
|---|---|---|
| Apple Developer Program enrollment ($99/yr), org **Proven Under Pressure LLC** | TODO(owner) | Not started |
| Google Play Console account ($25 one-time), org **Proven Under Pressure LLC** | TODO(owner) | Not started |
| Register bundle id `com.provenunderpressure.unclouded` in App Store Connect | TODO(owner) | Blocked on Apple Developer enrollment |
| Register the same application id in Play Console | TODO(owner) | Blocked on Play Console account |
| Generate/store the iOS distribution certificate + provisioning profile (or enable Xcode "Automatic" signing, already set in `project.pbxproj`) | TODO(owner) | Not started |
| Generate the Android release signing keystore; record its SHA-256 fingerprint | TODO(owner) | Not started — **blocks `assetlinks.json`** (see `mobile/README.md` MOB-12 section) |
| Record the Apple **Team ID**; paste into `frontend/public/.well-known/apple-app-site-association`'s `appID` (currently `TODOTEAMID.com.provenunderpressure.unclouded`) | TODO(owner) | Not started |
| Decide keystore custody (who holds the release keystore + password; a lost keystore means the app can never be updated under the same listing) | TODO(owner) | Not started |
| Create a TestFlight internal testing group and add testers | TODO(owner) | Blocked on Apple Developer enrollment |
| Create a Play Console internal testing track and add testers | TODO(owner) | Blocked on Play Console account |
| Enable Google Play App Signing (recommended: Google holds the upload key custody chain) when creating the app in Play Console | TODO(owner) | Not started |

**Agent-completed, not ops:** app id (`com.provenunderpressure.unclouded`),
display name (`Unclouded`), min OS (iOS 15+, Android 8 / API 26+) — all
locked in `MOB-00` and already set in `mobile/capacitor.config.ts` and the
native project files.

## 2. Store metadata pack

| Field | Value | Source / note |
|---|---|---|
| App name | Unclouded | `MOB-00` lock |
| Subtitle (iOS) / short description (Android, ≤80 chars) | "AI coaching for burnout, resilience, and growth" | Drafted from the landing page hero copy (`frontend/src/pages/Index.tsx`); **owner should approve wording**, not an approved marketing string |
| Description | See `mobile/store/listing-copy.md` | New — long-form draft |
| Keywords (iOS, ≤100 chars) | See `mobile/store/listing-copy.md` | Draft |
| Category | Health & Fitness (primary), Lifestyle (secondary, Apple only) | Matches the app's actual subject matter (coaching, check-ins, journaling) |
| Support URL | TODO(owner) | No support/contact page exists in this repo or was found documented anywhere in `docs/` |
| Marketing URL | TODO(owner) | Same — the original spec (`US-800`) describes a separate Wix marketing site; its live URL isn't recorded in this repo |
| Privacy Policy URL | **TODO(owner) — blocking** | See §4 below: no Privacy Policy or Terms page exists anywhere in the shipped app or in `docs/`. Both stores refuse submission without this URL, and it must also be reachable from inside the app (currently isn't — see the gap noted in §4). |
| Age rating | Draft: 17+ (iOS) / Teen or Mature 17+ (Android), pending the questionnaire | The app discusses grief, recovery, and crisis-adjacent topics (`OVR-012` crisis hard-stop copy) — treat as a content-sensitive rating until the owner completes the actual store questionnaire, which asks about references to self-harm/substance topics |
| Screenshots | Need real device/simulator captures at: iPhone 6.7" (1290×2796), iPhone 6.5" (1284×2792 or 1242×2688), iPad 12.9" (2048×2732, only if iPad support is claimed) for iOS; phone screenshots (min 320px, max 3840px, 16:9 or 9:16) for Android | Screens to capture: the same set `MOB-01` verified at 390×844/360×740 — onboarding wizard, chat/coaching session, check-in, path session, dashboard, paywall/`/subscription`, coach booking. **Not captured yet** — needs a running build on a device/simulator, which this environment can't produce (see `mobile/README.md` "Environment notes") |
| Feature graphic (Android, 1024×500) | TODO(owner) — needs a designer/marketing asset | Not a code deliverable |
| App icon (1024×1024, no alpha) | Generated in `mobile/resources/icon.png` (`MOB-03`) from the existing brand favicon | Placeholder-quality — recommend the owner swap in a designed icon before submission, `MOB-03`'s icon is a straight upscale of the 256×256 web favicon |

## 3. Compliance answers — cite the code that justifies them

These are drafts for the owner to paste into App Store Connect's Privacy
Nutrition Label questionnaire and Play Console's Data Safety form. Each
answer names the code path it's based on so it can be re-verified against
the shipped app rather than trusted blind.

| Data category | Collected? | Linked to identity? | Used for tracking? | Code path |
|---|---|---|---|---|
| Contact info (email) | Yes | Yes | No | Supabase Auth (`frontend/src/integrations/supabase/client.ts`); `profiles.email` |
| Health & fitness (self-reported wellbeing, onboarding assessment scores, journal entries, chat transcripts) | Yes | Yes | No | `frontend/src/lib/classification.ts`, `frontend/src/lib/dashboard/checkinApi.ts` (`dailyCheckin`), `frontend/src/lib/journal/*`, `supabase/functions/chat/` |
| User content shared with a third-party AI processor | Yes — chat transcripts and onboarding context are sent to OpenAI to generate coaching responses | Pseudonymous per request, not shared for OpenAI's own training per OpenAI's API data-use terms | No | `supabase/functions/chat/index.ts` (imports `openai-provider.ts`), `supabase/functions/_shared/openai-provider.ts` |
| Usage data / product analytics | Yes — PostHog (event names, `app_platform`, tier, signup plan, classification, UTM/referral attribution). No email/name sent as a trait. | Yes (PostHog identify uses the Supabase user id, a UUID — not email) | No (product analytics, not ad tracking; no ad network SDK is present) | `frontend/src/lib/analytics/productAnalytics.ts` |
| Push tokens | Yes — a device's FCM registration token (native) or a VAPID web-push endpoint | Yes, tied to `userId` | No | `supabase/migrations/20260909130000_push_native_device_tokens.sql`, `supabase/functions/register-push-subscription/index.ts` |
| Payment info | Yes, but handled entirely by Stripe — this app never stores card numbers | Yes (Stripe customer id) | No | `supabase/functions/stripe-checkout/`, `supabase/functions/stripe-webhook/` (not modified for mobile; native build has no purchase flow at all per `MOB-06`/`OVR-066`) |
| Transactional email | Yes — email address only, to send account/notification emails | Yes | No | `supabase/functions/_shared/sendgridMail.ts` (`OVR-043`) |
| Precise location | No | — | — | No geolocation API is used anywhere in `frontend/src` |
| Third-party advertising / data sale | No | — | — | No ad SDK, no data-broker integration anywhere in the codebase |

**Account deletion**: in-app path exists today — Settings → Security →
"Delete account" (`OVR-004`), calling `requestAccountDeletion` in
`frontend/src/lib/settings/securityApi.ts`. This satisfies Apple Guideline
5.1.1(v) (in-app deletion) and Google Play's account-deletion requirement
without new mobile-specific work — it's reachable through the WebView like
any other settings page.

**Export compliance (iOS)**: the app only uses HTTPS/TLS for network calls
(no custom cryptography) — eligible for the standard "uses only exempt
encryption" export compliance declaration. Confirm this at submission time in
App Store Connect (`ITSAppUsesNonExemptEncryption` can be set to `false` in
`Info.plist` if desired, but isn't required for the exemption itself).

## 4. Known gap: no Privacy Policy / Terms page

`US-800` requires a Privacy Policy and Terms link in the app footer pointing
to a real page. Searching this repo (`frontend/src`, `docs/`) turns up **no
Privacy Policy or Terms of Service URL, and no in-app link to one** — the
original spec assumed a page hosted on the separate Wix marketing site, but
its live URL isn't recorded anywhere in this repo, and there's no evidence a
current page exists. This blocks store submission on both platforms (both
require a live Privacy Policy URL in the listing, and Apple's review
guidelines expect it reachable from within the app too).

This is a content/legal gap, not a mobile-specific one — flagging here
rather than fixing it under `MOB-13`, since inventing a URL or drafting the
policy text is outside an agent's authority. **TODO(owner)**: get (or write)
a real Privacy Policy + Terms page, get its URL, and file a follow-up ticket
to link it from the web app's footer (`frontend/src/pages/Index.tsx` /
`frontend/src/components/shell/Header.tsx`) so `US-800` is actually met.

## 5. iOS permission usage strings

| `Info.plist` key | Needed? | Why |
|---|---|---|
| `NSUserNotificationsUsageDescription` (or the system push prompt copy shown at request time) | Not a permission string per se — the push permission prompt uses fixed system copy, not an `Info.plist` string. `enableNativePushNotifications()` (`frontend/src/lib/notifications/nativePushRegistration.ts`) triggers it from a user gesture. | `MOB-09` |
| `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` | **Not needed** | No camera or photo-library picker exists anywhere reachable by a signed-in end user. The only file-upload input in the codebase is an admin-only web `<input type="file">` for adding a specialist's photo (`frontend/src/components/settings/admin/AddSpecialistPopup.tsx`) — plain web upload, no Capacitor Camera/Photos plugin, no native permission triggered. Add this key only if a native camera/photo picker is added later. |
| `NSLocationWhenInUseUsageDescription` | Not needed | No geolocation API used anywhere in `frontend/src`. |

## 6. Review-risk notes (Guideline 4.2 "minimum functionality" / 3.1.1 "no purchase path")

What a reviewer needs to see to pass **4.2** (a WebView wrapper alone is
grounds for rejection): the app has native value beyond the website —

- Native push notifications (`MOB-09`/`MOB-10`), not just web push.
- Native share/save for the PDF report and share card (`MOB-07`) — routes
  through the OS share sheet, not a silently-failing web download.
- A branded native offline screen (`MOB-03`) when connectivity drops.
- Deep links: password-reset emails and notification taps open the app at
  the right screen (`MOB-12`), not just a browser tab.
- Native Android back-button handling (`MOB-03`).

What a reviewer needs to see to pass **3.1.1** (no in-app purchase path
outside Apple's IAP): the native build has **zero** purchase or
plan-change UI — `resolveAllowedActions`/`resolvePlanCardState`
(`frontend/src/lib/subscription/subscriptionActions.ts`) strip
`startCheckout`/`upgradeToPremium`/`scheduleDowngrade` on native and replace
the CTA with plain-text "Manage your plan on unclouded.app" (`MOB-06`,
`OVR-066`). Cancel/resume and the Stripe billing **portal** (opened via the
native Browser plugin, leaving the WebView) remain — those aren't purchases.
Reviewers sometimes still flag "manage subscription" language even when
non-actionable; if 3.1.1 gets pushback, the fallback is to also gray out /
remove that copy entirely for the native build.

**Demo account**: TODO(owner) — needs a real seeded account (completed
onboarding, at least one path enrollment, a check-in or two, Pro or Premium
tier so reviewers can see gated features) created against production or a
review-specific environment. An agent cannot create this without live
credentials/an environment to seed it in.

## 7. CI (optional)

`.github/workflows/mobile-build.yml` — compile-check only, triggered on a
`mobile-v*` tag or manual dispatch. Runs `npx cap sync` then a debug/simulator
build on both platforms (`CODE_SIGNING_ALLOWED=NO` for iOS, so no signing
certificate or provisioning profile secret is ever needed in CI). It does
**not** produce a store-uploadable signed artifact — that stays the human
steps in §1. **Not run in this session** — this repo has no macOS/Android-SDK
environment available to verify it end-to-end (see `mobile/README.md`
"Environment notes"); review the YAML before relying on it.

## 8. Secret scan

Repo-wide check for anything that should never be committed:

```bash
grep -rIn --exclude-dir=node_modules -E "BEGIN (RSA |EC )?PRIVATE KEY|service_role|sk_live_|sk_test_" mobile/ frontend/public
```

As of this doc's writing, the only match is this file's own prose mentioning
the phrase "`service_role`" while describing what to scan for — not a real
credential. No `.p8` (APNs key), `.jks`/`.keystore`
(Android signing), `google-services.json`, or `GoogleService-Info.plist` file
exists anywhere in the repo — all of those are still TODO(owner) per §1.
`mobile/.gitignore` already ignores their common filenames/extensions
(`*.jks`, `*.keystore`, `*.p8`, `*.p12`, `*.mobileprovision`,
`google-services.json`, `GoogleService-Info.plist`) so a future `git add .`
can't accidentally stage one.
