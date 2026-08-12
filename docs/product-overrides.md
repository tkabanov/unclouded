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
| **Current behavior** | User settings tabs: **Profile**, **Security** only. Subscription management is a dedicated sidebar route `/subscription` (OVR-051). Admins use `/admin`. |
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

### OVR-026 — Founding Member: 100 seats, $19 for 12 months, then standard Pro

| | |
|---|---|
| **Date** | 2026-07-27 |
| **Overrides** | Phase 2 §1 and US-203 — "first **200** users, $19/month **locked for life**" |
| **Authoritative spec** | `docs/Unclouded _ Individual Subscription Management Flow.md` (owner confirmed in session) |
| **Current behavior** | The campaign has **100 seats**, enforced in SQL by `claim_founding_member_slot` under an advisory lock so it cannot be oversold. The $19 Pro rate runs for **12 months**; the daily lifecycle cron then moves the Stripe subscription onto the standard $29 Pro price and releases the seat. The member is told the conversion date on the subscription screen. Upgrading to Premium **permanently forfeits** the discount, and the confirmation dialog says so. Canceling and letting the period expire also **permanently forfeits** the discount (`billing_expire_subscription` → `billing_forfeit_founding_discount`); resume before expiry keeps $19. After forfeit, Free→Pro checkout is standard $29 even if `signupPlan` was founding. |
| **Code** | `supabase/migrations/20260727100000_individual_subscription_lifecycle.sql`, `supabase/migrations/20260727110000_billing_subscription_rpcs.sql`, `supabase/migrations/20260804130000_billing_expire_forfeit_founding.sql`, `supabase/functions/subscription-lifecycle/index.ts`, `supabase/functions/_shared/foundingMember.ts`, `frontend/src/lib/subscription/subscriptionCopy.ts` |

### OVR-027 — Premium 1:1 sessions run on monthly credits, not "included"

| | |
|---|---|
| **Date** | 2026-07-27 |
| **Overrides** | Phase 2 §7 — 1:1 coaching "included with Premium membership", **50 minutes**, priced $0 in Wix |
| **Authoritative spec** | `docs/Unclouded _ Individual Subscription Management Flow.md` (owner confirmed in session) |
| **Current behavior** | Premium accrues **one credit per paid month**; **two credits** book one **30-minute** session. Requesting a session places a **hold** on the credits so the same credits cannot be booked twice, the hold becomes a redemption once the session is confirmed, and it is released — by cancellation or by the daily sweep after 14 days — if the session never happens. Unused credits expire when Premium access ends or a downgrade takes effect. |
| **Open question** | Session length is 30 minutes per the new doc; Phase 2 §7 says 50. Confirm with the client before the coaching team publishes availability. |
| **Code** | `supabase/migrations/20260727120000_premium_credits_and_bookings.sql`, `frontend/src/lib/coach/coachBookingApi.ts`, `frontend/src/lib/coach/coachBookingEntitlements.ts`, `frontend/src/components/coach/BookCoachCard.tsx` |

### OVR-028 — One group session a month is included in Pro (no $97 add-on)

| | |
|---|---|
| **Date** | 2026-07-27 |
| **Overrides** | Phase 2 §1 — group coaching sold as a **$97/month add-on** |
| **Authoritative spec** | `docs/Unclouded _ Individual Subscription Management Flow.md` (owner confirmed in session) |
| **Current behavior** | Pro and Premium include **one group session per calendar month**. The cap is enforced server-side by `request_group_session_booking` plus a partial unique index on `(userId, periodMonth)`, replacing the previous toast that recorded nothing. |
| **Code** | `supabase/migrations/20260727120000_premium_credits_and_bookings.sql`, `frontend/src/components/coach/BookCoachCard.tsx` |

### OVR-029 — Returning to Free happens only through cancellation

| | |
|---|---|
| **Date** | 2026-07-27 |
| **Overrides** | Previous "Switch to Free" button, which called `request_subscription_plan_change('free')` and reset entitlement instantly; Bubble plan-picker semantics where every card is selectable |
| **Authoritative spec** | `docs/Unclouded _ Individual Subscription Management Flow.md` — the Free card carries no action while a paid plan is active |
| **Current behavior** | The Free card shows **Current plan** or no button at all. A paid member cancels or schedules a downgrade instead, keeps full access until the date, and can resume before it. The instant-downgrade RPC and the demo billing stubs (`open_billing_portal`, `list_billing_invoices`) are dropped, and `billing_webhook_set_entitlement` is retired so `userSubscription` stays the only writer of entitlement. |
| **Code** | `supabase/migrations/20260727110000_billing_subscription_rpcs.sql`, `supabase/migrations/20260727140000_paid_feature_server_enforcement.sql`, `frontend/src/lib/subscription/subscriptionActions.ts`, `frontend/src/components/settings/SettingsSubscriptionTab.tsx` |

### OVR-030 — Dashboard: Daily Check-In only (no Quick Check-In)

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | Prompt Library Addendum — lightweight "Quick Check-in" dashboard mode (`session_type = quick_checkin`, pulse + one-sentence acknowledgment) |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | Dashboard exposes **Daily Check-In** only. Quick Check-In card, client submit API, and chat `quick_checkin` session mode are removed. Existing DB rows may still store historical `quick_checkin` session types. |
| **Code** | `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/dashboard/DashboardCheckinCard.tsx`, `supabase/functions/chat/index.ts` |

### OVR-031 — No Services floating panel (Your paths)

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | Bubble FG - services (`bTJEO`) / DASH-07 `ServicesFloatingPanel` fixed bottom-right enrollment list |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | The fixed bottom-right **Your paths** floating panel is removed. Path enrollments remain available via Dashboard current-path card and Paths page. |
| **Code** | `frontend/src/pages/Dashboard.tsx` (component deleted) |

### OVR-032 — No Dashboard Coaching Insights card

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | Dashboard insights feed card (`DashboardInsightsCard` / personalized articles) |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | **Superseded by OVR-049** — Dashboard again shows the Coaching Insights card. (Historical: card was removed 2026-07-31; Admin Insights tooling remained.) |
| **Code** | `frontend/src/pages/Dashboard.tsx`, `frontend/src/components/dashboard/DashboardInsightsCard.tsx` |

### OVR-033 — Settings modules section titled Coaching Insights

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | Settings Profile “Know Yourself Deeper” section heading |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | Settings → Profile deep-dive modules section is labeled **Coaching Insights** (same module list; title only). |
| **Code** | `frontend/src/components/settings/SettingsKnowYourselfSection.tsx` |

### OVR-034 — No Paths enrollment floating bar

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | Bubble FG - services (`bTItS`) / PATHS-06 `EnrollmentFloatingBar` enrolled-path switcher strip |
| **Authoritative spec** | Owner requirement |
| **Current behavior** | Paths → My Paths does not show the horizontal enrolled-path chip strip. Enrollments remain in the Paths grid. |
| **Code** | `frontend/src/pages/Paths.tsx` (component deleted) |

### OVR-035 — Admin user deactivate (Active / Deactivated)

| | |
|---|---|
| **Date** | 2026-07-31 |
| **Overrides** | US-503 “User data is read-only to prevent accidental changes” for all fields |
| **Authoritative spec** | `docs/Admin Account Set-Up.md` — User management Status Active / Deactivated |
| **Current behavior** | Admin Users tab is read-only for profile/subscription/path data. **Exception:** platform admin may Activate / Deactivate a non-admin user (`profiles.isActive` + `deactivatedAt` via `admin_set_profile_active`, plus auth ban through `admin-users` edge). Admins cannot deactivate themselves or other admins. |
| **Code** | `frontend/src/components/settings/admin/AdminUsersTab.tsx`, `supabase/functions/admin-users/index.ts`, `supabase/migrations/20260731120000_admin_account_setup.sql` |

### OVR-036 — Pro plan copy: no Coaching Insights feed promise

| | |
|---|---|
| **Date** | 2026-08-04 |
| **Overrides** | `docs/Unclouded _ Individual Subscription Management Flow (1).md` — Pro tier «Coaching insights feed — 3 personalized articles daily» |
| **Authoritative spec** | OVR-032 — Dashboard Coaching Insights card removed; owner confirmed follow OVR-032 for subscription marketing copy |
| **Current behavior** | Pro plan cards (Settings subscription screen, landing pricing, locked-feature upsells) do **not** promise a user-facing daily insights feed. Admin Insights feed tooling remains for content ops only. |
| **Code** | `frontend/src/lib/subscription/planCatalog.ts`, `frontend/src/pages/Index.tsx`, `frontend/src/lib/subscription/lockedFeatureUpsell.ts` |

### OVR-037 — Path library authority: `docs/new_paths_content/` batch files

| | |
|---|---|
| **Date** | 2026-08-04 |
| **Overrides** | `docs/new_paths_content/Uncloud360_Canonical_Path_Library.md` status table (Phase 2 marked «TO WRITE») and its Phase 2 numbering when it conflicts with authored batch files |
| **Authoritative spec** | Batch markdown under `docs/new_paths_content/` (Batches 1–10 + Success Plan Paths); Canonical names/pillars for catalog metadata |
| **Current behavior** | Runtime catalog is seeded from those batches via `scripts/seed_paths_from_docs.py` → `supabase/migrations/20260804160000_seed_paths_library_from_new_docs.sql`. Authored library paths are **4–54** (plus existing Paths **1–3** and **The Unsent Letter**). «Clarity & Priority Reset» has no authored session content; it is seeded as a **catalog stub** (`path-55`, Pro / Professional, `sessionsCount: 0`) so the self-select library is 55 names. **Recovery Roadmap** pillar is **emotional** (Canonical), not legacy Bubble `health` — see `20260804170000_fix_pl_cat_003_pillar_distribution.sql`. Pillar totals from Canonical detailed list: Emotional **26** / Professional **20** / Health & Wellness **9**. Success Plan access is **OVR-038** (not free self-select). Classification UI recommendations use written path names only. |
| **Code** | `scripts/seed_paths_from_docs.py`, `supabase/migrations/20260804160000_seed_paths_library_from_new_docs.sql`, `supabase/migrations/20260804170000_fix_pl_cat_003_pillar_distribution.sql`, `frontend/src/lib/classification.ts` |

### OVR-038 — Success Plans: Pro/Premium add-on or HR assign

| | |
|---|---|
| **Date** | 2026-08-05 |
| **Overrides** | `docs/new_paths_content/Uncloud360_Success_Plan_Paths.md` — «Available to all tiers» / unrestricted user self-select without purchase |
| **Authoritative spec** | Owner: Success Plans are outside the 55 library count; self-serve requires Pro or Premium **plus** one-time Success Plan add-on (unlocks all 7); HR may assign any Success Plan to a workplace member (including Free seats); Free self-enroll without add-on or assignment is forbidden |
| **Current behavior** | Access via `user_can_access_success_plan`: HR assignment (`pathEnrollment.source = hr_assign`) **or** (effective tier ≥ Pro and active `successPlanAddon`). Catalog badge tier for SP rows is `pro`. Stripe one-time checkout grants the add-on; entitlement for self-serve is gated on effective tier ≥ Pro (downgrade to Free blocks self-serve SP; HR-assigned enrollments remain). Employer portal can assign Success Plans to members. |
| **Code** | `supabase/migrations/20260805140000_success_plan_addon_and_access.sql`, `supabase/functions/stripe-checkout/index.ts`, `supabase/functions/stripe-webhook/index.ts`, `supabase/functions/workplace-assign-success-plan/index.ts`, `frontend/src/lib/paths/successPlanAccess.ts`, `frontend/src/components/employer/EmployerSuccessPlanAssignPanel.tsx` |

### OVR-039 — Reassessment reflections: Section 3 wording + path-adaptive Q4

| | |
|---|---|
| **Date** | 2026-08-06 |
| **Overrides** | `docs/Uncloud360_Phase2_Requirements_v3.docx.md` Section 2 reflection wording; prior runtime adaptive slot on Question 1; `docs/Uncloud360_Reassessment_Questions.docx.md` Section 4 path numbering/names (pre-Canonical list) |
| **Authoritative spec** | `docs/Uncloud360_Reassessment_Questions.docx.md` Part 2 §§3–4 logic (standard Q1–Q4 + adaptive replaces Question 4); path Q4 catalog = Canonical / OVR-037 (`pathSession.reassessmentReflectionQuestion`) |
| **Current behavior** | Four optional unscored reflections use Section 3 copy. Path-adaptive prompt replaces **Question 4** when the user has ≥1 completed path (most recently completed). Path-specific texts are static strings on the final path session (Canonical), not the outdated Section 4 name list. PDF/UI labels use `pathAdaptiveQ` for the adaptive slot. |
| **Code** | `frontend/src/lib/reassessment.ts`, `frontend/src/components/ReassessmentFlow.tsx`, `frontend/src/components/ResultsComparison.tsx`, `supabase/functions/generate-pup-pdf/index.ts` |

### OVR-040 — Results screen copy: static per-classification copy

| | |
|---|---|
| **Date** | 2026-08-07 |
| **Overrides** | Older build-brief results copy; score-heuristic `computeTradeoffStatement` for onboarding/dashboard/PDF display |
| **Authoritative spec** | `docs/Uncloud360_Results_Screen_Copy_All_Classifications.docx.md` |
| **Current behavior** | Onboarding Results, Dashboard assessment card, and client onboarding PDF use per-classification static copy (name, tagline, tradeoff, What This Means, focus areas) from `classification.ts`, resolved by key at render so stale `profiles.results` JSONB still shows live copy. Tradeoff persisted on new completions is the static classification tradeoff. Score colors: &lt;3.2 amber/red, 3.2–3.7 neutral gray, ≥3.8 green. Top 2 recommended path names from enrollment matching (dashboard-config fallback). Standing 988 disclaimer on every results surface. Classification engine rules unchanged. |
| **Code** | `frontend/src/lib/classification.ts`, `frontend/src/components/OnboardingResults.tsx`, `frontend/src/components/dashboard/DashboardAssessmentResultsCard.tsx`, `frontend/src/lib/dashboard/downloadOnboardingResultsPdf.ts`, `frontend/src/lib/dashboard/assessmentScoreStyle.ts`, `frontend/src/lib/share/classificationShareCard.ts` |

### OVR-041 — Classification persist uses Step 12 engine (not Bubble bTHzg)

| | |
|---|---|
| **Date** | 2026-08-07 |
| **Overrides** | Bubble custom event `calculate_user_classification` / `bTHzg` (`resolveClassificationOs`): High Output required `performance >= 4`; any other `stability < 3.2` became Capacity Erosion |
| **Authoritative spec** | Live onboarding Step 12 `computeClassification` in `classification.ts`; `docs/tmp-results-copy-test-scenarios.md` RES-SURF-001 parity |
| **Current behavior** | After onboarding/reassessment save, `calculateUserClassification` uses the same `computeClassification` rules as Step 12 (High Output when stability &lt; 3.2 and performance ≥ 3.5; Capacity Erosion when stability &lt; 3.0 and pressure profile is «System Overload»). Pipeline runs pressure profile **before** classification so that branch can fire. Dashboard assessment card and Step 12 share the same classification key for the same scores. |
| **Code** | `frontend/src/lib/classification.ts` (`computeClassification`), `frontend/src/lib/userProfile/classifyUser.ts`, `frontend/src/lib/userProfile/calculateUserClassification.ts`, `frontend/src/lib/userProfile/onboardingProfilePipeline.ts` |

### OVR-042 — Dashboard Kota daily messages (AI Prompt Spec Prompt 1)

| | |
|---|---|
| **Date** | 2026-08-07 |
| **Overrides** | OVR-032 (no Dashboard Coaching Insights card); OVR-036 (Pro copy must not promise daily insights feed); curated `coachingInsightArticle` / `userDailyInsightFeed` as the user-facing daily feed |
| **Authoritative spec** | `docs/Uncloud360_AI_Prompt_Specifications.docx.md` — Prompt 1 Coaching Insights — Kota's Messages |
| **Current behavior** | Pro/Premium users see a **From Kota / Kota's Messages** dashboard card with three AI-generated insights per day (7-day rolling). Push notification **"Kota left you a message"** fires only after insights are stored. Pro plan marketing may again mention personalized daily Kota insights. Admin curated article tooling may remain for content ops but is **not** the user feed. |
| **Code** | `frontend/src/components/dashboard/DashboardKotaMessagesCard.tsx`, `frontend/src/pages/Dashboard.tsx`, `supabase/functions/generate-daily-insights/`, `supabase/migrations/20260807120000_standalone_ai_prompts.sql`, `frontend/src/lib/subscription/planCatalog.ts` |

### OVR-043 — Transactional email provider: SendGrid (not Resend)

| | |
|---|---|
| **Date** | 2026-08-07 |
| **Overrides** | Interim Supabase edge wiring that called Resend (`RESEND_API_KEY` / `api.resend.com`) for platform transactional mail |
| **Authoritative spec** | Owner request; Phase 2 / US-606 SendGrid direction |
| **Current behavior** | All platform event emails from edge functions go through **SendGrid** Mail Send (`SENDGRID_API_KEY`). Shared helper: `supabase/functions/_shared/sendgridMail.ts`. Default from: `noreply@uncloud360.ai`. When the key is unset, sends are skipped (`smtp:skipped`) and cohorts are still stamped. Supabase Auth templates may use SendGrid SMTP separately in the Dashboard. |
| **Code** | `supabase/functions/_shared/sendgridMail.ts`, `kotaReadDelivery.ts`, `module-unlock`, `notification-milestone`, `vulnerable-outreach`, `reassessment-due`, `onboarding-dropoff`, `subscription-lifecycle`, `generate-coaching-summary`; docs: `supabase/EMAIL_TEMPLATES.md` |

### OVR-044 — Trajectory Statement (Prompt 4): Pro+Premium, assessment storage, static fallback

| | |
|---|---|
| **Date** | 2026-08-07 |
| **Overrides** | `docs/Uncloud360_AI_Prompt_Specifications.docx.md` Prompt 4 header “Available to: Premium”; store `trajectory_statement_text` on User; imply AI text always present |
| **Authoritative spec** | Same doc — Prompt 4 implementation note (Section 3 of both Pro and Premium PDFs); Phase 2 seven static trajectory types as degrade path |
| **Current behavior** | AI Trajectory Statement generates for **Pro and Premium** at reassessment completion (sync). Text is stored on **`assessmentResult.trajectoryStatementText`** (per-cycle history), not on User/profiles. Results screen and PDF prefer AI text; if missing, fall back to static `trajectoryLanguage` by trajectory type. `paths_completed` counts enrollments completed in the reassessment window (previous assessment → current, or 90-day lookback). |
| **Code** | `supabase/functions/generate-trajectory-statement/`, `supabase/functions/_shared/standalonePrompts/trajectoryStatement.ts`, `supabase/functions/generate-pup-pdf/resolveTrajectoryStatement.ts`, `frontend/src/components/ResultsComparison.tsx`, `frontend/src/lib/reassessment/completeReassessment.ts` |

### OVR-045 — Pre-Coaching Brief (Prompt 6): JSON storage + assigned coach email fallback

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Overrides** | `docs/Uncloud360_AI_Prompt_Specifications.docx.md` Prompt 6 — “email the assigned coach's registered email”; store Kota's Read JSON on CoachingBooking; Pro+Premium availability for all human coach bookings |
| **Authoritative spec** | Same Prompt 6 structure (factual + Kota's Read); interim delivery until Coach Workspace (Phase 3) |
| **Current behavior** | Kota's Read is stored as **`kotaReadJson`** on `coachBooking` / `groupSessionBooking` (legacy `kotaRead` TEXT may remain on older rows). Email goes to **`assignedCoachEmail`** when set (Admin Coach briefs can edit it via `admin_set_coach_booking_email`); otherwise **`COACH_BRIEF_INBOX`**. Session memory for the AI call is **last 5 sessions**, ~600 tokens. Prompt 6 edge gate remains Pro+Premium; **1:1 booking itself stays Premium-only** (OVR-027) — Pro reaches Prompt 6 via **group** booking. |
| **Code** | `supabase/migrations/20260810120000_kota_read_json_assigned_coach.sql`, `supabase/functions/generate-kota-read/`, `supabase/functions/_shared/kotaReadBrief.ts`, `kotaReadDelivery.ts`, `frontend/src/components/settings/admin/AdminCoachBookingsTab.tsx`, `frontend/src/lib/settings/admin/adminCoachBookingsApi.ts` |

### OVR-046 — Journal list: AI Reflection expands inline on the card

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Overrides** | Prompt 2 / JOURNAL list UI that only showed an **AI Reflection** indicator (detail popup was the place to read Kota’s note) |
| **Authoritative spec** | Owner request — toggle reflection on the list card |
| **Current behavior** | On `/journal` entry cards, the **AI Reflection** control toggles an inline **From Kota** block (collapsed by default). Full edit still via **View & Edit**. |
| **Code** | `frontend/src/components/journal/JournalEntryCard.tsx` |

### OVR-047 — Settings: hide Success Plan add-on purchase UI during this phase

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | Settings subscription tab “Success Plan add-on” purchase card |
| **Authoritative spec** | Owner instruction for this phase: hide add-ons UI; entitlements remain enforced |
| **Current behavior** | The “Success Plan add-on” purchase option is hidden. If the add-on was already purchased, the tab shows a simple “Success Plan access” message instead of the checkout button. |
| **Code** | `frontend/src/components/settings/SettingsSubscriptionTab.tsx`, `frontend/src/pages/Subscription.tsx` |

### OVR-048 — Admin console: Lovable sidebar shell at `/admin`

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | Prior settings-embedded Admin tab (`/settings?tab=admin`) + AdminRouteGuard locking admins to that route only; Lovable prototype admin IA (Overview / Users / Paths / Organizations only); earlier simple 4-KPI Overview |
| **Authoritative spec** | Owner request — match Lovable admin UI; keep our extra admin features |
| **Current behavior** | Dedicated `/admin` console with Lovable-style left sidebar (Overview, Users, Paths, Organizations + More: Analytics, Resources, Insights, Plans, Outreach, Coach briefs, Reassessments, Prompt Tests). **Overview** matches Lovable preview engagement dashboard (DAU/MAU, median sessions, path completion, seat utilization, subscription pie, classification bars, crisis volume, assessment deltas) while Analytics/etc. stay under More. User detail at `/admin/users/:id` uses Lovable card layout while retaining flags/activity, credit ledger, About you, deactivate, etc. Admins may use the main app via **Back to app**; Settings is Profile / Security only (subscription is OVR-051). Legacy `/settings?tab=admin` redirects to `/admin`. |
| **Code** | `frontend/src/pages/AdminConsole.tsx`, `frontend/src/components/admin/AdminLayout.tsx`, `frontend/src/components/admin/AdminSidebar.tsx`, `frontend/src/components/settings/admin/AdminOverviewTab.tsx`, `frontend/src/lib/settings/admin/adminOverviewApi.ts`, `frontend/src/lib/settings/isSettingsAdminUser.ts`, `frontend/src/components/admin/AdminRouteGuard.tsx` |

### OVR-049 — Restore Dashboard Coaching Insights card (pill design)

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | OVR-032 (no Dashboard Coaching Insights card); visual treatment of Bubble / DASH-05 insights rows |
| **Authoritative spec** | Owner request — restore previously hidden Coaching Insights feed card with updated pill-row design |
| **Current behavior** | Dashboard shows a full-width **Coaching insights** card below the main two-column grid: three personalized articles from `get_my_daily_insight_feed` as light primary-tint rows (Lightbulb / TrendingUp / Star), with disclaimer and click-to-open article dialog. Kota Messages (OVR-042) remain separate. Grid layout for other cards is OVR-050. |
| **Code** | `frontend/src/components/dashboard/DashboardInsightsCard.tsx`, `frontend/src/pages/Dashboard.tsx` |

### OVR-050 — Dashboard main grid Lovable layout + card chrome

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | Prior Bubble/DASH two-column order (Human coaching + Check-In left; Current Path on right); denser Bubble check-in chrome |
| **Authoritative spec** | Owner request — match Lovable dashboard card grid (screenshot parity) |
| **Current behavior** | Left column: **Current path** → Human coaching → Daily check-in. Right: Know yourself deeper → Next deep-dive teaser → AI coach chat → Recent journal. Card chrome follows Lovable (metric icons + `n/10`, streak pill, chat bubble + Open chat CTA, dashed journal empty state, module progress bar). Coaching insights remain full-width below the grid (OVR-049). |
| **Code** | `frontend/src/components/dashboard/DashboardMain.tsx`, `frontend/src/pages/Dashboard.tsx`, `DashboardCheckinCard.tsx`, `DashboardCurrentPathCard.tsx`, `DashboardModulePreviewCard.tsx`, `DashboardNextDeepDiveCard.tsx`, `DashboardChatPreviewCard.tsx`, `DashboardJournalPreviewCard.tsx`, `BookCoachCard.tsx` |

### OVR-051 — Subscription management as sidebar route

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | OVR-003 Settings tabs including Subscription; Bubble/settings-tab subscription management at `/settings?tab=subscription` |
| **Authoritative spec** | Owner request — match Lovable sidebar **Subscription** item at `/subscription` |
| **Current behavior** | Primary sidebar includes **Subscription** (between Paths and Settings). Plan/billing UI renders on `/subscription` with Lovable-style **Plans & subscription** header, Monthly/Yearly toggle, feature comparison matrix, and Founding Member banner. Settings tabs are Profile / Security only. Legacy `/settings?tab=subscription` and `/settings/subscription` redirect to `/subscription` (query params preserved). Stripe Checkout/Portal return URLs use `/subscription`. |
| **Code** | `frontend/src/pages/Subscription.tsx`, `frontend/src/components/AppSidebar.tsx`, `frontend/src/lib/enums/navigation.ts`, `frontend/src/lib/subscription/routes.ts`, `frontend/src/lib/subscription/planComparisonMatrix.ts`, `frontend/src/components/subscription/SubscriptionComparisonTable.tsx`, `frontend/src/lib/router/authenticatedRoutes.tsx`, `supabase/functions/stripe-checkout/index.ts`, `supabase/functions/stripe-portal/index.ts` |

### OVR-052 — Path CMS: media deferred; inline modules; Enabled/Disabled

| | |
|---|---|
| **Date** | 2026-08-12 |
| **Overrides** | Module 2 Path Content Management — Create Path form fields for media assets; separate sessions-only editor entry point |
| **Authoritative spec** | Owner request — close Module 2 gaps without media upload; modules live in Create/Edit Path |
| **Current behavior** | Admin Paths (`/admin` Paths): library by Free/Pro/Premium with quick filters for **tier** and **Enabled/Disabled**. Create/Edit Path dialog includes inline **Modules** (sessions: title, coaching text, Q1–Q3, micro-commitment, reassessment reflection) saved via `syncAdminPathSessions`. Visibility toggle is Enable/Disable (`path.isActive`) without deleting data. **Media assets** on paths/sessions are **not** implemented (no cover/upload fields). |
| **Code** | `frontend/src/components/settings/admin/AdminPathsTab.tsx`, `frontend/src/components/settings/admin/AddPathPopup.tsx`, `frontend/src/components/settings/admin/AdminPathSessionFields.tsx`, `frontend/src/lib/settings/admin/adminPathSessionsApi.ts` |

