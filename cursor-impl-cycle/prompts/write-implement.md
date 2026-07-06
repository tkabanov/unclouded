# Write implement — item coverage (provider)

**Role:** Implementer (`{{subagent_type}}`, **NOT readonly**)  
**Phase:** `implement`  
**Target item:** `{{target_id}}`  
**Module:** see `last-brief.json` → `current_module_id`

## Mandatory constraints

Read `cursor-packs/cursor-impl-cycle/prompts/implementation-constraints.md` first.

**FORBIDDEN:** any changes under `project/` (including `project/supabase/**`).

## Goal

Implement the current provider work item until acceptance criteria are met. Write coverage report.

## Read first

- `cursor-packs/cursor-impl-cycle/output/decompose/<module-id>.json` — item `{{target_id}}`
- `provider-app/**` — frontend (create if missing)
- `provider-adapter/**` — Fastify thin layer only when decompose item requires `adapter` surface
- `project/supabase/**` — **read only** for schema, RPC, RLS, edge function contracts
- `ir/slices/*` for module — element tree with `presentation`, `parent_element_id`, `element_type`
- `ir/slices/styles.json` — resolve `presentation.style_ref` on elements
- `source/app.bubble` — fallback via `source_path` when IR presentation is incomplete
- `cursor-packs/cursor-impl-cycle/prompts/ui-fidelity-rubric.md`

## Implement

### Frontend (`provider-app/`)

- Vue SPA for provider portal: views, composables, stores, router
- **Mirror Bubble element hierarchy** from IR slices — same regions, nesting, and element types
- Apply `presentation` (layout, typography, colors, spacing) and linked styles from `styles.json`
- Map Bubble design tokens (`var(--color_*)`, SF Pro Display, etc.) to `provider-app` CSS variables
- Add `data-bubble-id="<element_id>"` on root nodes per item AC / `ui_refs`
- Call Supabase directly when existing APIs suffice (infer client patterns from `project/` read-only)
- Match TypeScript/Vue conventions established in new code

### Adapter (`provider-adapter/`) — only when needed

Read `cursor-packs/cursor-impl-cycle/docs/ADAPTER-POLICY.md` **before** adding any adapter route.

- **Default:** implement data calls in `provider-app/src/api/**` using `getSupabaseClient()`, `supabase.rpc()`, or `fetch` to `${VITE_SUPABASE_URL}/functions/v1/<name>` with user JWT (mirror `jobMutationsApi.ts`, `viewJobApplicantActionsApi.ts`).
- **Adapter only when:** server secret, webhook, or documented multi-step orchestration not suitable for the browser.
- **Never add** a passthrough route for a single edge function / RPC / RLS table that the SPA can call directly.
- Do **not** duplicate schema or business rules already in Supabase.

If decompose scope says `frontend+adapter` but no allowed reason applies, implement **frontend-only** and note in coverage `criteria` gap — do not create adapter proxy "for parity".

### Never

- Edit `project/**`
- Add Supabase migrations or change RLS
- Implement candidate/public apps outside provider scope

## Write coverage report

`cursor-packs/cursor-impl-cycle/output/coverage/{{target_id}}.json`:

```json
{
  "item_id": "{{target_id}}",
  "module_id": "MOD-...",
  "assessed_at": "<ISO8601>",
  "coverage_pct": 92,
  "criteria": [
    { "id": "AC-1", "status": "pass", "evidence": ["provider-app/src/..."] }
  ],
  "ui_evidence": [
    { "bubble_id": "1760...", "vue_selector": "[data-bubble-id='1760...']", "status": "pass" }
  ],
  "files_changed": ["provider-app/src/..."]
}
```

`files_changed` must only list paths under `provider-app/`, `provider-adapter/`, or `cursor-packs/cursor-impl-cycle/`.

Compute `coverage_pct` = round(100 * pass_count / applicable_criteria).

## Output paths

{{outputs}}
