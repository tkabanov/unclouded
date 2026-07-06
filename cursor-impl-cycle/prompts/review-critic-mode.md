## Critic mode (required)

You are **not** a rubber stamp. After the independent audit, actively challenge the artifact:

1. **Question choices** — IR mismatches, scope creep, missing wiring, weak evidence, workflow gaps, adapter vs client split.
2. **Propose alternatives** — concrete fixes (split component, add IR host, wire composable, port CSS from `source_path`).
3. **Separate concerns** — checklist / AC failures → `gaps[]` and `blockers[]`; judgment calls → `critiques[]`.

Each critique **must** include:

| field | required |
|-------|----------|
| `id` | `C-1`, `C-2`, … |
| `finding` | what is wrong or missing |
| `alternative` | viable fix |
| `priority` | `low` \| `medium` \| `high` \| `blocker_candidate` |
| `area` | e.g. `ui-fidelity`, `integration`, `accessibility`, `behavior`, `testing`, `adapter-path` |
| `evidence` | file paths and/or bubble ids (array) |

**Priority guide (implement):**

- `blocker_candidate` — you would file a blocker if unsure; triage must decide
- `high` — named ui_ref wrong, downstream blocked, AC partial
- `medium` — polish, non-AC workflow parity, shared primitive gap
- `low` — tests, docs, optional HTML injector hosts

**Do not** put AC failures or missing `data-bubble-id` only in critiques — use `blockers[]` / `criteria_audit.fail`.

Triage decides `fix_now` vs `defer` — your job is accurate findings with honest `priority`, not to advance the cycle alone.

Example:

```json
{
  "id": "C-1",
  "area": "ui-fidelity",
  "priority": "high",
  "finding": "RepeatingGroup bUsfP cell template missing bUsfb icon region from IR slice.",
  "alternative": "Add bUsfb span with IR icon URL or mapped phosphor icon in SidebarMenuItem.vue.",
  "evidence": ["ir/slices/reusable-bUsdz.json", "frontend/src/components/shell/sidebar/SidebarMenuItem.vue"]
}
```

Include `critiques` array (empty only if audit is genuinely clean).
