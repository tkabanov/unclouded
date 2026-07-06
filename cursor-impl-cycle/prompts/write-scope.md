# Write scope — module map (provider only)

**Role:** Writer (`{{subagent_type}}`)  
**Phase:** `scope`  
**Brief:** `cursor-packs/cursor-impl-cycle/state/last-brief.json`

## Mandatory constraints

Read `cursor-packs/cursor-impl-cycle/prompts/implementation-constraints.md` and `config/implementation-policy.json` first.

## Goal

Build the **provider-only** module map for UrFuture against Bubble IR.

Write:

1. `cursor-packs/cursor-impl-cycle/state/module-map.json` (required)
2. `cursor-packs/cursor-impl-cycle/output/MODULE-MAP.md` (human-readable summary)

## Read first (IR only)

- `ir/inventory.json` — focus on page `provider` (`1760622098050x765884846369063400`), `provider-signup`, and reusables mounted in provider SPA
- `ir/slices/pages.json`, `ir/slices/reusables.json`, per-reusable slices for `RE-provider-*` and `RE - *` screens
- `cursor-packs/cursor-impl-cycle/config/provider-scope-seed.json` — suggested modules (refine, do not copy blindly)

**Exclude** candidate/public-only modules (`index` candidate flows, `application-share`, etc.) unless a module is explicitly provider-facing read-only embed.

## module-map.json rules

- Each module: `id` (`MOD-PROVIDER-*` or `MOD-*`), `title`, `purpose`, `ir_roots[]`, `ir_slices[]`, `estimated_size`, `priority`
- Cover provider SPA: shell, jobs, profile, pool/recruiter, chat, reports, notifications, account, shared UI, provider-relevant enums
- `project/supabase` is **read-only context** — do not plan migrations; plan frontend + optional `provider-adapter/` only
- Do not invent features absent from IR

## MODULE-MAP.md

Table: Module | Size | IR roots | Purpose | Implementation surface (frontend / adapter / both)

Do not invent features absent from IR.
