# Review scope — module map (provider)

**Role:** Reviewer (generalPurpose, **readonly: true**)  
**Phase:** `scope`  
**Target:** `scope`

## Goal

Assess `cursor-packs/cursor-impl-cycle/state/module-map.json`. Write **only**:

`cursor-packs/cursor-impl-cycle/output/reports/scope-scope.review.json`

## Checklist

- **Provider scope only** — no candidate/public-only modules unless explicitly provider-facing embed
- Provider page `1760622098050x765884846369063400` and `RE-provider-*` reusables represented
- No plans to modify `project/supabase` — modules should target `provider-app/` and optional `provider-adapter/`
- No duplicate module ids
- `estimated_size` plausible relative to `ir_roots` count and IR slice bulk (`entity_count`); decompose will choose item count freely — reviewer judges adequacy later
- Priorities: auth/shell/enums → design system → domain features
- `ok: true` only if readiness ≥ 85 and no blockers

<!-- critic-mode appended by brief.mjs -->
