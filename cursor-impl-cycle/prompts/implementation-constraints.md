# Implementation constraints (mandatory)

Read `cursor-impl-cycle/config/implementation-policy.json` and follow it in every scope/decompose/implement turn.

## Scope: DrSam authenticated SPA

- Implement **DrSam authenticated user SPA** (`drsam-99657`): auth/onboarding entry, shared shell and design system, then dashboard, journal, paths, chat, and settings.
- **Out of scope:** public-only surfaces (`404`, stub pages) unless an acceptance criterion explicitly requires them.
- Use `config/drsam-scope-seed.json` as module hints; refine against IR.

## Backend: read-only `project/`

- `project/` is the **canonical Supabase backend** (migrations, RLS, edge functions).
- **FORBIDDEN:** any write/edit/create/delete under `project/` including `project/supabase/**`.
- **Allowed:** read `project/supabase` for schema, types, RPC names, RLS behavior, and existing API contracts.

## Where to write code

| Area | Path | Purpose |
|------|------|---------|
| Frontend | `frontend/` | Vue SPA for DrSam UI |
| Thin adapter | `adapter/` | Fastify proxy/orchestration replacing Bubble API-connector workflows when direct Supabase client is insufficient |
| Cycle artifacts | `cursor-impl-cycle/` | module-map, decompose, coverage, reports |

## Adapter rules (Fastify)

Read `cursor-impl-cycle/docs/ADAPTER-POLICY.md`.

Use `adapter/` **only when necessary**:

1. **First choice:** call Supabase from `frontend/` via `supabase-js`, `supabase.rpc()`, or `fetch` to edge functions with user JWT + `apikey`.
2. **Adapter when:** server secret required, inbound webhook, or multi-step orchestration intentionally kept off the client (not a single edge/RPC/REST passthrough).
3. **Adapter must not:** duplicate schema, add migrations, fork business rules in Supabase, or proxy one user-JWT call that RLS already allows on the client.

**Forbidden:** new adapter routes that only forward `Authorization: Bearer <user>` to a single Supabase edge function, RPC, or table — implement in `frontend/` instead.

## Decompose implications

- Items should state whether work is **frontend-only**, **adapter-only**, or **both**.
- Do not decompose items that require changing `project/supabase`; if blocked, document as dependency gap in `scope` and use adapter/read-only workaround in AC.

## UI fidelity (layout and styles)

Read `cursor-impl-cycle/prompts/ui-fidelity-rubric.md` in decompose and implement phases.

- IR elements carry `presentation` (layout, colors, fonts, `style_ref`); styles live in `ir/slices/styles.json`
- Preserve Bubble element hierarchy, regions, and visual design — do not redesign feature screens
- Use `drsam-99657.bubble` via entity `source_path` when IR presentation is incomplete
- Mark migrated roots with `data-bubble-id="<element_id>"` when AC requires visual parity
- Land `MOD-DRSAM-DESIGN-SYSTEM` (shared styles/primitives) before feature screens when possible

## Implement review blockers

Reject (`blockers[]`) if:

- Any changed path is under `project/`
- Coverage claims Supabase migration/RLS changes
- Item implements flows outside DrSam authenticated SPA scope
- UI diverges from IR element tree or ignores in-scope `style_ref` / presentation metadata
- **Unnecessary adapter:** new/changed `adapter/` route is only a user-JWT passthrough to one Supabase edge function, RPC, or RLS-backed REST call (see `docs/ADAPTER-POLICY.md`)
