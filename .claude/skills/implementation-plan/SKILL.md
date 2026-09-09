---
name: implementation-plan
description: >-
  Generates a wave-based step-by-step implementation plan markdown file for a
  described feature, formatted for AI coding agents. Invoke as
  `/implementation-plan <feature description>` (optionally with spec path, ticket
  ID, or output filename). Use when scoping a feature into agent-sized tasks before
  coding — not for writing application code or browser test plans.
disable-model-invocation: true
user-invocable: true
argument-hint: "[feature description, optional spec path or ticket]"
---

# Implementation plan generator (`/implementation-plan`)

You are authoring a **wave-based implementation plan** for AI coding agents:

> `$ARGUMENTS`

Output must be a markdown file in `docs/` that agents can execute task-by-task (one session per task). Reply in the project's reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user).

## Hard boundaries

- **Do not** implement code — only write the plan file.
- **Do not** commit unless the user explicitly asks.
- Before parity claims, read `docs/product-overrides.md` — overrides win over Bubble/Lovable/migration specs.
- Migrations / edge functions: plan as **write-only**; PM reviews before apply (see `.ai/PROJECT.md`).
- Respect architecture: UI → `frontend/src/lib/**` → Supabase; no direct queries in page components; no secrets in frontend.

## 1. Parse the request

From `$ARGUMENTS` extract:

| Field | Source |
|-------|--------|
| **Feature name** | User text → plan title |
| **Spec / requirements** | Explicit path, or search `docs/*-requirements.md`, PRD, user stories |
| **Ticket ID** | e.g. `NCLDD-31` — optional |
| **Output path** | User-provided, else `docs/<kebab-feature>-implementation-plan.md` (if `docs/<kebab>-agent-tasks.md` exists for same feature, update that file instead) |
| **Task prefix** | 2–6 uppercase letters + zero-padded number, e.g. `REF-01`, `BK-03`, `CBS-02` |

If ambiguous, ask **one** crisp question, then proceed with defaults.

## 2. Research (before writing tasks)

Read, in precedence order:

1. Explicit requirements doc
2. `docs/product-overrides.md` — every applicable `OVR-###`; flag conflicts needing Wave 0 lock
3. `.ai/PROJECT.md` — stack, boundaries, verification policy, mode defaults
4. Existing code: grep routes, components, `frontend/src/lib/<domain>/`, `supabase/migrations`, `supabase/functions`, seed scripts — note **reuse vs greenfield**
5. Existing implementation or agent-tasks file for this feature (extend, don't duplicate IDs)
6. Related test plan if any (`docs/*-test-plan.md`) — align final verification wave

Restate to the user: scope summary, task prefix, output path, wave count, and open decisions **before** writing the file.

## 3. Design the plan

Follow [references/template.md](references/template.md). Mandatory sections:

1. **Header** — source spec, status, audience, override conflicts
2. **How to use** — one agent session per task; parallel rules; read overrides first
3. **Dependency graph** — ASCII wave diagram
4. **Wave 0** (if needed) — product lock / open decisions / new OVR — **doc-only, blocking**
5. **Waves 1…N** — ordered tasks with clear `Depends on`
6. **Parallelism cheat sheet**
7. **Explicit non-goals**
8. **Traceability** — requirements § → task IDs
9. **Agent prompt template** — copy-paste block per task

### Task sizing (one agent session each)

| Good task size | Too large — split |
|---|---|
| One migration + types regen | Schema + all APIs + all UI |
| One admin screen or user flow | Entire "Admin bookings" domain |
| One edge function + caller hook | All email automations |
| Shared helper extracted once | "Implement Part A" without slices |

Prefer **vertical slices** when possible (schema slice → API → UI for one user journey) over horizontal layers-only plans — unless migrations must land first.

### Task format (agent-executable)

Each task **must** use this shape:

```markdown
### {PREFIX}-{NN} — {Short title}

| | |
|---|---|
| **Goal** | One sentence — done when … |
| **Mode** | `max` \| `ultracode` (ultracode for migrations, RLS, authz, first write paths) |
| **Depends on** | `{PREFIX}-00` or — |
| **Spec** | Requirements §…; OVR-### |
| **Likely touch** | Concrete paths: `frontend/src/lib/…`, `supabase/migrations/…`, components |

**Implement**

- Concrete, ordered bullets — files, functions, behaviors
- Name reuse targets (existing components, APIs, patterns)

**Acceptance**

- [ ] Verifiable checkbox — agent can self-check before finish
- [ ] …

**Out of scope**

- Explicit boundaries so agents don't expand
```

Rules:

- IDs: `{PREFIX}-{NN}` zero-padded (`01`, `02`, …); final task is often E2E / verification pass.
- **Wave 0** always `{PREFIX}-00` when open product decisions or override conflicts exist.
- **Implement**: actionable for an agent with no chat history — name paths, tables, routes, edge names.
- **Acceptance**: testable without browser unless E2E wave; prefer unit/gate checks + manual notes where E2E deferred.
- **Likely touch**: real paths from codebase research, not placeholders like `TBD`.
- Last wave: verification task linking `/test-plan` output or inline checklist; gates (`lint`, `test`, `build`, `typecheck` from `frontend/`).

### Mode guidance (from `.ai/PROJECT.md`)

| Mode | Use when |
|---|---|
| **ultracode** | Migrations, RLS, cross-user visibility, auth/security, first-of-a-kind writes |
| **max** | Zero-migration UI, refactor, copy, wiring existing APIs |

## 4. Coverage checklist

Before saving, verify:

- [ ] Wave 0 if any open decision or OVR conflict
- [ ] Migrations before APIs that depend on schema
- [ ] RLS / admin gates in same wave as mutations or immediately after
- [ ] No task mixes unrelated file ownership (parallel-safe waves documented)
- [ ] Non-goals list matches requirements out-of-scope
- [ ] Traceability table maps spec sections → tasks
- [ ] Agent prompt template references exact output file path
- [ ] Final task mentions `/test-plan` or existing test plan path

## 5. Save and hand off

1. Write (or update) the markdown file.
2. Report: path, task count, waves, blocking Wave 0 items, suggested first task ID.
3. Tell the user how agents should pick up work:

```text
Implement task {PREFIX}-01 from docs/<file>.md.
Read docs/product-overrides.md and {spec} first.
```

Optional follow-ups:

```text
/test-plan {feature} — after implementation waves
/test-list docs/<feature>-test-plan.md
```

## Example invocations

```text
/implementation-plan Coach selection in booking — docs/coach-booking-coach-selection-requirements.md

/implementation-plan NCLDD-31 internal bookings (remaining gaps)

/implementation-plan Referral Program — spec docs/referral-program-requirements.md

/implementation-plan Enterprise admin controls Part B — output docs/eac-part-b-implementation-plan.md
```

## Reference

- Output skeleton: [references/template.md](references/template.md)
- Canonical example: `docs/referral-program-agent-tasks.md`
- Related skills: `.claude/skills/test-plan/SKILL.md`, `.claude/skills/task/SKILL.md`, `.claude/skills/pm/SKILL.md`
- Project rules: `.ai/PROJECT.md`, `docs/product-overrides.md`
