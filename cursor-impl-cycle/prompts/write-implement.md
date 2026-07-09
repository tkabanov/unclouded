# Write implement — item coverage (DrSam brownfield)

**Role:** Implementer (`{{subagent_type}}`, **NOT readonly**)  
**Phase:** `implement`  
**Target item:** `{{target_id}}`  
**Module:** see `last-brief.json` → `current_module_id`

## Mandatory constraints

Read `cursor-impl-cycle/prompts/implementation-constraints.md` first.

Read `cursor-impl-cycle/prompts/brownfield-preflight.md` — **complete preflight before any edit**.

**FORBIDDEN:** any changes under `project/` (including `project/supabase/**`).

## Goal

Extend the existing React prototype in `frontend/` until acceptance criteria for `{{target_id}}` are met. Write coverage report.

## Read first

- `cursor-impl-cycle/output/decompose/<module-id>.json` — item `{{target_id}}`
- `cursor-impl-cycle/config/prototype-inventory.json` — what already exists
- `cursor-impl-cycle/config/path-conventions.json` — path mappings (Vue paths in decompose may be stale)
- `frontend/**` — **read existing code before editing** (pages, components, `App.tsx`, hooks, lib)
- `supabase/**` — read for edge function contracts used by the prototype
- `ir/slices/*` for module — element tree with `presentation`, `parent_element_id`, `element_type`
- `ir/slices/styles.json` — resolve `presentation.style_ref` on elements
- `drsam-99657.bubble` — fallback via `source_path` when IR presentation is incomplete
- `cursor-impl-cycle/prompts/ui-fidelity-rubric.md`

## Brownfield preflight (mandatory)

Before editing, complete the preflight in `brownfield-preflight.md`:

1. Map decompose `target_files[]` to real `.tsx` paths (prototype may use different names — see `path-conventions.json`)
2. Read all related existing files
3. Choose `reuse_decision`: `extend` | `gap-fill` | `new` | `skip`
4. Record findings in coverage `preflight` block

Do **not** create `provider-app/`, `.vue` files, or a parallel router.

## Implement

### Frontend (`frontend/`)

- React + TypeScript SPA: pages in `src/pages/`, components in `src/components/`, routes in `src/App.tsx`
- **Extend existing prototype** — match shadcn/ui, Tailwind, and `@/` import conventions
- **Mirror Bubble element hierarchy** from IR slices — same regions, nesting, and element types
- Apply `presentation` (layout, typography, colors, spacing) and linked styles from `styles.json`
- Add `data-bubble-id="<element_id>"` on root nodes per item AC / `ui_refs`
- Call Supabase via `@/integrations/supabase/client.ts` when existing APIs suffice

### Never

- Edit `project/**`
- Add Supabase migrations under `project/`
- Recreate flows that already work in the prototype unless AC requires structural change

## Write coverage report

`cursor-impl-cycle/output/coverage/{{target_id}}.json`:

```json
{
  "item_id": "{{target_id}}",
  "module_id": "MOD-...",
  "assessed_at": "<ISO8601>",
  "coverage_pct": 92,
  "preflight": {
    "existing_files_found": ["frontend/src/pages/Index.tsx"],
    "gaps": ["AC-1: missing data-bubble-id on hero"],
    "reuse_decision": "extend",
    "mapped_target_files": {
      "frontend/src/pages/IndexPage.vue": "frontend/src/pages/Index.tsx"
    }
  },
  "criteria": [
    { "id": "AC-1", "status": "pass", "evidence": ["frontend/src/pages/Index.tsx"] }
  ],
  "ui_evidence": [
    { "bubble_id": "bTGYf", "selector": "[data-bubble-id='bTGYf']", "status": "pass" }
  ],
  "files_changed": ["frontend/src/pages/Index.tsx"]
}
```

`files_changed` must only list paths under `allowed_write_paths` from the brief (`frontend/`, `cursor-impl-cycle/`).

Compute `coverage_pct` = round(100 * pass_count / applicable_criteria).

## Output paths

{{outputs}}
