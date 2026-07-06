# Review decompose

**Role:** Reviewer (generalPurpose, **readonly: true**)  
**Phase:** `decompose`  
**Target:** `{{target_id}}`

Write **only**: `cursor-packs/cursor-impl-cycle/output/reports/decompose-{{target_id}}.review.json`

```json
{
  "phase": "decompose",
  "target_id": "{{target_id}}",
  "assessed_at": "<ISO8601>",
  "ok": true,
  "readiness_pct": 90,
  "coverage_confidence_pct": 85,
  "scores": { "completeness": 4, "grounding": 4, "actionability": 5 },
  "gaps": [],
  "blockers": [],
  "critiques": []
}
```

## Read first

- `cursor-packs/cursor-impl-cycle/state/module-map.json` — module `estimated_size`, `ir_roots[]`, `ir_slices[]`
- `cursor-packs/cursor-impl-cycle/state/item-registry.json` — canonical item ids for cross-module `depends_on[]` validation
- Matching `ir/slices/*` — use `entity_count` and entity classes to judge IR bulk
- Decompose artifact under review

## Checklist

- Items cover module purpose from IR (`module-map.json` + `ir_refs` per item)
- **Every `ir_root` from module-map appears in at least one item `ir_refs[]`**
- **Item count matches module complexity** (no fixed number — judge from evidence):
  - `estimated_size`: `small` → few focused items OK; `medium` → typically several items when multiple roots or UI regions; `large` → expect many items when IR slices have high `entity_count` or multiple reusables
  - Flag **under-decomposition** when few items bundle many `ir_roots`, large `entity_count` slices, or unrelated journeys into one item
  - Flag **over-decomposition** when items are artificially thin (single trivial element, duplicate boundaries)
- UI items include `ui_refs[]` and `layout_notes` when layout is non-trivial; `ui_refs` depth should match subtree scope (not only 2–3 anchor ids on a 100+ entity reusable)
- **Over-specification check** (symmetric to under-decomposition): flag as a `critique` (area `ac-quality`) any item whose AC count is disproportionate to its `entity_count` — e.g. a tiny leaf reusable (≤~10 entities) padded with duplicate/restating ACs, Storybook-demo ACs, or a unit-test AC that merely repeats `data-bubble-id` clauses. Detail should be proportional to IR bulk.
- UI acceptance criteria reference element/style IDs and visual parity (`data-bubble-id`, hierarchy)
- Grounding is IR + `styles.json` + `source/app.bubble` via `source_path` — no external product-doc artifacts
- Each item has non-empty `scope` with explicit out-of-scope boundaries
- Each item has testable acceptance criteria
- No overlapping duplicate items
- **Every `depends_on` entry resolves:** same-module item id, known `MOD-*` module id, or exact id from `item-registry.json`. Unknown or invented ids (e.g. `ENUMS-01` when registry has `ENUM-01-…`) → `blockers[]`
- Set `coverage_confidence_pct` low when item granularity likely loses implement context
- Put **under-decomposition** or **uncovered `ir_root`** in `blockers[]` (not only `critiques[]`)
- `ok: true` only if readiness ≥ 85 and no blockers

<!-- critic-mode appended by brief.mjs -->
