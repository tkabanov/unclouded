# cursor-impl-cycle

Hook-driven cycle: **module map → decompose → implement** (coverage ≥ 90% per item).

IR must exist (`ir/inventory.json`). LLM writers/reviewers do all substantive work; scripts validate artifacts and drive the stop hook.

## Quick start

```bash
node cursor-impl-cycle/scripts/bootstrap.mjs
cd cursor-impl-cycle && npm install
```

Edit `cursor-impl-cycle/state/cycle.json`:

```json
{ "active": true, "phase": "scope", "gate_stage": "write" }
```

```bash
bash cursor-impl-cycle/install/install-hooks.sh
```

Activate `@cursor-impl-cycle` skill. Orchestrator delegates per hook `followup_message`.

## Phases

| Phase | Output |
|-------|--------|
| `scope` | `state/module-map.json` |
| `decompose` | `output/decompose/<MOD>.json` per module |
| `implement` | code + `output/coverage/<item>.json` per item |

## Gates

After each write: **script gate** → **reviewer (critic)** → **triage** → advance.

```
write → validate schema → review (+ critiques[]) → triage (severity) → next target
```

- Reviewer: checklist pass/fail + `critiques[]` with alternatives (`prompts/review-critic-mode.md`)
- Triage: maps each critique to `block|fix|defer|accept`; sets `rewrite_required` (`prompts/triage-review.md`)
- Disable triage: `"critique_triage_enabled": false` in `config/project.json` → review-only flow

Thresholds:

- Scope/decompose: `readiness_pct ≥ 85`
- Implement: `coverage_pct ≥ 90`

## Test

```bash
node cursor-impl-cycle/scripts/test-stop-hook.mjs
```
