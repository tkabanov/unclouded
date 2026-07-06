# Functional review rubric (mandatory for implement review)

Use **together with** `review-implement.md`. IR marker coverage alone is **not sufficient** to pass an item.

## Core rule

`ok: true` requires **both**:

1. **IR/UI audit** — `coverage_pct ≥ 90` per decompose AC (markers, hierarchy, copy).
2. **Functional audit** — every row in `functional_verification[]` for this item (from decompose or `state/wave-2-manifest.json`) is `pass`.

If implement code contains placeholder copy (`content mounts in downstream`, `Alternate applicant view mounts here`, `Coming Soon` for in-scope feature, or `mailto:` where AC expects API), file a **blocker** even when `data-bubble-id` markers exist.

## Functional verification statuses

| Status | Meaning |
|--------|---------|
| `pass` | User can complete the business outcome end-to-end in the running app |
| `partial` | UI exists but data/side-effect incomplete; counts as **fail** for `ok` |
| `fail` | Missing, stub, or wrong behavior |

## Mandatory checks by pattern

### Wizard / multi-step screens

- Every step in decompose `scope` renders **real fields or lists**, not placeholder paragraphs.
- Next/Save persists or validates per AC; navigation between steps works.

### Popups with external actions

- Primary CTA performs documented API/edge/adapter call or in-app navigation — not dead button, not unregistered handler.
- `Upgrade` / `Purchase credits` must invoke `setSubscriptionUpgradeHandler` or documented billing route — not only `window.open` without handler when AC says in-app handoff.

### View mode toggles

- Each mode in AC (e.g. kanban vs pipeline) renders a **distinct implemented layout** with data — not placeholder text.

### Auth

- OAuth: if AC includes provider login, `signInWithOAuth` (or equivalent) must be wired from UI.
- Book demo: if AC includes form submit, must call backend — `mailto:` alone is **fail**.

### Data-dependent screens

- Reports/dashboard jobs: verify behavior when adapter URL is set; empty shell without configured backend is **partial** at best.

## Review JSON extension

Add to implement review output:

```json
{
  "functional_audit": [
    {
      "id": "FV-1",
      "check": "Edit profile Stories tab shows CRUD UI, not placeholder",
      "status": "pass",
      "evidence": ["provider-app/src/components/profile/steps/EditProfileStoriesStep.vue"]
    }
  ],
  "functional_ok": true
}
```

Set `functional_ok: false` if any `functional_audit` row is `fail` or `partial`.  
Set top-level `ok: false` when `functional_ok` is false, regardless of `coverage_pct`.

## Wave-2 reopen items

For items listed in `state/wave-2-manifest.json` → `reopen[]`, read the manifest `reviewer_checks[]` and verify each one explicitly in `functional_audit`.
