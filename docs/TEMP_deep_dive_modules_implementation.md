# Deep-dive modules («Know Yourself Deeper») — декомпозиция имплементации

> **Временный документ** для планирования. Удалить или перенести в постоянную спецификацию после старта работ.
>
> Источники: Build Brief §2, §5–13, §18; AI Prompt Library §7; OVR-003 (Settings tabs).

---

## 0. Продуктовые решения (до кода) — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Спека: [`docs/deep-dive-modules-spec.md`](deep-dive-modules-spec.md). Overrides: OVR-009, OVR-010, OVR-011.

| Решение | Итог |
|---------|------|
| **Gating** | Phase 2 — все 6 модулей на Free (OVR-009). Build Brief §12 «1 free / 6 Pro» не применяется. TEMP §4 вне MVP. |
| **Surface** | Секция **Know Yourself Deeper** внутри Profile tab, не новый tab (OVR-010). |
| **Превью онбординга** | §10 scheduler + Build Brief §9 titles; deprecate `classification.ts` `moduleMap` (OVR-011). |
| **History module** | Copy/skip/crisis/trauma flag — в spec §7. Atomic submit, no draft. |
| **Persistence** | Atomic submit at end; in-memory only до submit. |

**Checklist:** OVR-009..011 ✓ · spec ✓ · owner sign-off — pending (defaults из planning session 2026-07-17).

---

## 1. Модель данных и схема БД — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Миграция [20260717140000_profiles_deep_dive_module_fields.sql](../supabase/migrations/20260717140000_profiles_deep_dive_module_fields.sql).

| Артефакт | Статус |
|----------|--------|
| 34 колонки на profiles | done |
| Regen 	ypes.ts | done |
| rontend/src/lib/modules/ read helpers | done |
| Edge read path | done |
| Zero-init onboarding | done |
| RLS | unchanged |

**Следующий шаг:** §3 — scheduler.

---

## 2. Контент и конфигурация модулей (код как source of truth) — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** `frontend/src/lib/modules/` — types, 6 definition files, registry, side effects, public API, tests.

| Артефакт | Статус |
|----------|--------|
| `moduleConfigTypes.ts` | done |
| `definitions/*.ts` (6 modules, Build Brief §9 copy) | done |
| `moduleRegistry.ts` + `moduleSideEffects.ts` | done |
| `moduleConfigApi.ts` (get/validate/map/side effects) | done |
| `index.ts` + metadata exports (`MODULE_AI_SHORT_NAMES`, etc.) | done |
| `moduleRegistry.test.ts` (11 tests) | done |

**Gate:** `getModuleDefinition("identity")` → 8 questions, 4 persisted, presentation copy populated; validate/map/side effects без хардкода в UI.

**Следующий шаг:** §5 — UI список модулей.

---

## 3. Движок расписания и unlock (Section 10) — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Scheduler в `frontend/src/lib/modules/`; wired в `completeOnboarding` + `OnboardingResults`.

| Артефакт | Статус |
|----------|--------|
| `moduleSchedulerTypes.ts` | done |
| `moduleAcceleratedTriggers.ts` (6 правил §10) | done |
| `moduleScheduler.ts` (build/preview/availability) | done |
| `completeOnboarding` → `moduleSchedules` + results preview | done |
| `OnboardingResults` — scheduler preview (OVR-011) | done |
| `classification.ts` `moduleMap` удалён | done |
| `moduleScheduler.test.ts` (14 tests) | done |

**Gate:** default + accelerated triggers; `getModuleAvailability`; preview = Body's Story / 5 days без triggers.

**Следующий шаг:** §5 — UI «Know Yourself Deeper» читает `getModuleAvailability`.

---

## 4. Tier gating (Section 12) — **OUT OF MVP**

> **OVR-009:** все 6 модулей на Free. Paywall по tier для deep-dive **не реализуется** в MVP.

~~**Цель:** Free vs Pro ограничивает доступ к модулям.~~

- ~~Правило: Free — первый модуль~~
- ~~Pro/Premium — все 6~~
- Отложено на full product, если owner изменит tier policy.

**Gate (full product only):** Free user видит 1 доступный + 5 paywalled; Pro — все после unlock по расписанию.

---

## 5. UI: список модулей («Know Yourself Deeper») — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Profile list UX + shared list state + tests.

| Артефакт | Статус |
|----------|--------|
| `moduleListState.ts` — `buildModuleListItems`, locked copy, `getNextActionableModule` | done |
| `ModuleStatusBadge.tsx`, `ModuleListCard.tsx` | done |
| `SettingsKnowYourselfSection.tsx` — polished cards, progress X/6, sensitivity indicator | done |
| `moduleListState.test.ts`, `SettingsKnowYourselfSection.test.tsx` | done |
| Profile refresh after wizard (`ModuleWizard` → `refresh()`) | done |

**Gate:** список отражает реальный статус из п.3–4; Start → wizard; completed без Review; legacy `{}` schedules fallback.

**Следующий шаг:** §9 Dashboard Zone G или §11 AI integration verification.

---

## 6. UI: прохождение одного модуля (questionnaire flow) — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Wizard + minimal Know Yourself Deeper entry on Profile tab.

| Артефакт | Статус |
|----------|--------|
| `ModuleWizard.tsx` + route `/settings/know-yourself/:moduleSlug` | done |
| `ModuleWizardShell`, intro/question/multi/complete screens | done |
| `useModuleWizard.ts` + tests | done |
| `SettingsKnowYourselfSection.tsx` (minimal §5 entry) | done |
| Atomic submit via `completeModule` | done |
| CrisisBar on all wizard screens | done |
| History skip-for-now on intro | done |

**Gate:** Identity Lens (and all 6 via registry) — intro → questions → completion → toast → Profile.

**Следующий шаг:** §5 polish (full list UX) или §11 AI integration verification.

---

## 7. Persistence layer: save + side effects — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** `completeModule()` + patch builder + tests.

| Артефакт | Статус |
|----------|--------|
| `moduleProfilePatch.ts` — dual-write, coercion, schedule `completedAt` | done |
| `completeModule.ts` — validate, guards, single update | done |
| Trauma merge rule (never clear onboarding flag) | done |
| `completeModule.test.ts` (9 tests) | done |

**Gate:** identity/history/meaning/body side effects; idempotency on already-complete.

---

## 8. Интеграция с onboarding results (Section 5) — **ЗАКРЫТО**

> Закрыто в §3 (scheduler preview + OVR-011).

- `OnboardingResults` — scheduler preview
- `first_module` / `module_days` из scheduler at `completeOnboarding`
- `moduleMap` удалён из `classification.ts`

**Gate:** preview совпадает с scheduler output.

**Следующий шаг:** §11 — AI prompt reads module columns (verify edge path).

---

## 9. Dashboard Zone G — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Dashboard module preview card + classification surfacing.

| Артефакт | Статус |
|----------|--------|
| `dashboardModulePreview.ts` — label→slug map, `selectDashboardModuleItem`, `resolveDashboardModulePreview` | done |
| `DashboardModulePreviewCard.tsx` — Know Yourself Deeper card, Start / locked CTA, View all | done |
| `DashboardMain` slot `modulePreview` + `Dashboard.tsx` wire (post-onboarding) | done |
| `dashboardModulePreview.test.ts`, `DashboardModulePreviewCard.test.tsx` | done |
| `getDashboardConfig().modulesToSurface` wired for preview selection | done |

**Gate:** после onboarding карточка с корректным статусом; Start → wizard; скрыта при 6/6; alignment_fracture prefers identity/meaning when locked.

**Следующий шаг:** §10 notifications или §11 AI integration verification.

---

## 10. Уведомления (Section 13) — **ЗАКРЫТО**

> **Gate пройден (2026-07-17).** Module unlock cron edge fn + first-module milestone + cohort logic.

| Артефакт | Статус |
|----------|--------|
| Migration `lastNotificationSentAt`, `firstModuleMilestoneEmailedAt`; schedule `unlockNotifiedAt` / `unlockResentAt` | done |
| `_shared/moduleUnlockLogic.ts` + `moduleUnlockNotify.ts` + tests | done |
| Edge fn `module-unlock` (Resend + stamp) | done |
| Edge fn `notification-milestone` + `completeModule` invoke | done |
| Catalog/hooks live for `notification_module_unlock`, `notification_milestone` | done |

**Gate:** trigger day → email/stamp; resend at 3 days; max 1/day; first complete milestone; no Pro upsell (OVR-009).

**Следующий шаг:** §11 AI integration verification.

---

## 11. AI coaching integration (Section 11)

> **Gate пройден (2026-07-17).** Step 5 modifiers use explicit `module_*_complete` flags; Identity before/after + all 6 modules covered in `buildSystemPrompt.test.ts`; History trauma protocol verified.

**Цель:** модули реально меняют Gidget.

- Step 5 modifiers с **реальными** `module_*_complete` flags (убрать approximate-by-count-only path когда flags есть)
- Incomplete-data probing (§11 + AI Prompt Library §7) — проверить parity
- Returning session after module (Prompt Library template)
- `buildSystemPrompt` / edge function: все module fields в USER PROFILE DATA block

**Code:** `supabase/functions/chat/buildSystemPrompt.ts`, `prompt/moduleContext.ts`, `frontend/src/lib/chat/buildSystemPrompt.test.ts`.

---

## 12. Paths и cross-feature gates (Section 8)

> **Gate пройден (2026-07-17).** Module prerequisites encoded in `path.triggerSignals`; gated at auto-enroll + manual enroll; UI lock + CTA to Identity Lens wizard.

**Цель:** paths с prerequisite «Requires Identity Lens module».

- При enrollment / continue — проверка `module_*_complete` + field conditions
- UI: «Complete Identity Lens to unlock this path»
- Не блокировать базовый доступ к app (§9 delivery rule)

**Gate:** path с prerequisite корректно gated; без prerequisite — без изменений.

**Code:** `frontend/src/lib/paths/pathModulePrerequisites.ts`, `pathEnrollmentMatching.ts`, `pathsEnrollmentApi.ts`, `PathCatalogCard.tsx`, `PathDetailPopup.tsx`, migration `20260717170000_path_identity_module_prerequisite.sql`.

**Tokens:** `prerequisite:module:identity`, `prerequisite:field:identityNarrativeType=fixed`, `prerequisite:field:identityRoleFusionScore>=4` appended to `triggerSignals`.

---

## 13. Re-trigger и refresh (Section 10 — второй этап)

> **Gate пройден (2026-07-17).** Refresh engine + `refresh_available` status; reassessment hook offers refresh; Profile UI + life event + user-initiated refresh.

**Цель:** модули не только one-shot at onboarding schedule.

- 90-day reassessment → offer module refresh
- Score drop ≥ 0.8 → accelerated re-trigger
- Life event flag (in-app) → relevant modules
- User-initiated full refresh from Profile

**Gate:** хотя бы один re-trigger scenario работает end-to-end.

**Code:** `frontend/src/lib/modules/moduleRefresh.ts`, `moduleRefreshApi.ts`, `completeModule.ts` (refresh mode), `completeReassessment.ts`, `SettingsKnowYourselfSection.tsx`, `LifeEventRefreshDialog.tsx`.

---

## 14. Тесты, observability, admin

> **Gate пройден (2026-07-17).** Test matrix + regression suite; integration flow test; admin module aggregates; privacy audit documented.

**Цель:** не сломать при доработках.

- Unit: scheduler, save side effects, tier gating (OVR-009 regression), AI prompt assembly (all 6 modules)
- Integration: onboarding → schedule → unlock → complete → AI
- Admin read-only module completion stats (aggregated, no PII)
- Privacy audit: History module fields, RLS whitelist

**Code:** `frontend/src/lib/modules/moduleTierGating.test.ts`, `deepDiveModuleFlow.integration.test.ts`, `frontend/src/lib/settings/admin/adminAnalyticsApi.ts`, `AdminAnalyticsTab.tsx`, `adminPrivacy.test.ts`, `ReassessmentModuleRefreshBanner.tsx`, `docs/deep-dive-modules-spec.md` §13–§16.

**Regression command:** `npm test -- src/lib/modules src/lib/chat/buildSystemPrompt.test.ts src/lib/chat/sessionLifecycle.test.ts src/lib/paths/pathModulePrerequisites.test.ts src/lib/settings/admin/adminAnalyticsApi.test.ts src/lib/settings/admin/adminPrivacy.test.ts src/lib/reassessment/completeReassessment.test.ts src/components/reassessment/ReassessmentModuleRefreshBanner.test.tsx`

---

## MVP vs full

| MVP (минимум «фича работает») | Full product |
|-------------------------------|--------------|
| 0 → 1 → 2 → 3 → 5 → 6 → 7 → 8 → 11 | + 4 (tier gating, if ever), 9, 10, 12, 13, 14 |

**MVP slice:** один модуль (Body's Story или Identity Lens) + scheduler + Profile list + save + AI flags + fix onboarding preview.

**Vertical slices по модулю:** после п.2 можно добавлять модули 2–6 итеративно (контент + sensitivity copy), не меняя архитектуру п.3–7.

---

## Шесть модулей (Build Brief §9)

| # | Модуль | Default day | Вопросов |
|---|--------|-------------|----------|
| 1 | The Identity Lens | Day 7 | 8 |
| 2 | Your Relational Blueprint | Day 14 | 8 |
| 3 | Your History & Context | Day 21 | 6 |
| 4 | Financial Reality | Day 10 | 5 |
| 5 | Your Body's Story | Day 5 | 7 |
| 6 | What Holds You | Day 30 | 7 |

---

## Связанные файлы (текущее состояние)

| Область | Файлы |
|---------|-------|
| Превью онбординга | `frontend/src/lib/classification.ts`, `frontend/src/components/OnboardingResults.tsx` |
| Completion workflow | `frontend/src/lib/completeOnboarding.ts` |
| AI / module flags | `supabase/functions/chat/prompt/profileHelpers.ts`, `supabase/functions/chat/buildSystemPrompt.ts` |
| Confidence level | `frontend/src/lib/userProfile/resolveAiConfidenceLevel.ts` |
| Email placeholder | `frontend/src/lib/email/transactionalEmailCatalog.ts` |
| Dashboard config (unused) | `frontend/src/lib/classification.ts` → `getDashboardConfig()` |
| Product spec | `docs/deep-dive-modules-spec.md`, `docs/Uncloud360_Complete_Build_Brief DRAFT 4.9.2026.docx.md` §9–§10 |

---

## Следующий шаг

**TEMP §0–§14 закрыты** (кроме §4 tier gating — out of MVP). Спека: [`docs/deep-dive-modules-spec.md`](deep-dive-modules-spec.md). Перед продом: commit → apply migrations → deploy edge fns → настроить cron `module-unlock` (см. spec §16).
