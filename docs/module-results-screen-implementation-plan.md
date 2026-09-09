# Deep-Dive Module Results Screen — Implementation Plan

| | |
|---|---|
| **Source** | No requirements doc — net-new product design. Content sources: [`docs/deep-dive-modules-spec.md`](./deep-dive-modules-spec.md) §5–§6, `docs/Uncloud360_Complete_Build_Brief DRAFT 4.9.2026.docx.md` §9 «WHAT THIS UNLOCKS» blocks (lines 1127, 1201, 1266, 1318, 1382, 1452) |
| **Status** | Wave 0 blocking — product lock required before code |
| **Audience** | Coding agents |
| **Overrides** | `OVR-009` (all 6 modules free), `OVR-010` (section on Settings → Profile), `OVR-033` (section titled «Coaching Insights»), `OVR-050` (dashboard module cards) — [`docs/product-overrides.md`](./product-overrides.md) |
| **Conflict** | [`docs/deep-dive-modules-spec.md`](./deep-dive-modules-spec.md) §6 line 148 defines the flow as «intro → N questions → **completion screen** → redirect to Profile + toast» with no results step, and §5 line 138 marks a «Review» CTA as **post-MVP**. This plan contradicts both — Wave 0 must append a new `OVR-065`. |

**Decided scope (from user):** **qualitative** results screen. No numeric module score, no per-module rating.

**How to use**

1. Complete **Wave 0** (`MRS-00`) before any code — it locks copy source, tier policy for unlocked paths, and the new override entry.
2. Run tasks in parallel only when `Depends on` is satisfied and **Likely touch** paths do not overlap.
3. One task = one agent session: implement + verify **Acceptance**; do not expand into **Out of scope**.
4. Re-read `docs/product-overrides.md` before touching the Coaching Insights section, module list cards, or dashboard module widgets.
5. No migrations are expected in this plan. If a task appears to need one, **stop and report** — persisting extra answers is an explicit non-goal.

**Suggested agent entry**

```text
Implement task MRS-01 from docs/module-results-screen-implementation-plan.md.
Read docs/product-overrides.md and docs/deep-dive-modules-spec.md first.
Respect Depends on / Out of scope / Mode.
Verify Acceptance checklist before finishing.
Run gates from frontend/: lint, test, build, typecheck as applicable.
```

---

## Critical constraint (read before Wave 1)

**17 of 41 module questions are not persisted.** Every question with `fieldKey: null` in `frontend/src/lib/modules/definitions/*Module.ts` is discarded on submit — these are exactly the 1–5 scale «temperature» questions.

| Module | Questions | Not persisted |
|---|---|---|
| `identity` | 8 | 4 |
| `relational` | 8 | 4 |
| `meaning` | 7 | 3 |
| `body` | 7 | 2 |
| `history` | 6 | 2 |
| `financial` | 5 | 2 |

Consequences that shape this plan:

1. **No score is derivable** from the database — this is a second, independent reason the screen is qualitative.
2. Results content **must be resolved from persisted profile fields** (`MODULE_ANSWER_FIELD_COLUMNS` on `public.profiles`), **not** from the wizard's in-memory `answers`. Doing so makes `MRS-05` («Review» a completed module) nearly free, and guarantees the screen a user sees at completion is identical to what they see later.
3. `identityRoleFusionScore` is numeric (1–5). Render it as a **qualitative sentence**, never as a digit — per the decided scope.

---

## Dependency graph (waves)

```text
Wave 0  MRS-00 (product lock + OVR-065)
   │
Wave 1  ┌──────────────────┬──────────────────┐
        ▼                  ▼
     MRS-01             MRS-02
  (content registry)  (unlocked-paths resolver)
        │                  │
Wave 2  └────────┬─────────┘
                 ▼
              MRS-03 (results screen + wizard wiring)
                 │
Wave 3  ┌────────┴────────┐
        ▼                 ▼
     MRS-04            MRS-05
  (history variant)  (Review entry point)
        │                 │
Wave 4  └────────┬────────┘
                 ▼
              MRS-06 (verification)
```

---

## Wave 0 — Product lock (blocking)

### MRS-00 — Lock copy source, tier policy, and override

| | |
|---|---|
| **Goal** | Every open decision below is answered and `OVR-065` is appended — done when agents can start `MRS-01` without guessing copy or policy |
| **Mode** | `max` |
| **Depends on** | — |
| **Spec** | `deep-dive-modules-spec.md` §5, §6; Build Brief §9; OVR-009, OVR-033 |
| **Likely touch** | `docs/product-overrides.md`, this file only |

**Confirm (record the locked column in this table, then mirror into `product-overrides.md`):**

| # | Topic | Spec default | Locked decision |
|---|---|---|---|
| 1 | Results step exists at all | spec §6: completion screen only | **Locked:** results screen replaces the generic completion screen |
| 2 | Score | — | **Locked:** qualitative only, no numeric score, no digits from `identityRoleFusionScore` |
| 3 | Copy source for reflections | none exists | Options: (a) derive per-answer sentences from Build Brief §9 «WHAT THIS UNLOCKS» + question option labels; (b) request new copy from owner. Pick one. |
| 4 | Unlocked-paths block | — | Show newly unlocked paths? If yes: filter by user tier, or show all with «available on Pro» label? |
| 5 | Refresh mode (`refresh_available`) | — | Does a refresh submit also land on the results screen, or keep the plain toast? |
| 6 | Secondary CTA | — | «Back to profile» only, or add «Talk to Gidget about this» → chat? |
| 7 | «Review» entry point | spec §5 line 138: post-MVP | In scope (`MRS-05`) or deferred? If deferred, drop `MRS-05` and `MRS-03`'s route note. |
| 8 | History module tone | spec §7: softest, never push | Does History get a results screen at all, or return to profile silently? |

**Deliverables**

- [ ] All 8 rows above have a **Locked** value.
- [ ] `OVR-065` appended to `docs/product-overrides.md` with the standard 5-row shape (`Date` / `Overrides` / `Authoritative spec` / `Current behavior` / `Code`), citing `deep-dive-modules-spec.md` §6 line 148 and §5 line 138 as the overridden sources.
- [ ] If decision 3 is (b), this plan is paused until copy arrives — report and stop.
- [ ] Agents may proceed to Wave 1.

**Out of scope**

- Any application code.
- Editing `deep-dive-modules-spec.md` (overrides win by precedence; the spec stays as the historical source).

---

## Wave 1 — Content and data resolution (no UI)

### MRS-01 — Per-module results content registry + resolver

| | |
|---|---|
| **Goal** | `resolveModuleResults(slug, profile)` returns a fully-populated, purely-derived view model for any of the 6 modules — done when unit tests cover every persisted answer slug |
| **Mode** | `max` |
| **Depends on** | `MRS-00` |
| **Spec** | Build Brief §9 «WHAT THIS UNLOCKS»; MRS-00 decisions 2, 3, 8 |
| **Likely touch** | new `frontend/src/lib/modules/results/moduleResultsContent.ts`, `frontend/src/lib/modules/results/resolveModuleResults.ts`, `frontend/src/lib/modules/results/resolveModuleResults.test.ts` |

**Implement**

- Create `frontend/src/lib/modules/results/`. Keep it pure — no Supabase calls, no React.
- `moduleResultsContent.ts` — static copy keyed by module slug:
  - `headline`, `lead` (one short paragraph, module-level);
  - `reflections`: `Partial<Record<ModuleAnswerFieldKey, Record<string, string>>>` — answer slug → one qualitative sentence;
  - `whatThisUnlocks: string[]` — 2–4 bullets derived from the Build Brief block for that module (locked in `MRS-00` decision 3).
- For `identityRoleFusionScore` (numeric 1–5) and any other numeric field, key reflections by the stringified 1–5 value and emit a sentence — **never** surface the digit.
- `resolveModuleResults.ts` — `resolveModuleResults(slug: ModuleSlug, profile: ModuleProfileInput): ModuleResultsView`:
  - read persisted values via `MODULE_ANSWER_FIELD_COLUMNS` with `onboardingData` snake_case fallback — **reuse the existing `readProfileFieldValue` pattern from `frontend/src/lib/paths/pathModulePrerequisites.ts:40`** (extract it into a shared helper if cleaner, but do not duplicate the fallback logic);
  - iterate `MODULE_ANSWER_FIELDS_BY_SLUG[slug]` in declaration order so reflections render in question order;
  - skip fields that are `null` or whose value has no copy entry — never emit a placeholder or a fabricated sentence.
- Export a `ModuleResultsView` type: `{ headline, lead, reflections: string[], whatThisUnlocks: string[] }`.

**Acceptance**

- [ ] A test asserts, for all 6 modules, that **every** option slug of every persisted `fieldKey` in `definitions/*Module.ts` has a reflection entry (drive the test off `MODULE_ANSWER_FIELDS_BY_SLUG` + the definitions so new options fail loudly).
- [ ] `resolveModuleResults("identity", {})` returns a view with empty `reflections` and does not throw.
- [ ] An unknown/legacy answer slug is silently skipped, not rendered as raw slug text.
- [ ] A profile that stores answers only in `onboardingData` (snake_case aliases) resolves identically to one with typed columns populated.
- [ ] No output string contains a bare digit derived from `identityRoleFusionScore`.
- [ ] `npm run lint`, `npm run test`, `npm run typecheck` pass in `frontend/`.

**Out of scope**

- Any React component.
- AI-generated copy or edge functions.
- Persisting the 17 unpersisted scale answers, or any migration.
- Numeric scores of any kind.

---

### MRS-02 — Newly-unlocked-paths resolver

| | |
|---|---|
| **Goal** | Given a profile snapshot before and after a module completion, return the consumer paths that just became unlocked by that module — done when tested against a fake catalog |
| **Mode** | `max` |
| **Depends on** | `MRS-00` |
| **Spec** | MRS-00 decision 4; `deep-dive-modules-spec.md` §11 prerequisite grammar; OVR-009 |
| **Likely touch** | new `frontend/src/lib/modules/results/moduleUnlockedPaths.ts` + `.test.ts` |

**Implement**

- `resolveNewlyUnlockedPaths({ slug, profileBefore, profileAfter, catalog })` — pure function taking an already-fetched catalog, so it is testable without network.
- Reuse, do not reimplement: `parsePathModulePrerequisites` and `userMeetsPathModulePrerequisites` from `frontend/src/lib/paths/pathModulePrerequisites.ts`; `isConsumerPathActive` and the `PathCatalogEntry` type from `frontend/src/lib/paths/pathsCatalogApi.ts`.
- A path qualifies when: it is an active consumer path, its parsed prerequisites reference the completed module slug (via `kind: "module_complete"` or a `field_equals`/`field_gte` on a field belonging to that module per `MODULE_ANSWER_FIELDS_BY_SLUG`), prerequisites were **not** satisfied by `profileBefore`, and **are** satisfied by `profileAfter`.
- Apply the tier policy locked in `MRS-00` decision 4. If «show all with a label», return `requiresUpgrade: boolean` per entry rather than filtering.
- Add a thin async wrapper `fetchNewlyUnlockedPaths(...)` that calls `fetchPathCatalog()` and delegates to the pure function. Keep the fetch in `lib/`, never in a component.

**Acceptance**

- [ ] Path with `prerequisite:module:identity` is returned after the identity module completes and not before.
- [ ] Path with `prerequisite:field:bodyRelationship=disconnected` is returned only when that answer was actually given.
- [ ] A path already unlocked before this completion is **not** returned.
- [ ] A path with no prerequisites is never returned.
- [ ] `isActive = false` paths are excluded.
- [ ] Result is stable-ordered (deterministic, e.g. by path name) so snapshots do not flake.
- [ ] `npm run lint`, `npm run test`, `npm run typecheck` pass in `frontend/`.

**Out of scope**

- Enrolling the user into a path.
- UI rendering.
- Changing `pathModulePrerequisites.ts` behavior (extracting a shared read helper is allowed; changing gate semantics is not).

---

## Wave 2 — Results screen

### MRS-03 — `ModuleResultsScreen` + wizard wiring

| | |
|---|---|
| **Goal** | Completing any module lands on a qualitative results screen instead of the generic «answers have been saved» confirmation — done when the wizard renders reflections and unlocked paths for a real profile |
| **Mode** | `max` |
| **Depends on** | `MRS-01`, `MRS-02` |
| **Spec** | MRS-00 decisions 1, 5, 6; `deep-dive-modules-spec.md` §6 (superseded by OVR-065) |
| **Likely touch** | new `frontend/src/components/modules/ModuleResultsScreen.tsx` + `.test.tsx`, `frontend/src/pages/ModuleWizard.tsx`, `frontend/src/components/modules/ModuleCompletionScreen.tsx` |

**Implement**

- New `ModuleResultsScreen.tsx` — presentational only. Props: `definition`, `results: ModuleResultsView`, `unlockedPaths`, `submitting`, `onFinish`, optional `onOpenChat`. Reuse `bubbleStyle` card chrome and the existing `Button variant="cta"` pattern from `ModuleCompletionScreen.tsx`.
- Sections, in order: confirmation heading → `lead` → reflections list → «What this unlocks» bullets → unlocked-paths block (omit the whole block when empty) → CTA row.
- `ModuleWizard.tsx`:
  - snapshot `profile` into a ref **before** calling `completeModule` — `MRS-02` needs the before-state and `useUserProfile().refresh()` mutates it;
  - after `setSubmitted(true)` and `refresh()`, resolve results from the **refreshed** profile via `resolveModuleResults`, and kick off `fetchNewlyUnlockedPaths`;
  - render `ModuleResultsScreen` on `currentStep.kind === "complete"`; keep the existing `submitting` skeleton state so the screen never flashes empty;
  - unlocked-paths fetch failure must degrade to an empty block, never block the screen or surface an error toast;
  - keep the existing error path intact — `ModuleLockedError` / `ModuleRefreshNotAvailableError` still toast and navigate to `/settings?tab=profile`, and a generic failure still calls `wizard.goBack()`.
  - apply `MRS-00` decision 5 for `isRefreshMode`.
- Delete `ModuleCompletionScreen.tsx` if nothing else imports it (grep first). Do not leave it as a dead fallback.

**Acceptance**

- [ ] Completing a module in a component test renders the reflection sentences for the submitted answers.
- [ ] While `submitting`, the screen shows a loading state and the finish CTA is disabled.
- [ ] Unlocked-paths block is absent (not an empty container) when the resolver returns nothing.
- [ ] `fetchNewlyUnlockedPaths` rejecting still renders the full results screen with no error toast.
- [ ] A locked/already-completed module still redirects to `/settings?tab=profile` — the existing guard at `ModuleWizard.tsx:43` is unchanged.
- [ ] Submit failure still returns the user to the last question via `goBack()`.
- [ ] No Supabase call is made from inside a component — all data access goes through `frontend/src/lib/`.
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck` pass in `frontend/`.

**Out of scope**

- The History-specific variant (`MRS-04`).
- The «Review» route (`MRS-05`).
- Dashboard or module-list card changes.
- Changing `completeModule` write behavior or `moduleProfilePatch.ts`.

---

## Wave 3 — Sensitivity and re-entry

### MRS-04 — History module results variant

| | |
|---|---|
| **Goal** | The History & Context results screen matches the module's clinical tone rules — done when `CrisisBar` is present and no achievement framing renders |
| **Mode** | `max` |
| **Depends on** | `MRS-03` |
| **Spec** | `deep-dive-modules-spec.md` §7 (tone, crisis resources), §8; Build Brief §9 Module 3; MRS-00 decision 8 |
| **Likely touch** | `frontend/src/components/modules/ModuleResultsScreen.tsx`, `frontend/src/lib/modules/results/moduleResultsContent.ts`, `frontend/src/components/modules/ModuleWizardShell.tsx` (verify only) |

**Implement**

- Apply `MRS-00` decision 8. If History gets no results screen, gate it and return to profile with the existing toast — then this task is a small guard plus a test.
- If it does get one: softest copy variant, no «unlocks» / achievement framing, no path recommendations block.
- Verify `CrisisBar` renders on the results step — `deep-dive-modules-spec.md` §8 line 188 requires it on **every** module wizard screen. Confirm `ModuleWizardShell` already provides it; if the results step renders outside the shell, fix that.
- Do **not** display `traumaActivationLevel`, `griefLoadLevel`, `priorSupportType`, or `significantEvents12mo` values back as labels or diagnostic-sounding statements. Reflections here must be non-interpretive and non-clinical.

**Acceptance**

- [ ] `CrisisBar` is present on the History results step (assert in a component test).
- [ ] History results render no path-unlock block and no «What this unlocks» bullets.
- [ ] No rendered string presents a trauma/grief answer as a diagnosis, level, or score.
- [ ] `trauma_informed_mode` write behavior in `moduleSideEffects.ts` is unchanged.
- [ ] `npm run lint`, `npm run test`, `npm run typecheck` pass in `frontend/`.

**Out of scope**

- Changing History question copy or `historyModule.ts` field mapping.
- Clearing or altering `trauma_informed_mode`.

---

### MRS-05 — «Review» entry point for completed modules

| | |
|---|---|
| **Goal** | A completed module card opens its stored results read-only, without re-taking the questionnaire — done when `/settings/know-yourself/:moduleSlug/results` renders for a completed module |
| **Mode** | `max` |
| **Depends on** | `MRS-03` |
| **Spec** | `deep-dive-modules-spec.md` §5 line 138 (post-MVP — superseded by OVR-065); MRS-00 decision 7 |
| **Likely touch** | new `frontend/src/pages/ModuleResultsPage.tsx`, `frontend/src/lib/router/authenticatedRoutes.tsx`, `frontend/src/components/settings/knowYourself/ModuleListCard.tsx` |

**Implement**

- Skip this task entirely if `MRS-00` decision 7 deferred it.
- New route `{ path: "/settings/know-yourself/:moduleSlug/results", element: <ModuleResultsPage /> }` in `authenticatedRoutes.tsx:34` area. Register it **before** or distinctly from `:moduleSlug` so the wizard route does not swallow it.
- `ModuleResultsPage.tsx` — read-only: resolve `resolveModuleResults` from the current profile and render `ModuleResultsScreen` with `submitting={false}`. Do **not** reuse `ModuleWizard`, whose guard at `ModuleWizard.tsx:51` redirects completed modules away.
- Guard: only `completed` / `refresh_available` status may view it. `locked` or `available` → toast + redirect to `/settings?tab=profile`, matching the wizard's existing guard style.
- No unlocked-paths block here — «newly unlocked» is meaningless outside the completion moment. Pass an empty list.
- `ModuleListCard.tsx` — completed state gets a `Review` link to the new route, alongside the existing `Refresh` affordance.

**Acceptance**

- [ ] Completed module card shows a `Review` CTA linking to the results route.
- [ ] The results route renders reflections for a completed module with no write of any kind (assert no `completeModule` / profile update call).
- [ ] Visiting the route for a `locked` module redirects to `/settings?tab=profile`.
- [ ] Visiting the route for an `available` (not yet taken) module redirects rather than rendering an empty screen.
- [ ] The existing `Start` / `Refresh` CTAs and the wizard route still work unchanged.
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck` pass in `frontend/`.

**Out of scope**

- Editing stored answers from the review screen.
- PDF export or sharing.
- Dashboard entry points to review.

---

## Wave 4 — Verification

### MRS-06 — E2E acceptance + readiness

| | |
|---|---|
| **Goal** | The full journey is proven in the running app and all gates are green — done when notes and gate output are recorded |
| **Mode** | `max` |
| **Depends on** | `MRS-03`, `MRS-04`, `MRS-05` |
| **Spec** | This plan; `.ai/PROJECT.md` verification policy |
| **Likely touch** | test notes only; optional new `docs/module-results-screen-test-plan.md` |

**Verify**

- [ ] Full journey per module (all 6): intro → questions → results screen → back to profile; card shows completed.
- [ ] Reflections shown match the answers actually selected, for at least 2 modules with different answer sets.
- [ ] Refresh flow (`refresh_available`) behaves per `MRS-00` decision 5.
- [ ] History module honors `MRS-04` (CrisisBar present, no achievement framing).
- [ ] Unlocked-paths block appears for a module that genuinely gates a path, and is absent otherwise — verified against real `path.triggerSignals` rows, not fixtures.
- [ ] `Review` route renders and writes nothing (check network tab for absence of profile `PATCH`).
- [ ] Mid-flow abandon still writes nothing (`deep-dive-modules-spec.md` §6 atomic-submit rule holds).
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npm run typecheck` pass in `frontend/`.
- [ ] Adversarial review per `.ai/PROJECT.md`: run `fidelity-reviewer` and `architecture-reviewer` (readonly). `security-reviewer` only if a task deviated and touched a write path or RLS — this plan should not.

**Deliverables**

- [ ] Test notes, or `/test-plan` output at `docs/module-results-screen-test-plan.md`.
- [ ] `OVR-065` verified present and accurate against shipped behavior.
- [ ] Gaps filed as follow-ups — no silent scope creep.

**Out of scope**

- Fixing unrelated pre-existing failures — report them instead.

---

## Parallelism cheat sheet

| Wave | Can run in parallel | Shared caution |
|---|---|---|
| 0 | — | Blocking; doc-only |
| 1 | `MRS-01` ‖ `MRS-02` | Both create files under `lib/modules/results/` — different filenames, no overlap. Only collision risk: both may want to extract the `readProfileFieldValue` helper from `pathModulePrerequisites.ts`. Assign that extraction to `MRS-01`; `MRS-02` consumes it. |
| 2 | `MRS-03` alone | Owns `ModuleWizard.tsx` and deletes `ModuleCompletionScreen.tsx` |
| 3 | `MRS-04` ‖ `MRS-05` | `MRS-04` edits `ModuleResultsScreen.tsx` + content registry; `MRS-05` only consumes them and touches routes/pages/`ModuleListCard.tsx`. If `MRS-04` needs new props on the screen, run it first. |
| 4 | `MRS-06` alone | Needs everything merged |

---

## Explicit non-goals (all agents)

Do **not** build unless separately scoped:

- **Any numeric module score, rating, gauge, or progress percentage.** Decided qualitative.
- **Persisting the 17 unpersisted scale answers.** No migration, no new columns, no `moduleScores` JSON. If a task seems to need this, stop and report.
- AI-generated results copy or a new edge function. (`Uncloud360_AI_Prompt_Specifications.docx.md` Prompt 3 is the path-session closing insight — a different feature. Do not wire it here.)
- PDF export, email, or push notification for module results.
- Changes to `completeModule`, `moduleProfilePatch.ts`, `moduleSideEffects.ts`, or the module scheduler.
- Changes to the PuP 360 classification results screen (`docs/Uncloud360_Results_Screen_Copy_All_Classifications.docx.md`) or reassessment results.
- Dashboard card changes (`OVR-050` owns that layout).
- Path enrollment or tier upsell flows triggered from the results screen.
- Editing stored answers from the review screen.

---

## Traceability (source § → tasks)

| Source | Tasks |
|---|---|
| `deep-dive-modules-spec.md` §6 (flow) — overridden | `MRS-00`, `MRS-03` |
| `deep-dive-modules-spec.md` §5 line 138 (Review, post-MVP) — overridden | `MRS-00`, `MRS-05` |
| `deep-dive-modules-spec.md` §2 (fields written per module) | `MRS-01` |
| `deep-dive-modules-spec.md` §7–§8 (History tone, CrisisBar) | `MRS-04` |
| `deep-dive-modules-spec.md` §11 (prerequisite grammar) | `MRS-02` |
| Build Brief §9 «WHAT THIS UNLOCKS» (lines 1127, 1201, 1266, 1318, 1382, 1452) | `MRS-00`, `MRS-01` |
| `OVR-009` (all modules free) | `MRS-02` (tier policy) |
| `OVR-033` (section titled Coaching Insights) | `MRS-05` |
| E2E / DoD | `MRS-06` |

---

## Agent prompt template (copy per task)

```text
Implement task MRS-{NN} from docs/module-results-screen-implementation-plan.md.
Read docs/product-overrides.md first (esp. OVR-009, OVR-033, OVR-065), then
docs/deep-dive-modules-spec.md §2, §5, §6.
Respect Depends on / Out of scope / Mode.
Architecture: UI → frontend/src/lib → Supabase; no direct Supabase queries in components;
no service_role in frontend.
Hard constraint: qualitative only — no numeric module score, and no migration
(17 of 41 module answers are intentionally not persisted; do not change that here).
Verify the task Acceptance checklist before finishing.
Run gates from frontend/: lint, test, build, typecheck as applicable.
Do not apply migrations or deploy edge functions unless the user explicitly asks.
```
