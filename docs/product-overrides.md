# Product overrides (intentional deviations)

This document records **deliberate product and UX changes** requested by the project owner that **override** the Bubble IR export, Lovable prototype, migration specs (`cursor-impl-cycle/`), or client docs in `docs/`.

When implementing or restoring UI/flows, **prefer this file over Bubble/Lovable/client docs** if an entry applies.

## How to use

- Before mirroring Bubble IR, migration ACs, or client PRD text, search this file for the area you are touching.
- When the owner asks for a change that contradicts those sources, implement the change **and append a new entry** below.
- Each entry should state what was overridden, what we do instead, and why (reference client doc when applicable).

## Entries

### OVR-001 — Signup: single-step credentials only

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | Bubble signup popup (`ai_RNbBHWbk`) multi-step wizard (SHELL-04): timezone, coaching mode, sub-mode, goals, preferences, check-in frequency |
| **Authoritative spec** | `docs/Unclouded Platform_ Detailed User Stories.md` — **US-001** (email, password, confirm password) |
| **Current behavior** | Signup: email, password, confirm password only (US-001). First and last name are collected on **onboarding step 1** (`OnboardingName`) and persisted to `profiles.firstName` / `profiles.lastName`. |
| **Code** | `frontend/src/components/shell/SignupPopup.tsx` |

### OVR-002 — Profile: email read-only

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | Bubble profile tab email input + password-gated email change (`profileApi` / UpdateCredentials workflow) |
| **Authoritative spec** | Owner requirement — email is identity from auth, not editable in settings |
| **Current behavior** | Email shown as plain text on Profile tab. Not saved on profile update. |
| **Code** | `frontend/src/components/settings/SettingsProfileTab.tsx`, `frontend/src/lib/settings/profileApi.ts` |

### OVR-003 — Settings: removed tabs

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | Bubble settings tabs: Coaching, Privacy, Workplace, Notifications (`settings_tab_os` / SET-03, SET-04, SET-06, workplace tab) |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | User settings tabs: **Profile**, **Security**, **Subscription** only (+ Admin for admins). |
| **Code** | `frontend/src/lib/enums/settingsTabs.ts`, `frontend/src/components/settings/SettingsMain.tsx` |

### OVR-004 — Account deletion in Security (not Privacy)

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | Bubble Privacy tab “Delete Account & Data” + privacy info sections (SET-04) |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | Delete account + confirm popup live under **Security** tab. Privacy tab and export-my-data UI removed with OVR-003. |
| **Code** | `frontend/src/components/settings/SettingsSecurityTab.tsx`, `frontend/src/lib/settings/securityApi.ts` (`requestAccountDeletion`) |

### OVR-005 — Journal: entries only (no Milestones tab)

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | Bubble journal page tab bar with **Journal** + **Milestones** (`JOURNAL-05` / `JOURNAL-06` / `JOURNAL-07`): milestone list, relapse tracking, add/edit milestone popups |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | `/journal` shows journal entries only — no Milestones tab, relapse log, or milestone popups. Page title is **Journal** (not “Journal & Milestones”). |
| **Code** | `frontend/src/pages/Journal.tsx`, `frontend/src/components/journal/JournalPageContent.tsx` |

### OVR-006 — Reassessment scored instrument matches live onboarding

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | `docs/Uncloud360_Phase2_Requirements_v3.docx.md` Section 2 — «6 Stability + 5 Performance + 5 Alignment» scored questions |
| **Authoritative spec** | Clinical validity requires the reassessment instrument to be identical to live onboarding |
| **Current behavior** | Reassessment repeats the same scored steps as onboarding: 5 Stability + 5 Performance + 5 Alignment + Orientation (via `OnboardingStability` / `OnboardingPerformance` / `OnboardingAlignment` / `OnboardingOrientation`). No parallel 6-question Stability set. |
| **Code** | `frontend/src/components/ReassessmentFlow.tsx`, `frontend/src/lib/enums/onboardingQuestions.ts` |

### OVR-008 — About You profile fields on Settings Profile tab

| | |
|---|---|
| **Date** | 2026-07-17 |
| **Overrides** | `docs/Uncloud360_Profile_Fields.docx.md` — snake_case fields on User table; dedicated Settings tab |
| **Authoritative spec** | Same doc — 14 optional About You fields, AI context block, timezone auto-detect |
| **Current behavior** | About You card inside **Profile** tab (not a separate tab). Fields stored as camelCase columns on `public.profiles`. AI chat appends `User context: …` for populated fields only. Empty About You **Employment status** / **Career stage** are prefilled from onboarding `roleType` on load (never overwrite saved values). |
| **Code** | `frontend/src/components/settings/SettingsAboutYouSection.tsx`, `frontend/src/lib/settings/profileApi.ts`, `supabase/migrations/20260717120000_profiles_about_you_fields.sql`, `supabase/functions/chat/prompt/aboutYouContext.ts` |

### OVR-007 — PuP 360 PDF via edge function + jspdf + Storage

| | |
|---|---|
| **Date** | 2026-07-16 |
| **Overrides** | `docs/Uncloud360_Phase2_Requirements_v3.docx.md` Section 3 — Bubble PDF Monkey / DocRaptor / native HTML-to-PDF plugins |
| **Authoritative spec** | Section 3 content matrix (Pro summary + Premium diagnostic) and “developer recommends” tool choice; US-302 / US-303 / US-801 |
| **Current behavior** | AI narrative + data assembly in Supabase edge function `generate-pup-pdf`; PDF bytes rendered client-side with `jspdf`; files stored in private Storage bucket `pup-pdf-reports`; download on reassessment results and dashboard. |
| **Code** | `supabase/functions/generate-pup-pdf/`, `frontend/src/lib/reassessment/pdf/`, `supabase/migrations/20260716200000_assessment_result_pdf.sql` |

### OVR-009 — Deep-dive modules: all 6 on Free tier

| | |
|---|---|
| **Date** | 2026-07-17 |
| **Overrides** | `docs/Uncloud360_Complete_Build_Brief DRAFT 4.9.2026.docx.md` §12 — «Deep-dive modules: First 1 free / All 6 Pro»; upsell trigger «You've unlocked your first deep-dive. There are 5 more waiting — Pro members access all 6.» |
| **Authoritative spec** | `docs/Uncloud360_Phase2_Requirements_v3.docx.md` §1 — Free tier includes **All 6 deep-dive assessment modules**; Pro differentiated by sessions, paths, reassessment, journal AI — not module count |
| **Current behavior** | All 6 deep-dive modules available on **Free** after time-based unlock (Build Brief §10). No tier paywall on module access or completion. Module tier gating (TEMP doc §4) is **out of MVP scope**. |
| **Code** | (future) `frontend/src/lib/modules/` — no `tierGate` for modules; existing tier gates remain sessions (`tierGateHelpers.ts`), paths (`pathEnrollmentMatching.ts`), journal AI only |

### OVR-010 — Know Yourself Deeper on Profile tab

| | |
|---|---|
| **Date** | 2026-07-17 |
| **Overrides** | Bubble settings tab pattern; any design that adds a dedicated Settings tab for deep-dive modules |
| **Authoritative spec** | Build Brief §9 delivery rule — modules surfaced in user profile under **Know Yourself Deeper**; OVR-003 — Settings tabs limited to Profile / Security / Subscription |
| **Current behavior** | **Know Yourself Deeper** section lives inside **Settings → Profile** tab (below About You), not a new Settings tab. Optional nested route (e.g. `/settings/profile/know-yourself/:moduleSlug`) is allowed within Profile context. Section title: **Know Yourself Deeper**; per-module subtitle uses Build Brief §10 Presentation Copy. |
| **Code** | `frontend/src/components/settings/SettingsProfileTab.tsx`, `frontend/src/components/settings/SettingsKnowYourselfSection.tsx`, `frontend/src/components/settings/knowYourself/ModuleListCard.tsx`, `frontend/src/lib/modules/moduleListState.ts` |

### OVR-011 — Onboarding module preview from §10 scheduler

| | |
|---|---|
| **Date** | 2026-07-17 |
| **Overrides** | Placeholder `moduleMap` in `frontend/src/lib/classification.ts` (classification → marketing names like «The Inner Audit», «Foundation Reset», days 1–2) |
| **Authoritative spec** | Build Brief §5 — Module Preview: «Your first deep-dive: [Module Name] — available in [X] days» **based on trigger schedule** (§10); display names from Build Brief §9 module titles |
| **Current behavior** | Onboarding Results preview shows the **earliest scheduled module** from §10 scheduler output (`getModuleAvailability`), not classification-based marketing labels. `profiles.results.first_module` / `module_days` written from scheduler at `completeOnboarding`. Deprecate/remove `classification.ts` `moduleMap` when scheduler ships (p.3 / p.8). |
| **Code** | `frontend/src/lib/modules/moduleScheduler.ts` (`computeOnboardingModulePreview`), `frontend/src/components/OnboardingResults.tsx`, `frontend/src/lib/completeOnboarding.ts`, `frontend/src/pages/Onboarding.tsx` |

