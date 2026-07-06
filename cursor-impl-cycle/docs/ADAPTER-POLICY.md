# Adapter policy (`adapter/`)

Canonical rules for when `adapter/` is allowed during cursor-impl-cycle.  
**Default: frontend-only** — call Supabase from `frontend/` with the user session.

## Use adapter only when at least one is true

1. **Server secret required** — `SUPABASE_SERVICE_ROLE_KEY`, third-party API keys, or other credentials that must not ship to the browser.
2. **Inbound webhook / server trigger** — Bubble workflow was triggered server-side and needs a stable HTTP entry point during migration.
3. **Multi-step orchestration you intentionally keep off the client** — not a mere `Promise.all` of public edge functions/RPCs the SPA can call with user JWT + RLS.
4. **Documented migration facade** — temporary stable URL with `TODO: remove after frontend direct` in decompose scope.

## Do not use adapter for

- Single edge function proxy with **user JWT** — call `${VITE_SUPABASE_URL}/functions/v1/...` from `frontend/`.
- Single RPC proxy — use `supabase.rpc()` from the client.
- Single REST table read/write allowed by RLS — use `supabase.from(...)`.
- Passthrough that only forwards `Authorization: Bearer <user>` and `apikey: anon` — adds latency and ops cost with no security benefit.

## Review / implement gates

**Implementer:** Do not add `adapter/` routes or `VITE_ADAPTER_URL` dependencies unless decompose scope documents one of the allowed reasons above.

**Reviewer:** File `blockers[]` when:

- New or changed adapter route is only a passthrough to one Supabase edge function, RPC, or RLS-backed REST call.
- `files_changed` includes `adapter/` but the same module already calls Supabase directly for equivalent operations.
- Decompose says `frontend+adapter` but no AC requires server-side orchestration or secrets.

Use `critiques[]` with `area: "architecture"`, `priority: "blocker_candidate"` when uncertain; triage confirms fix_now vs defer.

## Decompose scope labels

- `frontend` — UI + direct Supabase client only.
- `frontend+adapter` — only when an allowed reason is named in the scope sentence (cite secret, webhook, or orchestration steps).
- `adapter-only` — rare; server endpoint with no new UI.

When migrating Bubble plugins that were only SupaDB/edge connectors, scope should be **`frontend`**, not `frontend+adapter`.
