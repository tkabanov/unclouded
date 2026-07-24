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

### OVR-012 — Crisis edge hard-stop: 988/741741 only (not FINAL Level 4 911/ER script)

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | `docs/Uncloud360_Complete_Prompt_Library_FINAL.docx.md` Layer 1 — Level 4 imminent danger script («call 911 or go to your nearest emergency room» + 988) |
| **Authoritative spec** | Safety + engineering — regex-detected Level 2+ on the chat edge must return one deterministic hard-stop; no LLM-generated crisis copy; no 911/ER routing from the coaching edge |
| **Current behavior** | `classifyCrisisLevel` still distinguishes L2/L3/L4 for logging and prompt tests. **All L2+ regex matches** return the single mandatory `CRISIS_RESPONSE_MANDATORY` (988 + Crisis Text Line 741741) from `library.ts` / `crisisDetect.ts` — not the FINAL Level 4 911/ER wording. Layer 1 prompt text retains FINAL Level 4 guidance for model context only; the edge does not execute it. App disclaimers (signup, welcome, email) may still mention 911 separately. |
| **Code** | `supabase/functions/chat/crisisDetect.ts`, `supabase/functions/chat/prompt/library.ts`, `supabase/functions/chat/index.ts`, prompt test `crisis-002`–`crisis-004` |

### OVR-013 — Layer 10 session memory item 2: Pro/Premium content on Free tier

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | `docs/Uncloud360_Complete_Prompt_Library_FINAL.docx.md` Layer 10 item 2 — last 5 session summaries always populated |
| **Authoritative spec** | Build Brief §12 — session memory is **Advanced Intelligence / Pro tier**; FINAL Layer 10 block still **always assembles** (When active: Always) |
| **Current behavior** | Free users receive the full Layer 10 structure every session. Item 2 shows an explicit tier gate line instead of session summaries; items 1, 3–11 still populate normally. Opening ritual may use `last_session_topic` without full memory detail on Free. |
| **Code** | `supabase/functions/chat/prompt/chatContext.ts`, `supabase/functions/chat/tierGateHelpers.ts`, `supabase/functions/chat/prompt/sessionLifecycle.ts` |

### OVR-014 — REQ-13 prompt library: DB versioning + promote gate (partial)

| | |
|---|---|
| **Date** | 2026-07-20 (revised) |
| **Overrides** | Prior OVR-014 — staging-only prompt tests without draft library workflow |
| **Authoritative spec** | Addendum REQ-13 — DB-backed draft/prod prompt library, approval audit, promote gate |
| **Current behavior** | `promptLibraryVersion` / `promptLibraryLayer` tables hold versioned prompt text. Admin Prompt Test Suite supports create draft from production, per-layer edit, run 30 scenarios against a draft (`promptLibraryVersionId`), save test run, approve, and promote via `prompt-library` edge function (approval required). Runtime `buildSystemPrompt` loads production (or draft override) from DB with TS constant fallback. `chat-staging` may set `PROMPT_LIBRARY_PREFER_DRAFT=true` for latest-draft resolution. |
| **Code** | `supabase/migrations/20260720200000_prompt_library_db.sql`, `supabase/functions/chat/prompt/loadPromptLibraryVersion.ts`, `supabase/functions/prompt-library/`, `frontend/src/components/settings/admin/AdminPromptTestSuite.tsx` |

### OVR-015 — REQ-16 analytics from coaching session archive

| | |
|---|---|
| **Date** | 2026-07-20 (revised) |
| **Overrides** | Prior OVR-015 — analytics from capped `chat_session_memory` only |
| **Authoritative spec** | Addendum REQ-16 — longitudinal review from full session archive at 6/12/18 months |
| **Current behavior** | Admin prompt library review analytics primary source is `coachingSessionArchive` (unbounded finalized sessions). Pre-archive users fall back to `profiles.onboardingData.chat_session_memory` (≤5). Admin Analytics tab includes review cadence checklist and **Export session archive CSV** for formal Dr. Sam reviews. JSON cap remains for Layer 10 prompt window only. |
| **Code** | `frontend/src/lib/admin/promptLibraryReviewAnalytics.ts`, `frontend/src/components/settings/admin/AdminAnalyticsTab.tsx`, `supabase/migrations/20260720190000_coaching_session_archive.sql` |

### OVR-016 — Extra prompt overlays beyond FINAL doc wiring table

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | FINAL prompt library — «wire from this document only» for layered context |
| **Authoritative spec** | Build Brief §11 (coaching mode stack, fingerprint modifiers, module-complete) + Addendum REQ-15 (directed writing witness mode) |
| **Current behavior** | `buildSystemPrompt` stacks Protector/Simplifier overlays, behavioral fingerprint modifiers, module-complete modifiers, and directed-writing witness context from Build Brief / Addendum — not duplicated verbatim in FINAL Layer wiring. |
| **Code** | `supabase/functions/chat/buildSystemPrompt.ts`, `supabase/functions/chat/prompt/resolveCoachingModes.ts`, `supabase/functions/chat/prompt/library.ts` |

### OVR-017 — Longitudinal memory phrasing and fact aging

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | Addendum Block 3.29 — never «I remember you mentioned…»; per-fact dates for aging verification |
| **Authoritative spec** | Use opening-ritual phrasing («Last time you said…»); stamp new memory-fact items with `YYYY-MM-DD\|text` on extraction; legacy undated rows remain until refreshed |
| **Current behavior** | `formatReturningMemoryHint` uses «Last time you said: …» not «I remember: …». New extractions date-stamp items; Layer 10 block shows `date — fact` lines plus row `lastUpdated`. Items extracted before this change have no per-item date until re-extracted. |
| **Code** | `supabase/functions/chat/sessionMemory/sessionMemoryHelpers.ts`, `supabase/functions/chat/sessionMemory/memoryFactItemHelpers.ts`, `supabase/functions/chat/extractMemoryFacts.ts`, `supabase/functions/chat/loadServerLiveContext.ts` |

### OVR-018 — Customer role multi-select (onboarding + profile)

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | Bubble onboarding `customer_role_os` single-select chip step; profile docs implying one primary customer role |
| **Authoritative spec** | Owner requirement — users may identify with multiple simultaneous roles (e.g. professional + caregiver) |
| **Current behavior** | Onboarding role step and Settings → Profile → About You **Current roles** use multi-select chips. Values persist in `profiles.roleTypes` (`text[]`). Legacy `profiles.roleType` stores the primary slug (first in canonical order) for admin gate and backward-compatible readers. Performance onboarding copy uses the primary role among selections. |
| **Code** | `frontend/src/components/OnboardingRole.tsx`, `frontend/src/components/CustomerRoleChipGroup.tsx`, `frontend/src/components/settings/SettingsAboutYouSection.tsx`, `frontend/src/lib/enums/customerRoleTypes.ts`, `supabase/migrations/20260720170000_profiles_role_types_array.sql` |

### OVR-019 — Unsent Letter path: Free tier with health-flag access

| | |
|---|---|
| **Date** | 2026-07-20 |
| **Overrides** | Seed migration `tier: 'pro'` on The Unsent Letter path; general Pro path tier model |
| **Authoritative spec** | Addendum REQ-15 — Directed Writing available when grief_mode, recovery_mode, or transition_flag active (no Pro gate) |
| **Current behavior** | The Unsent Letter path is **`tier: free`**. Visibility still requires grief OR recovery OR transition flag. Other Pro paths remain tier-gated. |
| **Code** | `supabase/migrations/20260720180000_unsent_letter_path_free_tier.sql`, `frontend/src/lib/paths/pathEnrollmentMatching.ts`, `frontend/src/components/paths/PathCatalogCard.tsx` |

### OVR-020 — Session close: End session button; phase 6 without extra user turn

| | |
|---|---|
| **Date** | 2026-07-21 |
| **Overrides** | Build Brief §14 phase 6 wording («How are you leaving this conversation?» as a user-answered close); AI Prompt Library §9 templates that assume commitment already stated in the same close turn |
| **Authoritative spec** | US-306 (synthesis + clear ending); Block 3.33 (values bridge after commitment agreed); Build Brief phase 5 micro-commitment question |
| **Current behavior** | User taps **End session**. Kota asks for one micro-commitment (`session_close`). User replies once. Kota acknowledges with values bridge + ending statement (`session_close_ack`) — no extra «How are you leaving…?» turn — then `session_finalize` persists memory. Close/ack use dedicated prompts (not the full coaching stack) so the commitment question is not echoed. |
| **Code** | `supabase/functions/chat/prompt/sessionLifecycle.ts`, `supabase/functions/chat/index.ts`, `frontend/src/components/chat/ChatPanelMount.tsx`, `frontend/src/lib/chat/chatSessionLifecycleApi.ts` |

### OVR-021 — Referrals: organic-only (no ReferralPartner entity)

| | |
|---|---|
| **Date** | 2026-07-22 |
| **Overrides** | Bubble `ReferralPartner` data type (US-902 AC: “ReferralPartner data type exists”); separate B2B partner portal |
| **Authoritative spec** | US-902 (unique referral links); US-903 (admin partner effectiveness) |
| **Current behavior** | **Organic model:** each user gets `profiles.referralCode` (share card / REQ-09). Inbound attribution via `profiles.referredByUserId` (FK to referrer) with `profiles.referredByReferralCode` as signup URL snapshot. Admin aggregates sign-ups + paid conversions per referrer. Users see own referral count via `count_my_referral_signups()`. Optional static admin labels map known B2B codes to display names — no DB entity. |
| **Deferred** | `referralPartner` table, partner login portal, commission tracking |
| **Code** | `frontend/src/lib/share/referralCodeApi.ts`, `frontend/src/lib/share/referralAttribution.ts`, `frontend/src/lib/settings/admin/referralSignUpAnalytics.ts`, `frontend/src/lib/share/referralStatsApi.ts`, `frontend/src/lib/settings/admin/referralPartnerLabels.ts` |

### OVR-022 — Workplace roster: admin + HR member and role management

| | |
|---|---|
| **Date** | 2026-07-23 |
| **Overrides** | Bubble/migration assumption that only platform admin assigns org membership; HR access only via single `contactEmail` with no roster UI |
| **Authoritative spec** | Owner request — admin and HR add people and manage HR/manager rights |
| **Current behavior** | Admin → Workplaces and `/employer` include **Workplace members** panel: add existing accounts by email, **send email invitations** for new users (auto-enroll on signup), remove members, toggle delegated **HR** and **Manager**, wire direct reports. Primary HR remains `workplace.contactEmail`. HR delegates also gain employer portal via role table. |
| **Code** | `supabase/migrations/20260723180000_workplace_member_management.sql`, `supabase/migrations/20260723190000_workplace_invitations.sql`, `supabase/functions/workplace-members/`, `frontend/src/components/workplace/WorkplaceMembersPanel.tsx`, `frontend/src/lib/workplace/workplaceMembersApi.ts` |

### OVR-023 — Manager aggregate legal banner (env-gated)

| | |
|---|---|
| **Date** | 2026-07-24 |
| **Overrides** | REQ-11 UI requirement to always show «Legal review required before deployment» on manager team aggregate |
| **Authoritative spec** | REQ-11 counsel sign-off before production manager view |
| **Current behavior** | Amber legal banner is **hidden by default** (dev and current deploys). Set `VITE_MANAGER_AGGREGATE_LEGAL_BANNER=true` when counsel gate must block the view again. Aggregate metrics card still renders below when data is available. |
| **Code** | `frontend/src/components/employer/ManagerTeamAggregatePanel.tsx` |

### OVR-024 — HR workplace aggregate opt-in on Profile

| | |
|---|---|
| **Date** | 2026-07-24 |
| **Overrides** | Test doc row implying only `workplaceId` employees see Profile opt-in |
| **Authoritative spec** | Owner request — HR users need the same anonymized-data consent toggle as enrolled employees |
| **Current behavior** | Settings → Profile shows **Workplace team aggregate** opt-in when the user has `profiles.workplaceId` **or** HR access to any workplace (primary contact or delegated HR). Same `managerAggregateOptIn` field; HR-only users see workplace-focused helper copy. |
| **Code** | `frontend/src/components/settings/SettingsWorkplaceAggregateSection.tsx`, `frontend/src/hooks/useHrWorkplaces.ts` |

### OVR-025 — Primary HR auto-enrollment when workplace is created

| | |
|---|---|
| **Date** | 2026-07-24 |
| **Overrides** | Gap doc note that HR contact email alone does not set `profiles.workplaceId` |
| **Authoritative spec** | Owner request — HR contact account should be enrolled in the workplace automatically |
| **Current behavior** | On workplace **INSERT** or **contactEmail** / **isActive** update, and on **signup** when email matches `workplace.contactEmail`, the matching profile is enrolled via `enroll_profile_in_workplace` (enterprise tier, `workplaceId`, seats). Existing workplaces backfilled once in migration. |
| **Code** | `supabase/migrations/20260724100000_sync_workplace_hr_contact_enrollment.sql` |

