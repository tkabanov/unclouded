# cursor-impl-cycle orchestrator

You run the **scope → decompose → implement** cycle for **DrSam authenticated user SPA only**.

Read `cursor-impl-cycle/prompts/implementation-constraints.md` before every delegation.

**Hard rules:** never modify `project/`; write frontend to `frontend/`, prototype Supabase to `supabase/`, optional Fastify adapter to `adapter/`.

## Each turn

1. Read `cursor-impl-cycle/state/cycle.json` and hook `followup_message`.
2. Read `cursor-impl-cycle/state/last-brief.json`.
3. **Delegate** write/implement/review/triage work to Task subagents — never write review or triage JSON inline.
4. After subagent completes, verify output files from `brief.outputs` exist.
5. End turn so the stop hook runs.

## Parallel wave mode (`parallel.enabled: true`)

When `decompose`/`implement` run in parallel, `state/last-brief.json` is a **wave manifest**:

```jsonc
{ "wave": true, "phase": "decompose", "max_parallel": 6, "dispatches": [ { "role", "target_id", "brief_path", "template", "outputs", "subagent_type", "model", "readonly", "reason" } ] }
```

Each turn in wave mode:

1. Read the manifest and the `followup_message` (it restates the tasks).
2. For **each** dispatch, read its `brief_path` JSON + `template`, then launch one Task subagent with `subagent_type` and `model` from the dispatch (`model: null` → omit Task `model` param for auto/router). Pass `readonly: true` **only** when the dispatch explicitly sets `readonly: true` (normally omit it — Ask mode blocks report writes).
3. **Launch all dispatches in a SINGLE message as parallel Task subagents**, then wait for ALL to finish before ending your turn.
4. Verify each dispatch's `outputs` exist, then end turn so the stop hook plans the next wave.

- Review/triage dispatches use `readonly: false` (or omit `readonly`). Subagents write **only** report JSON under `outputs`; they must not edit application source.
- For `implement` with `write_strategy: "worktree"` and ≥2 writers: create a git worktree + branch per writer, run each there, then merge branches sequentially (fix subagent on conflict) before ending the turn. With `write_strategy: "serial"` (default) the hook caps writers to 1 per wave, so no worktree/merge is needed.

## Phases

| Phase | Writer | Reviewer output | Triage output |
|-------|--------|-----------------|---------------|
| `scope` | `state/module-map.json` + optional `output/MODULE-MAP.md` | `output/reports/scope-scope.review.json` | `output/reports/scope-scope.triage.json` |
| `decompose` | `output/decompose/<module-id>.json` | `output/reports/decompose-<module-id>.review.json` | `output/reports/decompose-<module-id>.triage.json` |
| `implement` | code changes + `output/coverage/<item-id>.json` | `output/reports/implement-<item-id>.review.json` | `output/reports/implement-<item-id>.triage.json` |

## Gate stages

```
write → script gate → review (critic) → triage (arbitrate critiques) → advance
```

| `gate_stage` | Delegate |
|--------------|----------|
| `write` | writer or implementer |
| `review` | reviewer (source read-only; writes report JSON only) — includes critic mode + `critiques[]` |
| `triage` | triage arbiter (source read-only; writes report JSON only) — decides severity and `rewrite_required` |

## Mutex

Only one active orchestrator. Deactivate `cursor-mcp-designer` (and any other hook-driven pack) before starting.
