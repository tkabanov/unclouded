# Implementation plan template (for AI coding agents)

Copy this skeleton. Replace `{…}`. One **`###` task** = one agent session.

---

```markdown
# {Feature title} — Implementation Plan

| | |
|---|---|
| **Source** | [`docs/{requirements}.md`](./{requirements}.md) |
| **Status** | Ready for implementation waves |
| **Audience** | Coding agents |
| **Overrides** | {OVR-### list} — [`docs/product-overrides.md`](./product-overrides.md) |
| **Conflict** | {optional: override that must be resolved in Wave 0} |

**How to use**

1. Complete **Wave 0** (`{PREFIX}-00`) before schema/UI if listed.
2. Run tasks in parallel only when `Depends on` is satisfied and **Likely touch** paths do not overlap.
3. One task = one agent session: implement + verify **Acceptance**; do not expand into **Out of scope**.
4. Re-read `docs/product-overrides.md` before signup, billing, admin IA, or entitlement changes.
5. Migrations / edge deploy: **write only**; PM reviews before apply.

**Suggested agent entry**

```text
Implement task {PREFIX}-01 from docs/{kebab}-implementation-plan.md.
Source of truth: docs/{requirements}.md.
Read docs/product-overrides.md first.
Respect Depends on / Out of scope / Mode.
Verify Acceptance checklist before finishing.
Run gates from frontend/: lint, test, build, typecheck as applicable.
```

---

## Dependency graph (waves)

```text
Wave 0  {PREFIX}-00 (product lock)          ← skip if no open decisions
   │
Wave 1  {PREFIX}-01 (schema) ──► {PREFIX}-02 (APIs/RLS)
   │                                    │
Wave 2              ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
                 {PREFIX}-03        {PREFIX}-04        {PREFIX}-05
                    │                  │                  │
Wave N              └────────┬─────────┴────────┬─────────┘
                             ▼                  ▼
                          {PREFIX}-0N      {PREFIX}-0N+1 (verify)
```

---

## Wave 0 — Product lock (blocking)

> Omit entire Wave 0 if spec has no open decisions and no override conflicts.

### {PREFIX}-00 — Confirm open decisions + overrides

| | |
|---|---|
| **Goal** | Lock ambiguous spec defaults; record new OVR if needed |
| **Mode** | `max` |
| **Depends on** | — |
| **Spec** | Requirements §…; OVR-### |
| **Likely touch** | `docs/product-overrides.md`, this file only |

**Confirm (record in table or product-overrides):**

| Topic | Spec default | Locked decision |
|---|---|---|
| … | … | **Locked:** … |

**Deliverables**

- [ ] Open questions answered.
- [ ] New `OVR-###` appended if behavior contradicts existing override.
- [ ] Agents may proceed to Wave 1.

**Out of scope:** Any application code.

---

## Wave 1 — {Layer name, e.g. Data foundation}

### {PREFIX}-01 — {Title}

| | |
|---|---|
| **Goal** | … |
| **Mode** | `ultracode` |
| **Depends on** | {PREFIX}-00 |
| **Spec** | §… |
| **Likely touch** | `supabase/migrations/…`, `frontend/src/integrations/supabase/types.ts` (regen) |

**Implement**

- …
- Reuse: `{existing module}` if applicable

**Acceptance**

- [ ] …
- [ ] Migration applies cleanly (PM review pending — do not apply in agent session unless user asks)

**Out of scope**

- …

---

## Wave N — Verification

### {PREFIX}-0N — E2E acceptance + readiness

| | |
|---|---|
| **Goal** | Prove critical journeys; gates green |
| **Mode** | `max` |
| **Depends on** | all feature tasks |
| **Spec** | §… E2E / DoD |
| **Likely touch** | test notes only; optional `docs/{kebab}-test-plan.md` |

**Verify**

- [ ] …
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck` pass in `frontend/` (as applicable)

**Deliverables**

- [ ] Test notes or link to `/test-plan` output
- [ ] Gaps filed as follow-ups — no silent scope creep

**Out of scope**

- …

---

## Parallelism cheat sheet

| Wave | Can run in parallel | Shared caution |
|---|---|---|
| 0 | — | Blocking |
| 1 | Sequential {PREFIX}-01 → {PREFIX}-02 | Migrations first |
| 2 | {PREFIX}-03 ‖ {PREFIX}-04 if no shared files | … |
| N | {PREFIX}-0N alone | — |

---

## Explicit non-goals (all agents)

Do **not** build unless separately scoped:

- …

---

## Traceability (requirements § → tasks)

| Requirements | Tasks |
|---|---|
| §… | {PREFIX}-01, {PREFIX}-02 |
| §… E2E | {PREFIX}-0N |

---

## Agent prompt template (copy per task)

```text
Implement task {PREFIX}-{NN} from docs/{kebab}-implementation-plan.md.
Source of truth: docs/{requirements}.md.
Read docs/product-overrides.md first (esp. {OVR-###}).
Respect Depends on / Out of scope / Mode ({max|ultracode}).
Architecture: UI → frontend/src/lib → Supabase; no service_role in frontend.
Verify the task Acceptance checklist before finishing.
Do not apply migrations or deploy edges unless the user explicitly asks.
```
```

---

## Task design rules

### Dependency order (typical)

1. Product lock (Wave 0)
2. Schema / migrations
3. RLS + server APIs / edge functions
4. `frontend/src/lib/<domain>/` hooks + services
5. UI components / pages / admin tabs
6. Cross-cutting (emails, cron, seeds)
7. E2E verification + `/test-plan`

### Acceptance criteria quality

| Good | Bad |
|---|---|
| "Non-admin GET `/admin/foo` returns 403" | "Security works" |
| "Duplicate email shows inline error on save" | "Validation implemented" |
| "`referralPartnersApi.create` rejects duplicate code" | "API done" |

### Likely touch — prefer concrete paths

```markdown
| **Likely touch** | `frontend/src/lib/coachBooking/coachBookingApi.ts`, `OneOnOneBookingPanel.tsx`, `supabase/functions/finalize-coach-booking/` |
```

### Pair with test plan

After implementation waves, user may run:

```text
/test-plan {feature description}
/test-list docs/{kebab}-test-plan.md
```

Reference the test plan path in the final verification task when known or expected.

## Anti-patterns

- ❌ Monolithic "Implement entire feature" task
- ❌ Tasks without `Depends on` when order matters
- ❌ Missing **Out of scope** (agents will build payouts, Stripe Connect, etc.)
- ❌ Vague **Likely touch** — agents grep blindly and collide
- ❌ Applying migrations in plan text without PM-review note
- ❌ Skipping Mode — security slices need `ultracode`
