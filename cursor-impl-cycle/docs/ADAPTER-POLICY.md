# Adapter policy (provider-adapter)

Canonical rules for when `provider-adapter/` is allowed during cursor-impl-cycle.  
**Default: frontend-only** — call Supabase from `provider-app/` with the user session.

## Use adapter only when at least one is true

1. **Server secret required** — `SUPABASE_SERVICE_ROLE_KEY`, third-party API keys, or other credentials that must not ship to the browser.
2. **Inbound webhook / server trigger** — Bubble workflow was triggered server-side and needs a stable HTTP entry point during migration.
3. **Multi-step orchestration you intentionally keep off the client** — not a mere `Promise.all` of public edge functions/RPCs the SPA can call with user JWT + RLS.
4. **Documented migration facade** — temporary stable URL with `TODO: remove after frontend direct` in decompose scope.

## Do not use adapter for

- Single edge function proxy (`invite-to-apply`, `application-details`, `publish-job`, `close-job`, …) with **user JWT** — call `${VITE_SUPABASE_URL}/functions/v1/...` from `provider-app/` (see `jobMutationsApi.ts`, `viewJobApplicantActionsApi.ts`).
- Single RPC proxy (`get_urrecruiter_candidate_profile`, `get_job_score_details_for_company`, …) — use `supabase.rpc()` from the client.
- Single REST table read/write allowed by RLS — use `supabase.from(...)`.
- Passthrough that only forwards `Authorization: Bearer <user>` and `apikey: anon` — adds latency and ops cost with no security benefit.

## Review / implement gates

**Implementer:** Do not add `provider-adapter/` routes or `VITE_PROVIDER_ADAPTER_URL` dependencies unless decompose scope documents one of the allowed reasons above.

**Reviewer:** File `blockers[]` when:

- New or changed adapter route is only a passthrough to one Supabase edge function, RPC, or RLS-backed REST call.
- `files_changed` includes `provider-adapter/` but the same module already calls Supabase directly for equivalent operations (e.g. `jobMutationsApi.ts` vs `jobs/applicants.mjs`).
- Decompose says `frontend+adapter` but no AC requires server-side orchestration or secrets.

Use `critiques[]` with `area: "architecture"`, `priority: "blocker_candidate"` when uncertain; triage confirms fix_now vs defer.

## Current adapter inventory (audit 2026-06)

| Route | Verdict | Notes |
|-------|---------|--------|
| `GET /provider/dashboard-feed` | **Keep (optional)** | Only real multi-fetch orchestration; could move to frontend composable later. |
| `GET /provider/sidebar-context` | **Remove / avoid new** | Passthrough `unread-counts` — use direct edge call. |
| `GET /candidates/:id/profile` | **Remove / avoid new** | RPC passthrough — use `supabase.rpc()`. |
| `GET /candidates/:id/job-score` | **Remove / avoid new** | RPC passthrough. |
| `GET /auth/signup/check-company` | **Remove / avoid new** | Public edge fn; frontend already has fallback. |
| `GET /auth/fg-services/*` | **Remove / avoid new** | Same + log-only analytics. |
| `POST /upload/storage` | **Remove / avoid new** | Worse than direct `functions/v1/file` upload. |
| `jobs/applicants/*` | **Deprecated** | Removed from server; use `viewJobApplicantActionsApi.ts`. |

Legacy routes may remain until refactored; **do not add new routes in the same category.**

## Decompose scope labels

- `frontend` — UI + direct Supabase client only.
- `frontend+adapter` — only when an allowed reason is named in the scope sentence (cite secret, webhook, or orchestration steps).
- `adapter-only` — rare; server endpoint with no new UI.

When migrating Bubble plugins that were only SupaDB/edge connectors, scope should be **`frontend`**, not `frontend+adapter`.
