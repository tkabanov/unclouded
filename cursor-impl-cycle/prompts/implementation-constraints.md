# Implementation constraints (mandatory)

Read `cursor-impl-cycle/config/implementation-policy.json` and follow it in every scope/decompose/implement turn.

## Scope: DrSam authenticated SPA (brownfield)

- Implement **DrSam authenticated user SPA** — onboarding, dashboard, chat, journal, paths, settings, crisis support.
- **Brownfield:** a React + Vite prototype already exists in `frontend/`. Extend it in place; do not create a parallel Vue app or `provider-app/` tree.
- Read `cursor-impl-cycle/config/prototype-inventory.json` before implement work.
- Use `state/module-map.json` and IR slices as source of truth for Bubble parity.

## Backend: read-only `project/`

- `project/` is the **canonical Supabase backend** (migrations, RLS, edge functions) when present.
- `frontend/supabase/` holds the prototype's migrations and edge functions — read for client integration context.
- **FORBIDDEN:** any write/edit/create/delete under `project/` including `project/supabase/**`.
- **Allowed:** read schema, types, RPC names, RLS behavior, and existing API contracts.

## Where to write code

| Area | Path | Purpose |
|------|------|---------|
| Frontend | `frontend/` | React + Vite + TypeScript SPA (existing prototype) |
| Cycle artifacts | `cursor-impl-cycle/` | module-map, decompose, coverage, reports |

Routes live in `frontend/src/App.tsx`. Auth guard: `frontend/src/components/ProtectedRoute.tsx`.

## Supabase client rules

**Default:** call Supabase from `frontend/` via `@/integrations/supabase/client.ts`:

- `supabase.from()`, `supabase.rpc()`, or `fetch` to `${VITE_SUPABASE_URL}/functions/v1/<name>` with user JWT
- Do **not** duplicate schema, add migrations under `project/`, or fork business rules in client code

## Decompose implications

- Items should state whether work is **frontend-only** or needs edge function changes in `frontend/supabase/`.
- Do not decompose items that require changing `project/supabase`; document dependency gaps in `scope`.
- `target_files[]` use `.tsx` / `.ts` under `frontend/src/` — see `config/path-conventions.json`.

## UI fidelity (layout and styles)

Read `cursor-impl-cycle/prompts/ui-fidelity-rubric.md` in decompose and implement phases.

- IR elements carry `presentation` (layout, colors, fonts, `style_ref`); styles live in `ir/slices/styles.json`
- Preserve Bubble element hierarchy, regions, and visual design — do not redesign screens
- Use `drsam-99657.bubble` via entity `source_path` when IR presentation is incomplete
- Mark migrated roots with `data-bubble-id="<element_id>"` when AC requires visual parity
- Land `MOD-DRSAM-DESIGN-SYSTEM` (shared styles/primitives) before feature screens when possible

## Implement review blockers

Reject (`blockers[]`) if:

- Any changed path is under `project/`
- Coverage claims Supabase migration/RLS changes under `project/`
- Implementer recreated a parallel app instead of extending `frontend/`
- UI diverges from IR element tree or ignores in-scope `style_ref` / presentation metadata
- Brownfield implement missing `preflight` block in coverage report
- `preflight.reuse_decision: skip` but ACs are not actually satisfied
