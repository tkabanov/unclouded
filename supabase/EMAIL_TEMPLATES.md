# Transactional email templates — US-606 (T-012)

Branded transactional email system for the Supabase stack. **Auth emails are live** via Supabase GoTrue templates. **Platform event emails** (welcome, billing, Section 13 notifications) are catalogued in `frontend/src/lib/email/transactionalEmailCatalog.ts` with honest placeholders until custom SMTP + edge sender is PM-approved.

## Sender & branding

| Field | Value |
| --- | --- |
| From address | `noreply@uncloud360.ai` |
| Product name | Uncloud360 |
| Disclaimer | AI-powered coaching only — not therapy or medical advice. Emergency: 988 or 911. |
| Brand colors | Teal `#00B8B8`, blue `#0570C9`, primary CTA `#0987C5` (see `frontend/src/lib/email/branding.ts`) |

Phase 2 originally specified Bubble + SendGrid. This repo uses **Supabase Auth templates** for account emails and documents platform emails for a future edge/SMTP slice. No SendGrid wiring exists in this codebase.

## App redirect parity (password reset)

All password-reset requests use `frontend/src/lib/auth/passwordResetApi.ts`:

- `redirectTo` = `{VITE_APP_URL or current origin}/reset_pw`
- Used by **AuthDialog** (unauthenticated forgot password) and **Settings → Security** (logged-in reset)

After the user clicks the email link, Supabase establishes a recovery session and the app completes the flow on `/reset_pw` via `completePasswordRecovery`.

Ensure Supabase **Redirect URLs** include production `/reset_pw` (see `supabase/config.toml` `[auth]` for local URLs).

## Supabase Dashboard — apply Auth templates

Path: **Project → Authentication → Email Templates**

Paste HTML from `supabase/email-templates/` into each template. Set subjects to match the catalog (`frontend/src/lib/email/transactionalEmailCatalog.ts`).

| Supabase template | File | Subject (recommended) |
| --- | --- | --- |
| Reset password | `email-templates/recovery.html` | Reset your Uncloud360 password |
| Confirm signup | `email-templates/confirm-signup.html` | Confirm your email to get started with Uncloud360 |
| Magic link | `email-templates/magic-link.html` | Your Uncloud360 sign-in link |
| Change email address | `email-templates/email-change.html` | Confirm your new Uncloud360 email |
| Invite user | `email-templates/invite.html` | You've been invited to Uncloud360 |

GoTrue variables used: `{{ .ConfirmationURL }}`, `{{ .NewEmail }}` (email change). Do not remove `{{ .ConfirmationURL }}` — it carries the signed redirect.

## Production SMTP (ops — PM gated)

1. **Authentication → SMTP Settings**: configure custom SMTP (SendGrid, Resend, Postmark, etc.) with verified domain `uncloud360.ai`.
2. Set sender to `noreply@uncloud360.ai`.
3. **Authentication → URL Configuration**: set Site URL to production app origin; add `https://<app>/reset_pw` to redirect allow list.
4. **Authentication → Providers → Email**: enable email confirmations in production (`enable_confirmations = true`). Local dev keeps confirmations off in `config.toml` (built-in SMTP rate limit).

## Signup confirm email

`frontend/src/lib/auth/credentialsApi.ts` → `signUpWithEmailPassword` sets `emailRedirectTo` to `getAppOrigin()`. When confirmations are enabled, Supabase sends the **Confirm signup** template automatically.

## Welcome email (onboarding complete)

| Email | Trigger | Subject |
| --- | --- | --- |
| Welcome — Free signup | `completeOnboarding` success | Your PuP 360 results are in |

Hook: `scheduleWelcomeEmailAfterOnboarding` in `frontend/src/lib/email/transactionalEmailHooks.ts` — **placeholder** until edge SMTP sender exists. Reference body copy: `email-templates/welcome-free-signup.html` (not a GoTrue template).

## Platform & notification hooks (Build Brief §8 + §13)

Catalog ids and triggers live in `transactionalEmailCatalog.ts`. Call sites should use `requestTransactionalEmail(id, payload)` — returns `{ status: 'placeholder', detail }` until SMTP edge is built.

Section 13 notification types (module unlock, daily check-in, reassessment, milestones, streaks) are mapped in the catalog with Build Brief trigger text. **Module unlock** and **first-module milestone** delivery is wired via edge functions; other Section 13 types remain placeholder until their schedulers ship. Re-engagement rules (max 1/day, no guilt framing) are enforced for module unlock + milestone in this slice.

### Deep-dive module unlock (TEMP §10 / Build Brief §13)

Edge function: `supabase/functions/module-unlock`.

- Selects onboarding-complete profiles whose next due module has reached `scheduledAt`, is incomplete, and has not exhausted initial + 3-day resend notifications.
- Respects global max **1 notification per user per local day** via `lastNotificationSentAt` + profile `timeZone`.
- Stamps `moduleSchedules[slug].unlockNotifiedAt` / `unlockResentAt` and `lastNotificationSentAt` after each attempt.
- Sends via Resend when `RESEND_API_KEY` is set (from `noreply@uncloud360.ai`); otherwise cohort is stamped with `smtp:skipped`.
- Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret: <MODULE_UNLOCK_CRON_SECRET>`.

**Schedule (live):** `pg_cron` job `daily-module-unlock` at **13:00 UTC** → `invoke_scheduled_edge_function('module-unlock')`.

Edge function: `supabase/functions/notification-milestone`.

- Invoked by client after first `completeModule` success (`modulesCompletedCount === 1`).
- Auth: user JWT (`verify_jwt = true`).
- Stamps `firstModuleMilestoneEmailedAt`; respects max 1/day via `lastNotificationSentAt`.
- Copy avoids Pro upsell (OVR-009).

### Vulnerable user outreach (REQ-07 / Prompt Library addendum)

Edge function: `supabase/functions/vulnerable-outreach`.

- Daily cohort: profiles with `grief_mode_active` or `recovery_mode_active` in `results`, onboarding complete, **≥10 days** since last `chatConversation` activity (or since onboarding if never chatted).
- Copy: **"Kota is here when you're ready."** — warm, low-pressure; no missed-session guilt framing.
- Frequency cap: **once per 7 days** via `vulnerableOutreachEmailedAt`.
- **Channel:** Web Push when the user has a registered subscription and `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` are set on the edge function; otherwise Resend email when `RESEND_API_KEY` is set (from `noreply@uncloud360.ai`). Expired push subscriptions (410/404) are removed automatically; email is used as fallback.
- Frontend registers subscriptions via `register-push-subscription` edge fn + `public/push-sw.js` (env: `VITE_VAPID_PUBLIC_KEY`).
- Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret: <VULNERABLE_OUTREACH_CRON_SECRET>`.

**Schedule (live on project `szkextipgpupqoppccoy`):** `pg_cron` job `daily-vulnerable-outreach` at **14:00 UTC** → `public.invoke_scheduled_edge_function('vulnerable-outreach')` (vault: `project_url` + `edge_cron_service_role_key`). Migration: `20260720120000_scheduled_edge_cron_jobs.sql`.

Manual smoke:
```sql
SELECT public.invoke_scheduled_edge_function('vulnerable-outreach');
-- then: SELECT id, status_code, content FROM net._http_response ORDER BY id DESC LIMIT 1;
```

### 90-day reassessment due (Section 2 / US-300)

Edge function: `supabase/functions/reassessment-due`.

- Selects Pro/Premium profiles where `nextReassessmentDate <= now` and `reassessmentDueEmailedAt` is null or older than 5 days.
- Stamps `reassessmentDueEmailedAt` after each attempt.
- Sends via Resend when `RESEND_API_KEY` is set (from `noreply@uncloud360.ai`); otherwise cohort is stamped with `smtp:skipped`.
- Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret: <REASSESSMENT_DUE_CRON_SECRET>`.

**Schedule (live):** `pg_cron` job `daily-reassessment-due` at **15:00 UTC** → `invoke_scheduled_edge_function('reassessment-due')`. Frontend hooks may also invoke the same function for dry-run/cohort checks.

### Onboarding drop-off (US-905)

Edge function: `supabase/functions/onboarding-dropoff`.

- Selects profiles where `onboardingCompleted = false`, `email IS NOT NULL`, account age **≥ 24 hours**, and `onboardingDropoffEmailedAt` is null.
- Stamps `onboardingDropoffEmailedAt` after each attempt (send or Resend skip).
- Sends via Resend when `RESEND_API_KEY` is set (from `noreply@uncloud360.ai`); subject: *Your PuP 360 results are waiting for you*; CTA links to `{APP_ORIGIN}/onboarding`.
- Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret: <ONBOARDING_DROPOFF_CRON_SECRET>`.

**Schedule (live on project `szkextipgpupqoppccoy`):** `pg_cron` job `daily-onboarding-dropoff` at **16:00 UTC** → `invoke_scheduled_edge_function('onboarding-dropoff')` (vault: `project_url`, `edge_cron_service_role_key`, optional `onboarding_dropoff_cron_secret`). Migration: `20260722130000_onboarding_dropoff_email.sql`.

Manual smoke:
```sql
SELECT public.invoke_scheduled_edge_function('onboarding-dropoff');
-- then: SELECT id, status_code, content FROM net._http_response ORDER BY id DESC LIMIT 1;
```

## Verification checklist (developer / PM)

1. Apply **recovery** template in Supabase Dashboard.
2. From AuthDialog → Forgot password, submit a test email; confirm branded message, `noreply@uncloud360.ai` sender (after SMTP), link opens `/reset_pw`.
3. Repeat from Settings → Security → send reset email (same template, same redirect).
4. Sign up a test user with confirmations enabled in staging; confirm **confirm-signup** template.
5. Complete onboarding; confirm welcome hook logs placeholder (no fabricated send) until SMTP edge ships.
6. Cross-check catalog subjects against Phase 2 Section 8 table.

## Related code

| Path | Role |
| --- | --- |
| `frontend/src/lib/email/` | Catalog, branding, hooks |
| `frontend/src/lib/auth/passwordResetApi.ts` | Password reset I/O |
| `frontend/src/lib/auth/credentialsApi.ts` | Signup redirect for confirm email |
| `frontend/src/lib/completeOnboarding.ts` | Welcome hook after onboarding |
| `supabase/config.toml` | Local auth URL + dev confirmation toggle |

No migration required for this slice.
