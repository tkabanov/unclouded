# Move Supabase to the client project (single environment)

Decision (2026-10-23): everything today is one dev-like environment, there is no prod yet.
Move it as-is to the client's existing project; split dev/prod later, once the client org is on Pro.

| | Old | New |
|---|---|---|
| Project | `szkextipgpupqoppccoy` (eu-west-1) | `rppcfcmmnudbeflgcaad` "DrSam360's Project" (us-east-2, Nano) |
| Org | personal `qffnoxhxuvcisauyzypv` | `Proven Under Pressure LLC` (`xnmssahmntywkirroszz`), **Free** plan |
| Our role | owner | **Developer** (`2fa+unclouded@rapidevelopers.com`); owner is `dr.sam@provenunderpressure.com` |

New project state on 2026-10-23: empty `public` schema.

Constraints of Developer role + Free plan:
- Auth settings (Site URL, redirects, SMTP, email templates) are read-only for Developer — needs the owner or an Admin role.
- Free projects pause after ~7 days without activity; no daily backups; Nano compute.

## MCP

`~/.claude.json` → project `E:/unclouded`:
- `supabase` — hosted MCP, `project_ref=rppcfcmmnudbeflgcaad` (OAuth as the client account).
- `supabase-old` — old project, `--read-only`. Remove after the move is verified.

## Secrets to set on the new project

Set on the old project (names from `supabase secrets list`; values are not readable, take them from the source dashboards):
`APP_ORIGIN`, `APP_URL`, `COACH_BRIEF_INBOX`, `FCM_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `RESEND_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (new endpoint → new value), `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`,
`WIX_WEBHOOK_SECRET`, `AUTO_FINALIZE_SESSIONS_CRON_SECRET`, `ONBOARDING_DROPOFF_CRON_SECRET`, `VULNERABLE_OUTREACH_CRON_SECRET`
(cron secrets: generate new ones). `SUPABASE_*` are provided by the platform.
Not set on the old project either (features stay off): `SENDGRID_*`, `GOOGLE_OAUTH_*`, `GOOGLE_CALENDAR_ID`, other `*_CRON_SECRET`.

Vault on the old project: `project_url`, `edge_cron_service_role_key`, `auto_finalize_sessions_cron_secret`,
`onboarding_dropoff_cron_secret`, `vulnerable_outreach_cron_secret`.

## Move scripts

Outside the repo, in `E:\unclouded-backups\move\`: `1_dump_old_data.sh` (final data-only dump),
`2_load_new_data.sh` (load via dockerized `psql`, needs `NEW_DB_URL`), `3_copy_storage.mjs` (storage objects).

## Steps

1. **Freeze** writes to the old project (tell testers).
2. **Schema:** apply all `supabase/migrations/*` to the new project
   (`supabase db push --db-url <new>` or MCP `apply_migration` per file). Buckets, cron jobs and seeds come from migrations.
   Compare the new schema with `E:\unclouded-backups\2026-10-23\schema.sql`. The old project has no default
   anon/authenticated grants + auto-RLS; the new one is a standard project — check grants do not end up wider.
3. **Data:** fresh `supabase db dump --db-url <old> --data-only --use-copy`, excluding
   `supabase_migrations.*`, `cron.*`, `vault.*`, `storage.buckets`, `public."edgeRateLimitBucket"`,
   `auth.sessions`, `auth.refresh_tokens`, `auth.flow_state`, `auth.one_time_tokens`, `auth.audit_log_entries`.
   `TRUNCATE` seeded `public` tables, then load with `SET session_replication_role = replica` in one transaction.
   Verify row counts per table vs the old project (177 users at backup time).
4. **Storage:** copy objects of `pup-pdf-reports` and `specialist-images` to the same paths.
5. **Edge functions:** deploy all functions from `supabase/functions/` (`verify_jwt` from `config.toml`).
6. **Secrets:** set all edge secrets (list in the move plan, Phase 0 p.3). New `*_CRON_SECRET` values; keep VAPID keys.
7. **Vault:** `project_url`, `edge_cron_service_role_key`, `*_cron_secret` (same values as edge secrets).
8. **Auth (owner/Admin):** Site URL, redirect URLs (`<app>/reset_pw`, localhost), SendGrid SMTP, templates from
   `supabase/email-templates/` per `supabase/EMAIL_TEMPLATES.md`.
9. **External webhooks:** Stripe test webhook → `https://rppcfcmmnudbeflgcaad.supabase.co/functions/v1/stripe-webhook`
   (new `whsec`); Wix Bookings → `.../functions/v1/wix-bookings-webhook`.
10. **Code:** replace the old ref in `supabase/config.toml`, `frontend/.env*`, Vercel env vars,
    `mobile/capacitor.config.ts`, `scripts/*.mjs` fallbacks, deploy docs/skills; regenerate `types.ts`.
11. **Smoke test:** login with an existing user, chat, realtime voice, PUP PDF, Stripe test checkout, coach booking, push, cron runs.
12. Old project stays as a backup; pause it after 1–2 weeks of stable work.
