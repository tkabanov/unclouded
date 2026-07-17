# Deep-dive modules («Know Yourself Deeper») — product spec

> **Status:** Locked at item 0 (2026-07-17). Authoritative for MVP implementation (TEMP doc §1–8, §11).
>
> **Overrides:** OVR-009 (tier), OVR-010 (surface), OVR-011 (onboarding preview).  
> **Content source of truth for questions/copy:** Build Brief §9. **Schedule:** Build Brief §10.

---

## 1. Scope and non-goals (MVP)

### In scope (MVP)

- Six optional deep-dive questionnaire modules
- Time-based unlock schedule (§10 default + accelerated triggers)
- Profile section listing modules and progress
- Onboarding Results preview aligned with scheduler
- Atomic submit persistence + AI side effects
- Dashboard Zone G widget — next module preview on Dashboard (TEMP §9)
- Module unlock email notifications — cron edge fn + 3-day resend (TEMP §10)
- Path prerequisites gated by module completion + field conditions (TEMP §12)
- Module refresh / re-trigger flows (TEMP §13)
- One vertical slice end-to-end (Identity Lens or Body's Story) then remaining modules

### Out of scope (MVP)

- **Tier paywall on modules** (OVR-009 — all 6 on Free)
- Daily check-in / Gidget nudge / path progress / streak emails (other §13 types)
- Draft save / resume-later per question

---

## 2. Module catalog

Canonical slugs align with `module_*_complete` flags and `profileHelpers.ts` MODULE_ORDER.

| # | Display title (user-facing) | Slug | Complete flag | Default day | Questions | Presentation copy (§10) |
|---|----------------------------|------|---------------|-------------|-----------|-------------------------|
| 1 | The Identity Lens | `identity` | `module_identity_complete` | 7 | 8 | Go deeper: who you believe you are shapes everything else |
| 2 | Your Relational Blueprint | `relational` | `module_relational_complete` | 14 | 8 | Understand how you connect — and how you protect yourself |
| 3 | Your History & Context | `history` | `module_history_complete` | 21 | 6 | Optional and private: what shaped you is still shaping you |
| 4 | Financial Reality | `financial` | `module_financial_complete` | 10 | 5 | A quick check-in on the layer that affects everything else |
| 5 | Your Body's Story | `body` | `module_body_complete` | 5 | 7 | Your next step: what your body is carrying and trying to tell you |
| 6 | What Holds You | `meaning` | `module_meaning_complete` | 30 | 7 | The deepest layer: what gives you meaning and what you reach for |

**AI short names** (internal / prompt only): Identity Lens, Relational Blueprint, History & Context, Financial Reality, Body's Story, What Holds You — as in `supabase/functions/chat/prompt/profileHelpers.ts`.

### Fields written per module (Build Brief §9)

| Slug | Answer fields | Derived flags on completion |
|------|---------------|----------------------------|
| `identity` | `identity_self_worth_source`, `identity_narrative_type`, `identity_role_fusion_score`, `identity_pressure_origin` | — |
| `relational` | `attachment_signal`, `conflict_pattern`, `support_seeking_capacity`, `intimacy_safety_level` | — |
| `history` | `trauma_activation_level`, `grief_load_level`, `prior_support_type`, `significant_events_12mo` | `trauma_informed_mode = yes` if `trauma_activation_level = active` |
| `financial` | `financial_stability_signal`, `financial_anxiety_level`, `financial_agency_level` | — |
| `body` | `sleep_quality_signal`, `hormonal_context_flag`, `hormonal_context_type`, `chronic_pain_flag`, `body_relationship`, `substance_pattern_signal` | — |
| `meaning` | `purpose_clarity`, `spiritual_framework_present`, `spiritual_framework_type`, `belonging_level`, `pressure_reach` | — |

All completions also set the module complete flag to `yes` and increment `modules_completed_count` by 1.

---

## 3. Scheduler rules (§10 summary)

Computed at `completeOnboarding` (Build Brief §6 step 8). Stored per user (`module_schedules` or JSON on profile).

### Default time-based schedule

| Slug | Default day |
|------|-------------|
| `body` | 5 |
| `identity` | 7 |
| `financial` | 10 |
| `relational` | 14 |
| `history` | 21 |
| `meaning` | 30 |

### Accelerated triggers (earlier unlock when condition met)

| Slug | Accelerated day | Condition |
|------|-----------------|-----------|
| `body` | 3 | `energy_level_signal` = depleted or shut_down (nervous system depleted/shut down) |
| `identity` | 5 | `performance_score` < 3.2 AND overthink or avoid behavioral pattern |
| `financial` | 0 (immediate) | `financial_load_signal` = high |
| `relational` | 7 | `relational_load_signal` = high |
| `history` | 10 | `stability_score` < 3.2 OR `grief_mode_active` = yes |
| `meaning` | 14 | `alignment_score` < 3.2 |

Use the **earlier** of default day and accelerated day when a trigger applies.

### Access rules

- **Time lock:** module status `locked` until unlock day; then `available`.
- **User order:** any unlocked module may be started in any order (§10 user-initiated access).
- **Tier:** no tier lock (OVR-009).
- **Completed:** after atomic submit, status `completed`; may be re-offered as `refresh_available` (TEMP §13).
- **Refresh:** optional re-run updates answer fields without incrementing `modulesCompletedCount`.

### API contract (implementation)

`getModuleAvailability(userId)` returns per slug: `locked | available | completed | refresh_available`, plus `daysUntilUnlock`, `scheduledAt`, `unlockedAt`, `completedAt`.

**Onboarding preview:** show the module with the **minimum** `daysUntilUnlock` among all modules (ties: prefer earlier default-day order: body → identity → financial → relational → history → meaning). Fallback with no triggers: **Your Body's Story, 5 days**.

---

## 4. Onboarding preview contract

**Template (Build Brief §5):**

> Your first deep-dive: **[Display title]** — available in **[X]** day(s)

**Rules (OVR-011):**

- `[Display title]` = Build Brief §9 title from catalog table (not classification marketing names).
- `[X]` = `daysUntilUnlock` for the earliest scheduled module from §3.
- Values persisted to `profiles.results.first_module` and `profiles.results.module_days` at onboarding completion from scheduler — **not** from `classification.ts` `moduleMap`.
- After scheduler ships, onboarding Results text **must match** `getModuleAvailability()` for the same user.

**Deprecation:** remove `moduleMap` in `frontend/src/lib/classification.ts` when scheduler is wired (TEMP §3, §8).

---

## 5. Profile UI contract

**Location (OVR-010):** Settings → **Profile** tab, section below About You (`SettingsAboutYouSection`).

**Section header:** Know Yourself Deeper

**Progress:** `X/6 completed` (from `modules_completed_count` or explicit flags).

**Per-module card:**

| Status | UI | CTA |
|--------|-----|-----|
| `locked` | Title + presentation copy; «Available in N days» | Disabled or «Coming in N days» |
| `available` | Title + presentation copy | «Start» / «Continue» (if in-memory only — N/A for MVP atomic) |
| `completed` | Title + checkmark | «Review» optional post-MVP; MVP: completed state only |

No **locked by tier** status in MVP (OVR-009).

Optional nested routes under Profile context only; no new Settings tab.

---

## 6. Questionnaire flow contract

**Pattern:** intro screen → N questions (radio/select, same control patterns as onboarding) → completion screen → redirect to Profile + success toast.

**Persistence (MVP):** **atomic submit** at end only. In-memory state during wizard; abandoning mid-flow does **not** write partial answers to DB.

**Global:** `CrisisBar` visible on all module wizard screens (Build Brief §3).

**Not an onboarding clone:** softer framing, module-specific headline/sub from §9; no step counter styled like PuP 360 unless visually distinct.

---

## 7. Module 3 — History UX contract

Most sensitive module. Copy from Build Brief §9 Module 3 unless noted.

### Copy

| Element | Text |
|---------|------|
| UI label | Your History & Context |
| Headline | What shaped you is still shaping you |
| Sub | This is completely optional and entirely private. You don't have to name anything specific. These questions look at the larger context around your patterns — not to explain you away, but to understand you better. |
| Questions | HQ1–HQ6 verbatim options from Build Brief §9 |

### Tone and framing

- Softest language of all modules; never push.
- Intro includes **available when you're ready** (Build Brief §9 Tone row).
- Primary CTA: start questionnaire. Secondary: **Skip for now** (defer, no save).

### Skip and navigation

| Action | Behavior |
|--------|----------|
| Skip for now (intro) | Return to Profile module list; module stays incomplete; no DB write |
| Back (between questions) | Previous question; in-memory only |
| Close / leave mid-flow | Same as skip — no partial persist |
| Forced completion | **Never** — modules never required for app access (§9 delivery rule) |

### Crisis resources

- `CrisisBar` on **every** History wizard screen (and all module wizards).
- Dashboard: existing `CrisisSupportCard` unchanged.

### Trauma-informed flag source

- On History **completion:** set `trauma_informed_mode = yes` **only** when `trauma_activation_level = active` (Build Brief §9).
- History module answer **wins** over onboarding Screen 12 heuristics when both exist.
- Until History is completed, `trauma_informed_mode` from onboarding Screen 12 may remain; completing History with `trauma_activation_level` ≠ `active` does **not** force-clear an onboarding-set flag (clinical safety — clearing is post-MVP if needed).

### Privacy

- All History answers are select/radio slugs — no free text.
- RLS: user read/write own profile row only.
- Not exposed in UI to other users; included in AI system prompt as structured profile fields only.

---

## 8. Persistence and side effects

### `completeModule(userId, moduleSlug, answers)`

1. Validate all required answers for module config.
2. Write answer fields to profile / onboardingData per §2 table.
3. Set `module_*_complete = yes`.
4. Increment `modules_completed_count`.
5. Apply derived flags (e.g. `trauma_informed_mode` for History).
6. Set `completedAt` on module schedule entry.
7. Recalculate `ai_confidence_level` via `resolveAiConfidenceLevel`.

**Idempotency / re-assessment:** rules deferred to TEMP §13.

---

## 9. Delivery rule (all modules)

From Build Brief §9:

- Surfaced as **Know Yourself Deeper — [Module Name]**.
- Always optional; never required for app access.
- Each module must feel valuable on its own — not like more onboarding.

---

## 10. Path prerequisites (TEMP §12)

Paths may declare module gates in `path.triggerSignals` using semicolon tokens:

- `prerequisite:module:{slug}` — requires `module_*_complete` for that slug (e.g. `identity`)
- `prerequisite:field:{fieldKey}={value}` — profile field equality (camelCase keys)
- `prerequisite:field:{fieldKey}>={n}` — numeric minimum

Evaluation: `frontend/src/lib/paths/pathModulePrerequisites.ts`. Gated paths remain visible in the library with a lock state and CTA to `/settings/know-yourself/{slug}`. Enrollment is blocked until prerequisites pass; existing enrollments may continue.

---

## 11. Module refresh (TEMP §13)

Module schedules (`profiles.moduleSchedules`) may include:

- `refreshOfferedAt` / `refreshReason` — completed module offered for re-run
- Accelerated unlock via `scheduledAt`/`unlockedAt` set to now for locked modules

**Triggers:**

| Trigger | Reason token | Behavior |
|---------|--------------|----------|
| 90-day reassessment complete | `reassessment_90d` | Refresh all completed modules; unlock all still-locked |
| Score drop ≥ 0.8 | `score_drop` | Unlock + refresh mapped modules (stability→history, performance→identity, alignment→meaning, orientation→financial) |
| Life event (Profile UI) | `life_event` | Mapped modules per event type |
| User-initiated (Profile) | `user_initiated` | Refresh selected completed module(s) |

Refresh submit uses `completeModule(..., { mode: "refresh" })` — updates fields, clears offer, does not increment count.

`onboardingData`: `significant_shift_flag`, `last_life_event_type`, `last_life_event_at`.

---

## 12. Open questions (post-MVP, non-blocking)

- Whether to clear onboarding-set `trauma_informed_mode` when History answers `active` = false

---

## 13. Test matrix and regression suite (TEMP §14)

Run from `frontend/`:

```bash
npm test -- src/lib/modules src/lib/chat/buildSystemPrompt.test.ts src/lib/chat/sessionLifecycle.test.ts src/lib/paths/pathModulePrerequisites.test.ts src/lib/settings/admin/adminAnalyticsApi.test.ts src/lib/settings/admin/adminPrivacy.test.ts src/lib/reassessment/completeReassessment.test.ts src/components/reassessment/ReassessmentModuleRefreshBanner.test.tsx
```

| Area | Test file | Status |
|------|-----------|--------|
| Scheduler / unlock / preview | `moduleScheduler.test.ts`, `onboardingModulePreview.test.ts` | Covered |
| Complete + profile patch + side effects | `completeModule.test.ts`, `moduleRegistry.test.ts` | Covered |
| Refresh / reassessment hook | `moduleRefresh.test.ts`, `completeReassessment.test.ts` | Covered |
| Onboarding schedule persist | `completeOnboarding.test.ts` | Covered |
| Tier gating regression (OVR-009) | `moduleTierGating.test.ts` | Covered |
| End-to-end flow (onboarding → unlock → complete → AI) | `deepDiveModuleFlow.integration.test.ts` | Covered |
| AI prompt assembly (all modules) | `buildSystemPrompt.test.ts` | Covered |
| Session opening after module | `sessionLifecycle.test.ts` | Covered |
| Reassessment module refresh banner | `ReassessmentModuleRefreshBanner.test.tsx` | Covered |
| Path module prerequisites | `pathModulePrerequisites.test.ts` | Covered |
| Admin module aggregates | `adminAnalyticsApi.test.ts` | Covered |
| Admin privacy whitelist | `adminPrivacy.test.ts` | Covered |
| Dashboard module preview | `dashboardModulePreview.test.ts` | Covered |
| Profile list state | `moduleListState.test.ts` | Covered |

**Observability (MVP):** no separate metrics pipeline. Module completion audit fields live in `onboardingData` (`last_completed_module_slug`, `last_completed_module_at`, `last_completed_module_name`). CI green on the regression suite above is the primary regression signal.

---

## 14. Privacy audit — History module fields (TEMP §14)

| Surface | Expected behavior | Evidence |
|---------|-------------------|----------|
| Owner SELECT/UPDATE | User reads/writes own profile row only | `supabase/migrations/20260709180000_camelcase_schema_rename.sql` — Owner selects/updates profile |
| Chat edge load | JWT user → own profile via `loadServerProfile.ts` | Edge function uses authenticated user id |
| Admin SELECT policy | `is_settings_admin()` can read full row at DB level | `20260716170000_assessment_result_reassessment.sql` |
| Admin UI/API | Must not display History answer fields | No `traumaActivationLevel` / `significantEvents12mo` in `frontend/src/components/settings/admin/` |
| Admin analytics | Aggregate completion flags/counts only | `adminAnalyticsApi.ts` whitelisted SELECT |

**Finding:** RLS grants settings admins technical read access to all `profiles` columns. Product decision: admin UI and analytics APIs **never surface** History answer fields (`traumaActivationLevel`, `griefLoadLevel`, `priorSupportType`, `significantEvents12mo`); only completion booleans and `modulesCompletedCount`. Column-restricted admin DB view is post-MVP if support needs tighter bounds.

History answers are select/radio slugs only (no free text). Included in AI system prompt as structured profile fields for the authenticated user only.

---

## 16. Deploy checklist (pre-production)

1. **Git:** commit and merge all `frontend/src/lib/modules/`, wizard UI, admin analytics, edge fns, and migrations `20260717120000`–`20260717170000`.
2. **Database:** `supabase db push` or `migrate deploy` on staging/production.
3. **Edge functions:** deploy `module-unlock`, `notification-milestone`, and updated `chat` (loads module columns via `loadServerProfile.ts`).
4. **Secrets:** `RESEND_API_KEY`, `MODULE_UNLOCK_CRON_SECRET`, `REASSESSMENT_DUE_CRON_SECRET` in Supabase project settings.
5. **Cron (ops):** daily `POST /functions/v1/module-unlock` and `POST /functions/v1/reassessment-due` with service-role bearer (see [`supabase/EMAIL_TEMPLATES.md`](../supabase/EMAIL_TEMPLATES.md)).
6. **Smoke:** onboarding → Results preview → Profile Know Yourself list → complete one module → chat prompt includes module modifier → Admin Analytics shows module counts.

---

## 17. Gate checklist (item 0 complete)

- [x] OVR-009 — tier gating documented
- [x] OVR-010 — Profile tab surface documented
- [x] OVR-011 — onboarding preview documented
- [x] Module catalog + scheduler summary in this spec
- [x] History UX contract in this spec
- [x] Atomic submit documented
- [x] MVP path: TEMP §0 → §1 → §2 → §3 → §5 → §6 → §7 → §8 → §11 (**without** §4 tier gating)
- [x] `classification.ts` `moduleMap` deprecation noted
- [x] Onboarding preview gate (§8) — scheduler parity tests + shared `computeOnboardingModulePreview`
- [ ] Owner sign-off (pending explicit approval; defaults accepted per planning session 2026-07-17)

**Status:** TEMP §0–§14 implementation complete. See §16 deploy checklist before production.
