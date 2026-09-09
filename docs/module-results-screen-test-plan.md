# Deep-Dive Module Results Screen — Test Plan

| | |
|---|---|
| **Spec** | [`docs/module-results-screen-implementation-plan.md`](./module-results-screen-implementation-plan.md) |
| **Overrides** | OVR-065 (results screen replaces completion screen, all 8 MRS-00 decisions locked), OVR-009 (all 6 modules Free tier, no module-side tier gate), OVR-033 (module list lives in Settings → Profile, no separate "Coaching Insights" heading on the list itself), OVR-050 (Settings → Profile page chrome, unrelated to grid) — [`docs/product-overrides.md`](./product-overrides.md) |
| **Code map** | `frontend/src/components/modules/ModuleResultsScreen.tsx`, `frontend/src/pages/ModuleWizard.tsx`, `frontend/src/pages/ModuleResultsPage.tsx`, `frontend/src/lib/modules/results/{resolveModuleResults,moduleResultsContent,moduleUnlockedPaths}.ts`, `frontend/src/components/settings/knowYourself/ModuleListCard.tsx`, `frontend/src/lib/router/authenticatedRoutes.tsx` |

## How to run

```text
/test-list docs/module-results-screen-test-plan.md
/test MRS-FIN-001
```

- **Actor:** `code2@test.com` / `qwerty123` — seeded with `moduleSchedules` where **Financial Reality** unlocks at day 0 (immediately `available`); other modules unlock later (`body` day 3, `identity`/`relational` day 7, `history` day 14, `meaning` day 28) and will show as `locked` unless the DB is edited to move `scheduledAt` into the past.
- To test a **second** module (e.g. History, or a completed/refresh state), either wait out the schedule or directly update that user's `profiles.moduleSchedules.<slug>.scheduledAt` to a past timestamp before the run — call this out as a precondition per scenario.
- No migrations expected; do not seed new columns.

## 1. Goals & scope

**Goals:** verify the qualitative results screen (no numeric score, ever) renders after any module completion/refresh, the unlocked-paths block behaves per OVR-009 tier labeling, History gets the softened variant with `CrisisBar`, and the read-only Review route never writes.

| In scope | Out of scope |
|---|---|
| Results screen content, CTA, loading state | Editing stored answers from Review |
| Unlocked-paths block presence/labeling | Path enrollment flow |
| History variant suppression + CrisisBar | Dashboard/module-list card layout (OVR-050) |
| Review route guard + no-write | PDF export, tier upsell flows |
| Submit failure / fetch failure degrade paths | Numeric-score fields' underlying persistence logic |

**Locked decisions in scope for verification** (from MRS-00, mirrored in OVR-065):

| # | Decision | What to check |
|---|---|---|
| 2 | Qualitative only | No digit from `identityRoleFusionScore` anywhere on screen |
| 4 | Unlocked paths shown to all tiers, "Available on Pro" label | MRS-UNLOCK-* |
| 5 | Refresh lands on results screen | MRS-FIN-003 |
| 6 | Secondary CTA = "Back to profile" only | present on every happy-path scenario |
| 7 | Review in scope | MRS-REVIEW-* |
| 8 | History: softened, no unlocks, `CrisisBar` present | MRS-HIST-* |

## 2. Environment

- **Actor:** `code2@test.com` / `qwerty123` (Free tier, `financial` module available at seed time).
- Minimum seed: run `scripts/seed_code_test_users.mjs` (requires `SUPABASE_SERVICE_ROLE_KEY`) if `code2@test.com` does not already exist or its module schedule has been consumed by a prior test run.
- A module can only be completed once per seed cycle — re-running the same scenario against an already-`completed` module will hit the "already completed" redirect (MRS-GUARD-001), not the happy path. Re-seed or use a fresh module slug between full runs of MRS-FIN-001 → MRS-FIN-003.

## 3. Run order

| Phase | IDs | Est. |
|---|---|---|
| 1. Happy path completion | MRS-FIN-001, MRS-FIN-002 | 10m |
| 2. Loading / failure states | MRS-FIN-004, MRS-FIN-005, MRS-FIN-006 | 10m |
| 3. Unlocked paths | MRS-UNLOCK-001, MRS-UNLOCK-002, MRS-UNLOCK-003 | 10m |
| 4. History variant | MRS-HIST-001, MRS-HIST-002, MRS-HIST-003 | 10m |
| 5. Refresh flow | MRS-FIN-003 | 5m |
| 6. Review route | MRS-REVIEW-001 … MRS-REVIEW-004 | 15m |
| 7. Guards / negatives | MRS-GUARD-001, MRS-GUARD-002 | 10m |
| 8. List card CTAs | MRS-LIST-001, MRS-LIST-002, MRS-LIST-003 | 10m |
| 9. E2E smoke | MRS-E2E-001 | 5m |

**Smoke subset:** `MRS-FIN-001`, `MRS-UNLOCK-001`, `MRS-HIST-001`, `MRS-REVIEW-001`, `MRS-GUARD-001`, `MRS-E2E-001`

## 4. Happy path — module completion (Financial Reality)

### MRS-FIN-001 — Completing an available module renders the results screen, not the old completion screen — TESTED

| | |
|---|---|
| **Preconditions** | `code2@test.com` logged in; Financial Reality module status = `available` (fresh seed) |
| **Steps** | 1. Navigate to `/settings?tab=profile`. 2. Locate the Financial Reality module card, click **Start**. 3. Answer all questions through the wizard, submit the final step. |
| **Expected** | Screen shows a confirmation heading + lead paragraph (from `resolveModuleResults`), not a generic "answers have been saved" message. No `<h1>`/heading text contains a digit sourced from a 1–5 scale answer. CTA reads **"Back to profile"**. |

### MRS-FIN-002 — Reflections match the answers actually selected — TESTED

| | |
|---|---|
| **Preconditions** | Same as MRS-FIN-001, module not yet completed |
| **Steps** | 1. Start Financial Reality module. 2. For question `fq1` (`financialStabilitySignal`), select the option labeled "Stable — income covers needs with some margin and I'm not worried" (`stable`). 3. Complete remaining questions with any answers. 4. Submit. |
| **Expected** | The results screen's "What came through" list contains the reflection sentence mapped to `stable` for `financialStabilitySignal` (not a sentence for any other option of that field). Reflections render in question declaration order. |

### MRS-FIN-003 — Refresh submit lands on the same results screen — TESTED

| | |
|---|---|
| **Preconditions** | Financial Reality module status = `refresh_available` (module previously completed, refresh offered — either via seed or by completing MRS-FIN-001 first and then triggering **Refresh** from the module list) |
| **Steps** | 1. From `/settings?tab=profile`, click **Refresh** on the Financial Reality card. 2. Re-answer the wizard questions. 3. Submit. |
| **Expected** | Per MRS-00 decision 5, submit lands on the qualitative results screen (same as initial completion), not a plain toast-only confirmation. |

### MRS-FIN-004 — Loading state while submitting — TESTED

| | |
|---|---|
| **Preconditions** | Module in progress, on the final question |
| **Steps** | 1. Submit the final answer. 2. Immediately observe the screen before the network round-trip resolves (throttle network if needed). |
| **Expected** | CTA button shows **"Saving…"** and is disabled; content area shows a loading/skeleton state (`aria-busy="true"`), not empty or flashing partial content. |

### MRS-FIN-005 — Unlocked-paths fetch failure degrades silently — TESTED

| | |
|---|---|
| **Preconditions** | Module in progress, dev tools available to block/fail the path-catalog network request |
| **Steps** | 1. Block the path-catalog request (e.g. via devtools network throttling/blocking for that endpoint). 2. Submit the final module answer. |
| **Expected** | Results screen still renders fully (headline, reflections, CTA). No error toast appears. "Newly unlocked paths" block is simply absent. |

### MRS-FIN-006 — Submit failure returns to the last question — TESTED

| | |
|---|---|
| **Preconditions** | Module in progress, on the final question; network blocked for the module-submit request only |
| **Steps** | 1. Block the submit-answers network call. 2. Submit the final question. |
| **Expected** | Error toast **"Could not save your answers. Please try again."** appears. User is returned to the last question (not the results screen), answers are not lost. |

## 5. Unlocked paths block

### MRS-UNLOCK-001 — Newly unlocked path appears with no upgrade label for an in-tier user

| | |
|---|---|
| **Preconditions** | Free-tier user completing a module whose completion satisfies a Free-tier path's prerequisites (verify via `pathModulePrerequisites` catalog which path gates on the module under test) |
| **Steps** | 1. Complete the gating module. |
| **Expected** | "Newly unlocked paths" card is present, lists the path by name, no "Available on Pro" badge next to it. |

### MRS-UNLOCK-002 — Newly unlocked Pro-tier path shows "Available on Pro" label (not hidden) — TESTED

| | |
|---|---|
| **Preconditions** | Free-tier user completing a module that gates a Pro-tier path |
| **Steps** | 1. Complete the gating module as a Free-tier user. |
| **Expected** | Per OVR-009, the path is still shown (not filtered out) with a pill badge reading exactly **"Available on Pro"**. |

### MRS-UNLOCK-003 — No block rendered when nothing newly unlocked — TESTED

| | |
|---|---|
| **Preconditions** | Complete a module that gates no path, or whose gated paths' prerequisites are already otherwise satisfied |
| **Steps** | 1. Complete the module. |
| **Expected** | "Newly unlocked paths" heading is entirely absent from the DOM (not an empty container). |

## 6. History & Context module variant

### MRS-HIST-001 — History results: no achievement framing, no unlocks — TESTED

| | |
|---|---|
| **Preconditions** | `history` module status = `available` (seed edit `scheduledAt` to past, or wait) |
| **Steps** | 1. Complete the History & Context module. |
| **Expected** | Results screen shows reflections only. "What this unlocks" bullets are absent. "Newly unlocked paths" block is absent, even if the module would otherwise gate a path. |

### MRS-HIST-002 — CrisisBar present on History results step — TESTED

| | |
|---|---|
| **Preconditions** | Same as MRS-HIST-001 |
| **Steps** | 1. Reach the History results screen (post-submit). |
| **Expected** | `CrisisBar` text (e.g. "In a crisis? Call…") is visible on the results step, same as every other wizard step. |

### MRS-HIST-003 — No trauma/grief answer surfaced as a label, level, or score — TESTED

| | |
|---|---|
| **Preconditions** | Same as MRS-HIST-001; select an answer for a trauma/grief-related question (e.g. `traumaActivationLevel`) |
| **Steps** | 1. Answer the trauma/grief question with a specific option. 2. Submit. |
| **Expected** | The resulting reflection is a plain qualitative sentence — no raw field name, numeric level, or diagnostic-sounding label (e.g. no "Trauma level: 4" or "Grief load: high" style string) is rendered. |

## 7. Review entry point (read-only)

### MRS-REVIEW-001 — Completed module card shows a Review CTA — TESTED

| | |
|---|---|
| **Preconditions** | A module with status = `completed` (e.g. Financial Reality after MRS-FIN-001) |
| **Steps** | 1. Navigate to `/settings?tab=profile`. |
| **Expected** | The module card shows a **Review** link alongside the "Completed" badge and **Refresh** button, pointing to `/settings/know-yourself/<slug>/results`. |

### MRS-REVIEW-002 — Review route renders stored results with zero writes — TESTED

| | |
|---|---|
| **Preconditions** | Same module completed as MRS-REVIEW-001 |
| **Steps** | 1. Click **Review**. 2. Open the browser network tab before/while the page loads. |
| **Expected** | Page renders the same reflection sentences the user saw at completion (`resolveModuleResults` from stored profile). No `PATCH`/write request to `profiles` or `completeModule`-equivalent endpoint fires. `submitting` never shows a loading skeleton (renders immediately as `submitting={false}`). No unlocked-paths block appears (hardcoded empty on this route). |

### MRS-REVIEW-003 — Visiting Review for a locked module redirects — TESTED

| | |
|---|---|
| **Preconditions** | A module with status = `locked` for this user |
| **Steps** | 1. Directly navigate to `/settings/know-yourself/<locked-slug>/results`. |
| **Expected** | Toast **"Complete this module first to review its results."** appears; redirected (replace) to `/settings?tab=profile`. |

### MRS-REVIEW-004 — Visiting Review for an available (not-yet-taken) module redirects, not an empty screen — TESTED

| | |
|---|---|
| **Preconditions** | A module with status = `available` (not started) |
| **Steps** | 1. Directly navigate to `/settings/know-yourself/<available-slug>/results`. |
| **Expected** | Same redirect + toast as MRS-REVIEW-003 — no blank/empty results screen is shown. |

## 8. Wizard guards (existing behavior, must remain unchanged)

### MRS-GUARD-001 — Re-visiting a completed module's wizard route redirects — TESTED

| | |
|---|---|
| **Preconditions** | Module status = `completed` |
| **Steps** | 1. Directly navigate to `/settings/know-yourself/<completed-slug>`. |
| **Expected** | Toast **"You have already completed this module."**; redirected (replace) to `/settings?tab=profile`. Wizard is not re-enterable to re-answer. |

### MRS-GUARD-002 — Visiting a locked module's wizard route redirects with days-remaining copy — TESTED

| | |
|---|---|
| **Preconditions** | Module status = `locked` |
| **Steps** | 1. Directly navigate to `/settings/know-yourself/<locked-slug>`. |
| **Expected** | Toast reads `This module is available in {N} day(s).`; redirected (replace) to `/settings?tab=profile`. |

## 9. Module list card CTAs (unchanged for other statuses)

### MRS-LIST-001 — Available module shows Start only — TESTED

| | |
|---|---|
| **Preconditions** | Module status = `available` |
| **Steps** | 1. Navigate to `/settings?tab=profile`, inspect the module card. |
| **Expected** | Single **Start** button linking to the wizard route; no Review/Refresh visible. |

### MRS-LIST-002 — Refresh-available module shows Refresh only (no Review) — TESTED

| | |
|---|---|
| **Preconditions** | Module status = `refresh_available` |
| **Steps** | 1. Navigate to `/settings?tab=profile`, inspect the module card. |
| **Expected** | Single **Refresh** button linking to `/settings/know-yourself/<slug>` (no separate Review link on this status). |

### MRS-LIST-003 — Locked module shows disabled days-remaining button — TESTED

| | |
|---|---|
| **Preconditions** | Module status = `locked` |
| **Steps** | 1. Navigate to `/settings?tab=profile`, inspect the module card. |
| **Expected** | Disabled button showing the days-until-unlock label; not clickable to the wizard. |

## 10. End-to-end smoke

### MRS-E2E-001 — Full journey: start → answer → results → back to profile → card reflects completed — TESTED

| | |
|---|---|
| **Preconditions** | `code2@test.com`, a module with status = `available` |
| **Steps** | 1. Navigate to `/settings?tab=profile`. 2. Click **Start** on the available module. 3. Answer every question. 4. Submit final step, wait for results screen. 5. Click **Back to profile**. |
| **Expected** | Lands back at `/settings?tab=profile`; the module card now shows the **Completed** badge with **Review** and **Refresh** actions. No numeric score visible anywhere in the journey. |

---

**BLOCKED / notes for `/test` runner:**

- Financial Reality is the only module guaranteed `available` on a fresh `code2@test.com` seed; all other module-specific scenarios (History, unlocked-path-gating modules, identity for MRS-FIN-002-style option checks) require either waiting out the schedule or a direct DB edit to `profiles.moduleSchedules.<slug>.scheduledAt` — flag this as a manual precondition step when running each scenario, not a scripted one.
- MRS-UNLOCK-001/002 need the specific path-catalog row that the module under test gates confirmed first (grep `pathModulePrerequisites` fixtures/catalog) — do not guess a path name at run time.
