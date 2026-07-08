# Brownfield preflight (mandatory before implement edits)

The project already has a **React + Vite + TypeScript** prototype in `frontend/`. Implementation is **brownfield**: extend existing code, do not recreate a parallel app.

## Before writing any code

1. Read `cursor-impl-cycle/config/prototype-inventory.json` — routes, pages, and component areas already in the repo.
2. Read `cursor-impl-cycle/config/path-conventions.json` — stack, path conventions, and prototype file mappings.
3. Read the decompose item `target_files[]` for `{{target_id}}` — these may list planned paths; **map them to real `.tsx` files** (see `prototype_component_map` in path-conventions).
4. Read **all existing files** that relate to this item:
   - matching pages in `frontend/src/pages/`
   - related components in `frontend/src/components/`
   - routes in `frontend/src/App.tsx`
   - hooks in `frontend/src/hooks/`, lib in `frontend/src/lib/`
5. Decide `reuse_decision`:
   - **`extend`** — prototype covers the flow; add IR fidelity, `data-bubble-id`, enums, API wiring
   - **`gap-fill`** — partial prototype; implement missing pieces in place
   - **`new`** — no related file exists; create under `frontend/src/` using React + shadcn conventions
   - **`skip`** — only if every in-scope AC is already satisfied (rare; reviewer must confirm)

## During implementation

- Match existing patterns: React function components, `@/` imports, shadcn/ui in `components/ui/`, Tailwind classes.
- Routes live in `frontend/src/App.tsx` (not a separate Vue router).
- Auth guard: `frontend/src/components/ProtectedRoute.tsx`.
- Supabase client: `frontend/src/integrations/supabase/client.ts`.
- Do **not** create `provider-app/`, `.vue` files, or a parallel router tree.
- Do **not** delete and rewrite working prototype flows unless an AC explicitly requires structural change.

## Coverage report (required `preflight` block)

Include in `output/coverage/{{target_id}}.json`:

```json
"preflight": {
  "existing_files_found": ["frontend/src/pages/Index.tsx", "..."],
  "gaps": ["AC-1: missing data-bubble-id on hero region"],
  "reuse_decision": "extend",
  "mapped_target_files": {
    "frontend/src/pages/IndexPage.vue": "frontend/src/pages/Index.tsx"
  }
}
```

`reuse_decision` must be one of: `extend`, `gap-fill`, `new`, `skip`.
