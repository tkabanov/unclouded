# Write decompose — module items (provider)

**Role:** Writer (`{{subagent_type}}`)  
**Phase:** `decompose`  
**Target module:** `{{target_id}}`  
**Brief:** `cursor-packs/cursor-impl-cycle/state/last-brief.json`

## Mandatory constraints

Read `cursor-packs/cursor-impl-cycle/prompts/implementation-constraints.md` first.

## Goal

Decompose **one provider module** into implementable work items with acceptance criteria.

Write: `cursor-packs/cursor-impl-cycle/output/decompose/{{target_id}}.json`

## Read first (IR only)

- `cursor-packs/cursor-impl-cycle/state/module-map.json` — current module entry
- `ir/inventory.json` and `ir/slices/*` matching `ir_roots` / `ir_slices`
- `ir/slices/styles.json` — Bubble style definitions (`presentation`, `display`) for `style_ref` on elements
- `source/app.bubble` — fallback via entity `source_path` when `presentation` is missing or dynamic
- `cursor-packs/cursor-impl-cycle/prompts/ui-fidelity-rubric.md`
- `project/supabase/**` — **read only** for API/table/RPC names to reference in AC (no schema changes)

## Rules

- `module_id` must equal `{{target_id}}`
- `decomposed: true`
- Each item: `id`, `title`, `scope` (**required**), `acceptance_criteria[]`, `ir_refs[]`, `depends_on[]`
- **`depends_on[]` cross-module refs:** copy **exact** item ids from `cursor-packs/cursor-impl-cycle/state/item-registry.json` or `output/decompose/<module>.json` for modules that already decomposed. Never invent ids from module names (e.g. `ENUMS-01` is wrong; use `ENUM-01-provider-page-path-route-registry`). Module-level deps may use `MOD-*` ids when the whole module must land first.
- For UI items add `ui_refs[]` (element/style IDs) and `layout_notes` when layout is non-obvious
- Add `target_files[]` — the `provider-app/` (and `provider-adapter/`) files this item will **create or modify** (best-effort prediction, e.g. `provider-app/src/components/jobs/JobCard.vue`). This lets the implement scheduler run items with **non-overlapping** file sets in parallel. List shared files (router, registries, token files) too if the item touches them — accuracy prevents merge conflicts. Omit only if truly unknown.
- Tag each item `scope` with implementation surface: `frontend`, `adapter`, or `frontend+adapter`
- **Item count is your call** — no fixed minimum or maximum. Choose enough items so each implement iteration has a focused, testable scope without losing IR context.
- Size items from IR complexity: count `ir_roots`, `entity_count` in matching `ir/slices/*`, distinct reusables/pages, workflows, and UI regions — not a default bucket count.
- Prefer **one item per major `ir_root`** (reusable/page/option-set cluster) when that root has many entities or distinct user journeys; merge only when roots are tiny and tightly coupled.
- Every `ir_root` from module-map must appear in at least one item's `ir_refs[]`.
- **Scale AC count and `ui_refs` depth to `entity_count`**: a tiny leaf reusable (≤~10 entities) warrants a thin item (~3 ACs); reserve deep AC / `ui_refs` lists for large reusables or multi-journey roots. Detail should be proportional to IR bulk, not maximal by default.
- **No duplicate ACs**: do not add a unit-test AC that merely restates `data-bubble-id` ACs already listed, and do not split one assertion across near-identical clauses — fold them together.
- Items must cover module intent from IR; provider scope only
- Split by user journey / **UI region** (element subtrees), not by file layer
- AC must be testable (route, `data-bubble-id`, testid, API call to existing Supabase surface, adapter endpoint)
- UI AC must reference IR element/style IDs and require preserving hierarchy + presentation from IR
- **Never** plan edits under `project/`; if blocked, state dependency in `scope` and use read-only Supabase or adapter workaround

## Output paths

{{outputs}}
