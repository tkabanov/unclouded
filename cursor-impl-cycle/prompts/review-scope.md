# Review scope — module map (DrSam)

**Role:** Reviewer (generalPurpose — **do not** pass Task `readonly: true`; Ask mode blocks report writes)  
**Phase:** `scope`  
**Target:** `scope`

**Write scope:** persist **only** the report path below. Do **not** modify application source or `module-map.json`.

## Goal

Assess `cursor-impl-cycle/state/module-map.json`. Write **only**:

`cursor-impl-cycle/output/reports/scope-scope.review.json`

## Checklist

- **DrSam authenticated SPA scope only** — no public-only surfaces unless explicitly in scope
- Authenticated pages (`index`, `onboarding`, `reset_pw`, `dashboard`, `journal`, `paths`, `chat`, `settings`) and shared reusables represented
- No plans to modify `project/supabase` — modules should target `frontend/`, `supabase/`, and optional `adapter/`
- No duplicate module ids
- `estimated_size` plausible relative to `ir_roots` count and IR slice bulk (`entity_count`); decompose will choose item count freely — reviewer judges adequacy later
- Priorities: auth/shell/enums → design system → domain features
- `ok: true` only if readiness ≥ 85 and no blockers

<!-- critic-mode appended by brief.mjs -->
