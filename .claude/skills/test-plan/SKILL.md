---
name: test-plan
description: >-
  Generates a browser-acceptance test plan markdown file for a described feature,
  formatted for `/test-list` and `/test`. Invoke as `/test-plan <feature description>`
  (optionally with spec path, ticket ID, or output filename). Use when the user wants
  a QA checklist before manual E2E runs — not Vitest unit tests or CI Playwright suites.
disable-model-invocation: true
user-invocable: true
argument-hint: "[feature description, optional spec path or ticket]"
---

# Test plan generator (`/test-plan`)

You are authoring a **browser acceptance test plan** for:

> `$ARGUMENTS`

Output must be a markdown file in `docs/` that `/test-list` can iterate and `/test` can run item-by-item. Reply in the project's reply language (see `.ai/PROJECT.md`; Unclouded = Russian to the user).

## Hard boundaries

- **Do not** run browser tests — only write the plan file.
- **Do not** edit application code, migrations, or commit unless the user explicitly asks.
- Before parity claims, read `docs/product-overrides.md` — overrides win over Bubble/Lovable/migration specs.
- Do **not** add `— TESTED` markers to new scenarios (only `/test-list` adds those on PASS).

## 1. Parse the request

From `$ARGUMENTS` extract:

| Field | Source |
|-------|--------|
| **Feature name** | User text; derive a short title for the plan heading |
| **Spec / requirements** | Explicit path in args, or search `docs/` for matching `*-requirements.md`, PRD, user story |
| **Ticket ID** | e.g. `NCLDD-31`, `REF-00` — optional |
| **Output path** | User-provided, else `docs/<kebab-feature>-test-plan.md` (check for existing file — update in place if same feature) |
| **Scenario prefix** | 2–6 uppercase letters from feature/ticket, e.g. `BK`, `REF`, `EAC-A`, `AIP` — unique within the file |

If the feature is ambiguous, ask **one** crisp question, then proceed with best-effort defaults.

## 2. Research (before writing scenarios)

Read, in precedence order:

1. Explicit spec / requirements doc from `$ARGUMENTS` or `docs/`
2. `docs/product-overrides.md` — list every applicable `OVR-###` in the plan header
3. Related agent-tasks / verification notes in `docs/` if present
4. Code map: routes, admin tabs, API modules, edge functions, migrations, seed scripts — grep `frontend/src`, `supabase/functions`, `supabase/migrations`, `scripts/seed*.mjs`
5. Existing test plan for the same feature (extend, do not duplicate IDs)

Restate to the user: feature scope, prefix, output path, override count, and planned scenario count **before** writing the file.

## 3. Write the plan file

Follow the structure in [references/template.md](references/template.md). Mandatory sections:

1. **Header** — title, spec link, overrides, code map table, optional Jira/tasks links
2. **How to run** — exact `/test-list docs/…-test-plan.md` and `/test <ID>` lines; actors; seed/deploy notes
3. **§1 Goals & scope** — goals, in/out table, source precedence, locked decisions table
4. **§2 Environment** — components, test actors (emails/passwords from `/test` defaults where applicable), minimum seed data
5. **§3 Run order** — phased table with time estimates + smoke subset IDs
6. **§4+ Scenarios** — grouped by area; **only leaf `###` headings are testable items**

### Scenario format (`/test-list` + `/test` compatible)

Each testable scenario **must** use this exact shape:

```markdown
### {PREFIX}-{AREA}-{NNN} — {Краткое название}

| | |
|---|---|
| **Preconditions** | … |
| **Steps** | … |
| **Expected** | … |
```

Rules:

- Heading level **`###`** only for runnable scenarios (never `####` for leaves).
- ID pattern: `{PREFIX}-{AREA}-{NNN}` — zero-padded 3 digits; AREA = 2–8 chars (`ACCESS`, `UI`, `SPEC`, `E2E`, …).
- Parent **`## N. Area`** sections group scenarios; do not put Preconditions/Steps/Expected on parent headings when children exist.
- Steps: ordered, browser-actionable (navigate, login as X, click, fill, wait, assert).
- Expected: observable UI/network/DB outcomes — what `/test` can verify in the Browser pane.
- Preconditions: actor + tier + seed state; reuse `/test` default QA users when possible (`sub-free@test.com`, `sub-pro@test.com`, `sub-premium@test.com`, `admin-qa@test.com`, `code2@test.com` … — password `qwerty123`).
- Cover: happy path, validation/blockers, access control negatives, edge cases from locked decisions, one E2E smoke per critical journey.
- Optional trailing sections (unit tests, content QA, cron/time-based notes) are **not** `/test-list` items unless each has its own `###` ID block.

### Coverage checklist

Before saving, verify the plan includes:

- [ ] Access / role negatives (non-admin, wrong tier)
- [ ] UI inventory for main entry screens
- [ ] CRUD or primary mutation happy paths
- [ ] Validation / error surfacing
- [ ] Override-specific behavior called out in Expected
- [ ] At least one end-to-end journey (`*-E2E-001`)
- [ ] Smoke subset listed in §3 (5–10 IDs)
- [ ] "How to run" references the **exact** output file path

## 4. Save and hand off

1. Write (or update) the markdown file at the resolved path.
2. Report: path, prefix, scenario count, smoke IDs, and any BLOCKED prerequisites (migrations, seeds, external services).
3. Tell the user:

```text
/test-list docs/<file>.md
/test <PREFIX>-…-001
```

## Example invocations

```text
/test-plan Referral Program — spec docs/referral-program-requirements.md

/test-plan NCLDD-31 internal bookings management

/test-plan Coach selection in booking flow — docs/coach-booking-coach-selection-requirements.md

/test-plan Enterprise admin controls Part A — output docs/enterprise-admin-controls-test-plan.md
```

## Reference

- Output skeleton and examples: [references/template.md](references/template.md)
- Plan consumers: `.claude/skills/test-list/SKILL.md`, `.claude/skills/test/SKILL.md`
- Existing examples: `docs/referral-program-test-plan.md`, `docs/NCLDD-31-internal-bookings-test-plan.md`, `docs/enterprise-admin-controls-test-plan.md`
