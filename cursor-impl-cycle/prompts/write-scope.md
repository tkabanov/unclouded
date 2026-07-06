# Write scope — module map (DrSam authenticated SPA)

**Role:** Writer (`{{subagent_type}}`)  
**Phase:** `scope`  
**Brief:** `cursor-impl-cycle/state/last-brief.json`

## Mandatory constraints

Read `cursor-impl-cycle/prompts/implementation-constraints.md` and `config/implementation-policy.json` first.

## Goal

Build the **DrSam authenticated user SPA** module map against Bubble IR (`drsam-99657`).

Write:

1. `cursor-impl-cycle/state/module-map.json` (required)
2. `cursor-impl-cycle/output/MODULE-MAP.md` (human-readable summary)

## Read first (IR only)

- `ir/inventory.json` — focus on authenticated pages: `index`, `onboarding`, `reset_pw`, `dashboard`, `journal`, `paths`, `chat`, `settings`
- `ir/slices/*` — per-page and per-reusable slices for shell, auth, and feature modules
- `cursor-impl-cycle/config/drsam-scope-seed.json` — suggested modules (refine, do not copy blindly)

**Exclude** public-only surfaces (`404`, stub pages) unless explicitly in scope.

## module-map.json rules

- Each module: `id` (`MOD-DRSAM-*`), `title`, `purpose`, `ir_roots[]`, `ir_slices[]`, `estimated_size`, `priority`
- Cover authenticated SPA: auth/onboarding, shell, enums, design system, dashboard, journal, paths, chat, crisis, settings, API surface
- `project/supabase` is **read-only context** — do not plan migrations; plan frontend + optional `adapter/` only
- Do not invent features absent from IR

## MODULE-MAP.md

Table: Module | Size | IR roots | Purpose | Implementation surface (frontend / adapter / both)

Do not invent features absent from IR.
