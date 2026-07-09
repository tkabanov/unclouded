# Write decompose — module items (DrSam)

**Role:** Writer (`{{subagent_type}}`)  
**Phase:** `decompose`  
**Target module:** `{{target_id}}`  
**Brief:** `cursor-impl-cycle/state/last-brief.json`

## Mandatory constraints

Read `cursor-impl-cycle/prompts/implementation-constraints.md` first.

## Goal

Decompose **one DrSam module** into implementable work items with acceptance criteria.

Write: `cursor-impl-cycle/output/decompose/{{target_id}}.json`

## Read first (IR + prototype)

- `cursor-impl-cycle/state/module-map.json` — current module entry
- `cursor-impl-cycle/config/prototype-inventory.json` — existing React prototype (brownfield)
- `cursor-impl-cycle/config/path-conventions.json` — `.tsx` path conventions under `frontend/src/`
- `ir/inventory.json` and `ir/slices/*` matching `ir_roots` / `ir_slices`
- `ir/slices/styles.json` — Bubble style definitions (`presentation`, `display`) for `style_ref` on elements
- `drsam-99657.bubble` — fallback via entity `source_path` when `presentation` is missing or dynamic
- `cursor-impl-cycle/prompts/ui-fidelity-rubric.md`
- `supabase/**` and `project/supabase/**` — **read only** for API/table/RPC names to reference in AC (no schema changes under `project/`)

## Rules

- `module_id` must equal `{{target_id}}`
- `decomposed: true`
- Each item: `id`, `title`, `scope` (**required**), `acceptance_criteria[]`, `ir_refs[]`, `depends_on[]`
- **`depends_on[]` cross-module refs:** copy **exact** item ids from `cursor-impl-cycle/state/item-registry.json` or `output/decompose/<module>.json` for modules that already decomposed. Never invent ids from module names.
- For UI items add `ui_refs[]` (element/style IDs) and `layout_notes` when layout is non-obvious
- Add `target_files[]` — the `frontend/src/` files this item will **create or modify** (best-effort prediction, e.g. `frontend/src/pages/Dashboard.tsx`). Use **`.tsx` / `.ts`** extensions — not `.vue`. Check `prototype-inventory.json` for existing files to list. Routes: `frontend/src/App.tsx`. This lets the implement scheduler run items with **non-overlapping** file sets in parallel. List shared files (App.tsx, registries, token files) too if the item touches them.
- Tag each item `scope` with implementation surface: `frontend` (default)
- **Item count is your call** — no fixed minimum or maximum. Choose enough items so each implement iteration has a focused, testable scope without losing IR context.
- Size items from IR complexity: count `ir_roots`, `entity_count` in matching `ir/slices/*`, distinct reusables/pages, workflows, and UI regions — not a default bucket count.
- Prefer **one item per major `ir_root`** (reusable/page/option-set cluster) when that root has many entities or distinct user journeys; merge only when roots are tiny and tightly coupled.
- Every `ir_root` from module-map must appear in at least one item's `ir_refs[]`.
- **Scale AC count and `ui_refs` depth to `entity_count`**: a tiny leaf reusable (≤~10 entities) warrants a thin item (~3 ACs); reserve deep AC / `ui_refs` lists for large reusables or multi-journey roots.
- **No duplicate ACs**: do not add a unit-test AC that merely restates `data-bubble-id` ACs already listed, and do not split one assertion across near-identical clauses — fold them together.
- Items must cover module intent from IR; DrSam authenticated SPA scope only
- Split by user journey / **UI region** (element subtrees), not by file layer
- AC must be testable (route, `data-bubble-id`, testid, API call to existing Supabase surface)
- UI AC must reference IR element/style IDs and require preserving hierarchy + presentation from IR
- **Never** plan edits under `project/`; if blocked, state dependency in `scope` and use read-only Supabase workaround

## Output paths

{{outputs}}
