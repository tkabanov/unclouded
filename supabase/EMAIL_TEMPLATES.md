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

Section 13 notification types (module unlock, daily check-in, reassessment, milestones, streaks) are mapped in the catalog with Build Brief trigger text. Re-engagement rules (max 1/day, no guilt framing) are product constraints for the future scheduler — not enforced in this slice.

### 90-day reassessment due (Section 2 / US-300)

Edge function: `supabase/functions/reassessment-due`.

- Selects Pro/Premium profiles where `nextReassessmentDate <= now` and `reassessmentDueEmailedAt` is null or older than 5 days.
- Stamps `reassessmentDueEmailedAt` after each attempt.
- Sends via Resend when `RESEND_API_KEY` is set (from `noreply@uncloud360.ai`); otherwise cohort is stamped with `smtp:skipped`.
- Auth: `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` or header `x-cron-secret: <REASSESSMENT_DUE_CRON_SECRET>`.

**Schedule (ops):** configure a daily cron in Supabase Dashboard (or GitHub Action / pg_net) to `POST /functions/v1/reassessment-due` with the service-role bearer. Frontend hooks may also invoke the same function for dry-run/cohort checks.

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
