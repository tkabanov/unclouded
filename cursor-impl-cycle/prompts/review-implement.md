# Review implement — independent IR audit (DrSam)

**Role:** Reviewer (generalPurpose, **readonly: true**)  
**Phase:** `implement`  
**Target item:** `{{target_id}}`

Write **only**: `cursor-impl-cycle/output/reports/implement-{{target_id}}.review.json`

```json
{
  "phase": "implement",
  "target_id": "{{target_id}}",
  "assessed_at": "<ISO8601>",
  "ok": true,
  "coverage_pct": 92,
  "coverage_confidence_pct": 88,
  "functional_ok": true,
  "criteria_audit": [],
  "functional_audit": [],
  "ui_evidence": [],
  "gaps": [],
  "blockers": [],
  "critiques": []
}
```

## Mandatory read order (re-gather context — do not trust implement coverage alone)

1. `cursor-impl-cycle/prompts/implementation-constraints.md`
2. `cursor-impl-cycle/prompts/ui-fidelity-rubric.md`
3. `cursor-impl-cycle/prompts/functional-review-rubric.md`
4. `cursor-impl-cycle/state/wave-2-manifest.json` — if `{{target_id}}` is in `reopen[]`, verify every `reviewer_checks[]` entry
5. Decompose item in `output/decompose/MOD-DRSAM-*.json` for `{{target_id}}` — copy `acceptance_criteria[]`, `functional_verification[]`, `ir_refs[]`, `ui_refs[]`, `layout_notes`, `scope`
6. Implementer's `output/coverage/{{target_id}}.json` — **suspect until verified**; treat as a claim, not proof
7. **Every** `ir_refs[]` / `ui_refs[]` entity:
   - `ir/slices/reusable-*.json`, `ir/slices/ui-page-*.json`, or `ir/inventory.json` lookup
   - `ir/slices/styles.json` for each in-scope `style_ref`
   - `drsam-99657.bubble` via `source_path` when presentation is missing or workflows matter
8. **All** changed files listed in coverage `files_changed` and brief `target_files` — read the actual Vue/TS/CSS/adapter code

You are re-doing the implementer's IR homework. Skimming coverage JSON or decompose AC titles is not a review.

## Independent coverage audit

Recompute `coverage_pct` yourself. Formula: `pass` AC count / total in-scope AC × 100 (`partial` = 0.5 if you use it sparingly).

Fill `criteria_audit[]` — one row per decompose AC:

```json
{
  "id": "AC-1",
  "status": "pass",
  "evidence": ["frontend/src/..."],
  "gap": null
}
```

Status values: `pass` | `partial` | `fail` | `na` (only when AC explicitly out of scope for this item).  
If implementer's coverage disagrees with your audit, **your audit wins** and lowers `coverage_pct`.

Set `coverage_confidence_pct` (0–100) from how deeply you verified IR + code (read every ui_ref vs spot-checked only).

`ok: true` only if **your** `coverage_pct ≥ 90`, **`functional_ok: true`** (see functional-review-rubric.md), and no blockers.

Placeholder UI (`content mounts in downstream`, `Alternate applicant view mounts here`, in-scope `Coming Soon`, mailto-only where API is required) → `functional_ok: false` and `ok: false`.

## UI / IR fidelity audit

For **each** `ui_refs[]` id from decompose (and nested children visible in the IR slice), add `ui_evidence[]`:

```json
{
  "bubble_id": "bUseY",
  "vue_selector": "[data-bubble-id='bUseY']",
  "status": "pass",
  "notes": "optional — layout/presentation delta"
}
```

Check against IR slice entities:

| Check | Fail → |
|-------|--------|
| Missing `data-bubble-id` where AC or ui_ref requires it | `blockers[]` |
| Wrong `parent_element_id` hierarchy (region missing or flattened) | `blockers[]` or `gaps[]` |
| `presentation` ignored (border_radius, padding, font_*, bgcolor) when IR has explicit values | `critiques[]` with `priority: high` or blocker if AC is visual |
| `style_ref` not resolved via `styles.json` / tokens | `critiques[]` |
| Bubble workflow semantics missing (toggle, hide/show, SetCustomState) | `critiques[]` — note if intentional per scope |
| Static IR `text` / copy wrong or placeholder | `gaps[]` or blocker if AC names copy |

Use `layout_notes` from decompose as binding context.

## Hard blockers (`blockers[]` — fails gate)

- Any `criteria_audit` row `fail` on an in-scope AC
- `files_changed` or evidence under forbidden `project/`
- Supabase schema/RLS writes instead of read-only + adapter
- Work outside DrSam scope
- Missing required `data-bubble-id` on in-scope roots
- IR hierarchy clearly wrong for in-scope ui_refs (not a minor polish delta)
- **Unnecessary adapter** (see `cursor-impl-cycle/docs/ADAPTER-POLICY.md`):
  - New/changed `adapter/` route that only proxies one Supabase edge function, RPC, or RLS REST call with user JWT
  - `frontend` requires `VITE_ADAPTER_URL` for an operation that could use direct Supabase client calls
  - Same item/module mixes direct Supabase client calls with redundant adapter passthrough for the same backend surface

When filing adapter blockers, cite the equivalent direct-client path the implementer should use instead.

**Do not** hide checklist failures inside `critiques[]`. Blockers stop the item; critiques are for judgment calls.

## Critiques (`critiques[]`)

After the audit, add **honest** challenges (see critic-mode snippet). Each critique:

```json
{
  "id": "C-1",
  "area": "ui-fidelity",
  "priority": "medium",
  "finding": "...",
  "alternative": "...",
  "evidence": ["path or bubble_id"]
}
```

`priority`: `low` | `medium` | `high` | `blocker_candidate`  
Use `blocker_candidate` when you nearly filed a blocker — triage will decide fix-now vs defer.

Minimum: **1 critique** if anything is imperfect; empty array only when IR + AC audit is genuinely clean.

## Scores (optional but recommended)

```json
"scores": { "completeness": 4, "grounding": 4, "actionability": 4 }
```

`grounding` must reflect IR re-read depth, not implementer's self-report.

Do not approve without reading actual code and IR slices.

<!-- critic-mode appended by brief.mjs -->
