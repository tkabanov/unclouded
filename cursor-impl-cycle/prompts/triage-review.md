# Triage review critiques

**Role:** Triage arbiter (generalPurpose — **do not** pass Task `readonly: true`; Ask mode blocks report writes)  
**Phase:** `{{phase}}`  
**Target:** `{{target_id}}`

**Write scope:** persist **only** the triage report path below (`brief.outputs`). Do **not** modify application source, review JSON, or any other files.

You receive a review (passed or failed gate). Your job: **for each critique**, decide criticality and whether to **fix now** (block advance) or **defer** (record and move on). For implement phase you must **re-read IR context** when judging ui-fidelity / integration critiques — do not rubber-stamp defer.

## Read (implement phase)

1. `cursor-impl-cycle/prompts/implementation-constraints.md`
2. `cursor-impl-cycle/prompts/ui-fidelity-rubric.md`
3. Review report: `cursor-impl-cycle/output/reports/{{phase}}-{{target_id}}.review.json`
4. Implement coverage: `cursor-impl-cycle/output/coverage/{{target_id}}.json` (if phase is implement)
5. Decompose item for `{{target_id}}` — scope boundaries, `depends_on`, downstream items
6. Changed source files cited in review `criteria_audit`, `ui_evidence`, critiques
7. Relevant `ir/slices/*` when disputing a ui-fidelity or hierarchy critique

## Write ONLY

`cursor-impl-cycle/output/reports/{{phase}}-{{target_id}}.triage.json`

```json
{
  "phase": "{{phase}}",
  "target_id": "{{target_id}}",
  "assessed_at": "<ISO8601>",
  "review_ref": "cursor-impl-cycle/output/reports/{{phase}}-{{target_id}}.review.json",
  "ok_to_advance": true,
  "rewrite_required": false,
  "decisions": [
    {
      "critique_id": "C-1",
      "severity": "defer",
      "resolution": "defer",
      "action_required": false,
      "rationale": "..."
    }
  ],
  "summary": "..."
}
```

If review has **no** critiques: `decisions: []`, `ok_to_advance` per review `ok`, `rewrite_required: false`.

## Decision framework (implement)

For **each** review `critiques[]` entry, pick `resolution`:

| resolution | when | severity | action_required | effect |
|------------|------|----------|-----------------|--------|
| `fix_now` | Violates AC/ui_ref, blocks downstream items in `depends_on`, or `priority: blocker_candidate` confirmed | `block` or `fix` | `true` | `rewrite_required: true` |
| `defer` | Valid gap but scoped to later item, polish, tests, a11y not in AC, cross-module wiring | `defer` | `false` | recorded backlog |
| `accept` | Reviewer wrong, already fixed in code, or out of scope per decompose `scope` | `accept` | `false` | no work |

### Fix now (`fix_now`) — prefer over defer when ANY applies

- Review `criteria_audit` or `ui_evidence` would be `fail`/`partial` if critique is correct
- Downstream item in decompose lists this item in `depends_on` **and** needs the missing behavior (e.g. composable must be mounted, shared primitive must be correct)
- Design-system primitive (`MOD-DRSAM-DESIGN-SYSTEM`) used by ready downstream implement items
- `area` is `ui-fidelity` and missing element is a **named ui_ref** (not optional HTML injector host)
- `priority` is `high` or `blocker_candidate` **and** your IR re-read confirms the finding
- `area` is `architecture` and critique is **unnecessary adapter passthrough** per `docs/ADAPTER-POLICY.md` — triage as `fix_now` (remove adapter / use direct Supabase) unless scope documents server secret or webhook

### Defer — only when ALL apply

- Decompose `scope` explicitly assigns work to a **later item id** (cite that id in rationale)
- Finding is tests, nice-to-have a11y, or Bubble workflow parity explicitly simplified in scope
- Missing behavior does not block items whose `depends_on` gate is already satisfiable

### Do not

- Mark every critique `defer` by default
- Defer ui-fidelity on a **named ui_ref** without checking IR slice
- Defer integration/orphan-composable if a downstream item in the same module needs it **now**

## Severity rules (all phases)

| severity | meaning | action_required |
|----------|---------|-----------------|
| `block` | Must fix before cycle advances | `true` |
| `fix` | Should rewrite before advance | usually `true` |
| `defer` | Record; advance OK | `false` |
| `accept` | Critique rejected or N/A | `false` |

**Decompose** item-split / under-decomposition: prefer `fix_now`, not defer.

**AC-quality** (over-spec, duplicate ACs): prefer `accept` or `defer` — never block.

## Output rules

- One `decisions[]` row per review `critiques[]` id (skip ids not in review)
- `rewrite_required: true` if any decision has `resolution: fix_now`, OR `severity: block`, OR (`severity: fix` AND `action_required: true`)
- `ok_to_advance: false` when `rewrite_required: true` OR review `ok: false`
- If review `ok: false` (coverage &lt; 90 or blockers): `rewrite_required: true`, `ok_to_advance: false` — cite failed AC/blockers in `summary`
- **Do not** modify review JSON or source code — triage only
- `summary` must count: `N fix_now, M defer, K accept` and name any deferred item ids for later waves
