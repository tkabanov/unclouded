# План тестирования: AI Prompt Specifications (standalone prompts)

**Спека:** [`docs/Uncloud360_AI_Prompt_Specifications.docx.md`](./Uncloud360_AI_Prompt_Specifications.docx.md)  
**Overrides:** OVR-042 (`docs/product-overrides.md`) — Dashboard Kota daily messages (Prompt 1); OVR-044 — Trajectory Statement Pro+Premium / assessment storage / static fallback  
**Код (ориентиры):**

| Prompt | Edge function | UI / storage |
|---|---|---|
| 1 — Coaching Insights | `supabase/functions/generate-daily-insights/` | `DashboardKotaMessagesCard.tsx`, таблица `dailyInsight` |
| 2 — Journal Reflection | `supabase/functions/generate-journal-reflection/` | Journal entry `reflectionText` / `reflectionReady` |
| 3 — Path Closing | `supabase/functions/generate-path-closing/` | Path session completion screen, `pathSessionCompletion` |
| 4 — Trajectory Statement | `supabase/functions/generate-trajectory-statement/` | Reassessment results + PDF Section 3 |
| 5 — Coaching Summary | `supabase/functions/generate-coaching-summary/` | Premium PDF only; `coachingSummaryJson` / `coachingSummaryReady` |
| 6 — Kota's Read | `supabase/functions/generate-kota-read/` | `coachBooking` + email to coach inbox |

Shared parsers/prompts: `supabase/functions/_shared/standalonePrompts/`, unit: `frontend/src/lib/standalonePrompts/standalonePrompts.test.ts`

## How to run

- Manual / browser: `/test-list docs/ai-prompt-specifications-test-plan.md` или `/test <ID>`
- Unit layer first (optional): Vitest — `standalonePrompts` parsers; затем edge smoke через UI / curl с JWT
- Content QA (тон, длина, «не advice»): ручная вычитка сгенерированного текста по чеклисту §8

## 1. Цели и объём

### 1.1 Цели

Проверить шесть **standalone** OpenAI-вызовов (не Kota session library): триггеры, tier-gate, хранение, UI/уведомления, retry/failure, формат ответа и базовое качество тона.

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Триггеры и timing (sync / async / scheduled / delayed display) | Полная Kota session prompt library (chat turns) |
| Tier: Free locked; Pro+Premium vs Premium-only | Смена classification engine / scoring rules |
| Persist + display (dashboard feed, journal, path completion, reassessment, PDF, coach email) | Coach Workspace Phase 3 UI (пока email delivery) |
| Failure: no notify before store; retry rules | Нагрузочное тестирование OpenAI latency SLA как CI gate |
| Content smoke: length, JSON shape, tone flags, «not advice» | Полный лингвистический audit всех classifications × modes |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-042** (Prompt 1 feed live; OVR-032/036 для feed сняты)  
3. [`docs/Uncloud360_AI_Prompt_Specifications.docx.md`](./Uncloud360_AI_Prompt_Specifications.docx.md)  
4. Bubble / Lovable / migration specs

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Supabase edge | deployed functions: `generate-daily-insights`, `generate-journal-reflection`, `generate-path-closing`, `generate-trajectory-statement`, `generate-coaching-summary`, `generate-kota-read`, `generate-pup-pdf` |
| Cron | `hourly-generate-daily-insights` → `invoke_scheduled_edge_function('generate-daily-insights')` (или ручной invoke service role / `x-cron-secret`) |
| OpenAI | Valid API key in edge secrets; без ключа сценарии generation = BLOCKED |

### 2.2 Тестовые пользователи (seed)

| Email | Tier | Password | Для чего |
|---|---|---|---|
| `sub-free@test.com` | Free | `qwerty123` | Negative: все 6 prompts locked / не генерируются |
| `sub-pro@test.com` | Pro | `qwerty123` | Prompts 1–4, 6; **не** Prompt 5 Premium summary |
| `sub-premium@test.com` | Premium | `qwerty123` | Все 6; PDF Complete Coaching Record; 1:1 booking + Kota Read |

Дополнительно (по возможности): Pro/Premium с `grief_mode` / `recovery_mode` / `high_emotional_load`; пользователь с ≥7 дней `dailyInsight`; Premium после 90-day reassessment.

### 2.3 Матрица tier × prompt

| Prompt | Free | Pro | Premium |
|---|---|---|---|
| 1 Daily Insights | нет | да | да |
| 2 Journal Reflection | нет | да | да |
| 3 Path Closing | нет | да | да |
| 4 Trajectory Statement | нет* | да (results + Pro PDF §3) | да |
| 5 Coaching Summary | нет | нет | да (async + Premium PDF) |
| 6 Kota's Read | нет | да (если booking доступен) | да |

\*Free не проходит reassessment PDF pipeline как paid; проверять 403 / отсутствие AI narrative.

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время |
|---|---|---|
| 0 | Unit parsers + Free tier negatives | 30–45 мин |
| 1 | Prompt 2 Journal (самый быстрый E2E) | 30 мин |
| 2 | Prompt 3 Path closing | 45–60 мин |
| 3 | Prompt 1 Daily insights (cron/manual + UI + push) | 45–90 мин |
| 4 | Prompt 4 + 5 Reassessment / PDF | 1.5–2 ч |
| 5 | Prompt 6 Booking + coach email | 45 мин |
| 6 | Content QA checklist (§8) на 1–2 живых генерациях каждого prompt | 1 ч |

---

## 4. Cross-cutting

### AIP-COMMON-001 — Free: standalone prompts недоступны — TESTED

| | |
|---|---|
| **Preconditions** | `sub-free@test.com`, onboarding complete |
| **Steps** | Journal submit; complete path session; dashboard; попытка reassessment PDF / book coach (если UI пускает) |
| **Expected** | Нет Kota reflection / daily feed / path closing AI / Premium summary. Edge: `403` с codes вроде `journal_reflection_tier_required`, `path_closing_tier_required` (и аналоги). Dashboard без карточки «From Kota» с AI insights (или empty/upsell — не три AI-инсайта). |

### AIP-COMMON-002 — Output shape / no preamble — TESTED

| | |
|---|---|
| **Preconditions** | Успешный ответ любой из функций 1, 3, 5, 6 (JSON) или 2, 4 (plain text) |
| **Steps** | Проверить stored fields / network response body |
| **Expected** | JSON prompts: валидный объект нужной схемы, без markdown fence и без текста до `{`. Text prompts: только текст, без title/JSON wrapper. |

### AIP-COMMON-003 — Tone smoke (общий) — TESTED

| | |
|---|---|
| **Preconditions** | Любая свежая генерация |
| **Steps** | Прочитать текст |
| **Expected** | Нет cheerleading («Great job!»), нет списка инструкций «do X», нет therapy/diagnosis claims. Голос: warm, direct, grounded (user-facing) или professional coach-to-coach (Prompt 6). |

### AIP-COMMON-004 — Flag adjustments (smoke) — TESTED

| | |
|---|---|
| **Preconditions** | Профиль с `high_emotional_load` и/или `grief_mode` / `recovery_mode` в active flags |
| **Steps** | Сгенерировать Prompt 1 и/или 2 и 3 |
| **Expected** | `high_emotional_load`: insights/reflections grounding, без новых challenges. `grief_mode`: присутствие/вес без «fix grief». `recovery_mode`: не центрирует substance use. |

---

## 5. Prompt 1 — Coaching Insights (Kota's Messages)

**Trigger:** scheduled daily (cron / preferred local hour, default 08:00)  
**Tier:** Pro + Premium  
**Override:** OVR-042

### AIP-P1-001 — Generation + store before notify — TESTED

| | |
|---|---|
| **Preconditions** | Pro/Premium без insight за «сегодня» в TZ пользователя; OpenAI OK |
| **Steps** | Invoke `generate-daily-insights` (cron secret или service role). Проверить DB row `dailyInsight` (или эквивалент), затем push/notification |
| **Expected** | Одна запись на user+date с 3 insights (`title` 3–6 слов, `body` 2–3 абзаца). Notification **"Kota left you a message"** только **после** успешного store. При fail API — **нет** notification; schedule `dailyInsightRetry.retryAt` ≈ now+30m (`DAILY_INSIGHTS_RETRY_MS`); cron `*/15` делает **один** retry; второй fail — exhausted, без notify. |

### AIP-P1-002 — Dashboard feed UI — TESTED

| | |
|---|---|
| **Preconditions** | Есть хотя бы один stored day insights |
| **Steps** | Login Pro/Premium → `/dashboard` → карточка From Kota / Kota's Messages |
| **Expected** | Показаны 3 инсайта за выбранный/текущий день. Label согласован со спекой («From Kota» / «Kota's Messages»). Не curated admin articles как основной feed (OVR-042). |

### AIP-P1-003 — 7-day rolling window — TESTED

| | |
|---|---|
| **Preconditions** | ≥7 дней insights (seed или несколько invoke с разными date) |
| **Steps** | Открыть feed / запросить API списка |
| **Expected** | Видны не более 7 дней; новый день вытесняет самый старый (UI + DB prune `insightDate < today-6` после insert). |

### AIP-P1-004 — Preferred time / default 8am — TESTED

| | |
|---|---|
| **Preconditions** | User TZ set; preferred hour = default 8 или кастом в Settings → Profile (`onboardingData.preferredInsightHour`) |
| **Steps** | Запустить cron `*/15` около границы часа; или unit check `preferredInsightHour` + `shouldGenerateDailyInsights` |
| **Expected** | Первая генерация в локальный preferred hour. Retry только по `retryAt`, не повторный fire в тот же preferred hour. Не генерировать повторно в тот же local date. |

### AIP-P1-005 — Free / duplicate day — TESTED

| | |
|---|---|
| **Preconditions** | Free user; Pro user уже с insight за сегодня |
| **Steps** | Invoke cron |
| **Expected** | Free skipped. Pro с существующей записью — no duplicate, no second push. |

### AIP-P1-006 — Personalization inputs present — TESTED

| | |
|---|---|
| **Preconditions** | User с classification, coaching_mode, optional recent themes / flags |
| **Steps** | Логи edge / stored prompt context (если доступны) или косвенно: текст упоминает паттерн mode, не recap сессии |
| **Expected** | В API уходят: `classification`, `coaching_mode`, `recent_themes`, `ai_confidence_level`, `active_flags`. Insights не доминируются session recap. |

---

## 6. Prompt 2 — Journal Reflection

**Trigger:** submit journal entry → background generate; **show only on return visit**  
**Tier:** Pro + Premium

### AIP-P2-001 — Delayed display (felt experience) — TESTED

| | |
|---|---|
| **Preconditions** | Pro/Premium, `/journal` |
| **Steps** | Создать entry → сразу смотреть detail/list без full remount если UI ещё на submit screen → уйти → вернуться на journal (reload / navigate away and back, даже через ~30s) |
| **Expected** | Сразу после submit reflection **не** показан как готовый Kota-блок (или UI ждёт следующего page load). После return: `reflectionReady` / текст под entry, label **From Kota** (italic/smaller/avatar per spec). |

### AIP-P2-002 — Persist fields — TESTED

| | |
|---|---|
| **Preconditions** | Успешный generate |
| **Steps** | DB/API: journal entry row |
| **Expected** | `reflectionText` (или `reflection_text`) заполнен; `reflectionReady` = true. Длина 2–4 предложения; короткая entry → короче reflection. |

### AIP-P2-003 — Tier gate — TESTED

| | |
|---|---|
| **Preconditions** | Free vs Pro |
| **Steps** | Submit entry на обоих |
| **Expected** | Free: 403 `journal_reflection_tier_required`, нет Kota block. Pro: reflection появляется после return. |

### AIP-P2-004 — Tone by mode — TESTED

| | |
|---|---|
| **Preconditions** | Rebuilder или grief/high_emotional_load; отдельно Stabilizer/Builder; Optimizer |
| **Steps** | По одной entry на режим |
| **Expected** | Rebuilder/grief/load: чисто witnessing. Stabilizer/Builder: optional one gentle observation. Optimizer: более прямое observation. Не advice, не summary entry back, не cheerleading. |

---

## 7. Prompt 3 — Path Session Closing Insight

**Trigger:** final reflection submit в path session  
**Tier:** Pro + Premium

### AIP-P3-001 — Completion screen three-part UI — TESTED

| | |
|---|---|
| **Preconditions** | Pro/Premium enrolled in path; дойти до последней reflection |
| **Steps** | Submit final reflection → completion screen |
| **Expected** | Последовательно: **acknowledgment** → visual break → **sit_with** → CTA **"Something come up? Start a chat with Kota"** (tappable). Acknowledgment 2–3 sentences; sit_with 1–2; total short. Specific to what user wrote, не «great work». |

### AIP-P3-002 — CTA opens chat with context — TESTED

| | |
|---|---|
| **Preconditions** | Closing insight показан |
| **Steps** | Tap CTA |
| **Expected** | Новый AI session; context note вроде: user just completed `[session_number]` of `[path_name]` and wants to discuss something that came up. |

### AIP-P3-003 — Persist on PathSession / completion — TESTED

| | |
|---|---|
| **Preconditions** | Успешный generate |
| **Steps** | Проверить `pathSessionCompletion` (или path session fields): `closingAcknowledgment`, `closingSitWith`, `closingCta` |
| **Expected** | JSON schema: `acknowledgment`, `sit_with`, `cta_text`. Idempotent: повторный вызов не ломает UI / не дублирует странно. |

### AIP-P3-004 — Free / Pro gate — TESTED

| | |
|---|---|
| **Preconditions** | Free и Pro path completion |
| **Steps** | Complete session |
| **Expected** | Free: нет AI closing / 403 `path_closing_tier_required`. Pro: полный three-part. |

### AIP-P3-005 — Tone by coaching mode + flags — TESTED

| | |
|---|---|
| **Preconditions** | Разные modes / grief|recovery flags |
| **Steps** | Complete session |
| **Expected** | Rebuilder gentle; Stabilizer honest; Builder forward seed; Optimizer precise. grief/recovery: acknowledgment leads with presence. |

---

## 8. Prompt 4 — Trajectory Statement

**Trigger:** sync at 90-day reassessment score save  
**Tier:** Pro + Premium (в PDF Section 3 обоих; Premium также на results)  
**Override:** [OVR-044](./product-overrides.md) — Pro+Premium AI, storage on `assessmentResult`, static `trajectoryLanguage` fallback

### AIP-P4-001 — Sync display on reassessment results — TESTED

| | |
|---|---|
| **Preconditions** | Premium (или Pro) eligible for reassessment; complete 90-day flow |
| **Steps** | Finish reassessment → results screen |
| **Expected** | Trajectory statement 2–3 sentences виден **сразу** (sync). Сохранён (`trajectoryStatementText` на assessment/user). Называет значимое движение / честно про decline / forward focus. Не «you've made great progress» generic. |

### AIP-P4-002 — PDF Section 3 (Pro and Premium) — TESTED

| | |
|---|---|
| **Preconditions** | Statement stored; download Pro PDF и Premium PDF |
| **Steps** | Generate/download PDF |
| **Expected** | Section 3 содержит тот же trajectory text (не только static `trajectoryLanguage` fallback, если AI text есть). |

### AIP-P4-003 — Classification change & decline honesty — TESTED

| | |
|---|---|
| **Preconditions** | Fixtures: classification changed; отдельно scores declined on a dimension |
| **Steps** | Reassessment / invoke `generate-trajectory-statement` |
| **Expected** | Transition named when classification changed. Decline named without alarm. Most significant dimension movement highlighted. |

### AIP-P4-004 — Tier / auth — TESTED

| | |
|---|---|
| **Preconditions** | Free или чужой `assessmentResultId` |
| **Steps** | POST generate-trajectory-statement |
| **Expected** | 403/404 appropriately; no cross-user leak. |

---

## 9. Prompt 5 — Coaching Summary (Premium PDF)

**Trigger:** async after reassessment save  
**Tier:** **Premium only**

### AIP-P5-001 — Results screen not blocked + preparing copy — TESTED

| | |
|---|---|
| **Preconditions** | Premium completes reassessment |
| **Steps** | Observe results immediately |
| **Expected** | Results UI доступен без ожидания summary. Message вроде: **"Your Complete Coaching Record is being prepared. You'll be notified when your PDF is ready."** |

### AIP-P5-002 — Ready notification + flags — TESTED

| | |
|---|---|
| **Preconditions** | Job completes (target 2–3 min; flag if >5 min in testing) |
| **Steps** | Wait; check push and/or email |
| **Expected** | `coachingSummaryReady` = true; JSON stored (`coachingSummaryJson`). Notify: **"Your Complete Coaching Record is ready"** (push title matches; email subject same). |

### AIP-P5-003 — Five sections in JSON / PDF — TESTED

| | |
|---|---|
| **Preconditions** | Summary ready |
| **Steps** | Inspect JSON + Premium PDF download |
| **Expected** | Keys/titles: Where You Started / What Moved / What Came Up / What the Data Reveals / The Next Chapter (or spec titles). Coherent Kota narrative, specific to user data. PDF **must not** generate Complete Coaching Record without summary (fail closed if not ready — `coaching_summary_not_ready`). |

### AIP-P5-004 — Failure retry + escalate — TESTED

| | |
|---|---|
| **Preconditions** | Simulate OpenAI failure (invalid key / mock) if possible |
| **Steps** | Trigger summary job |
| **Expected** | First fail → `202` `coaching_summary_retry_scheduled`, `assessmentResult.coachingSummaryRetryAt` ≈ now+5m (override: env `COACHING_SUMMARY_RETRY_MS`), attemptCount=1. Minute cron `generate-coaching-summary` (empty body) runs the retry. Second fail → `502` `coaching_summary_failed`, `profiles.coachingSummaryFailed=true`, ops email (`OPS_NOTIFY_EMAIL` or `COACH_BRIEF_INBOX`); **do not** ship Premium PDF without summary (P5-003 fail-closed). |

### AIP-P5-005 — Pro excluded — TESTED

| | |
|---|---|
| **Preconditions** | Pro completes reassessment (если доступен) |
| **Steps** | Check UI + DB + PDF |
| **Expected** | Нет async Complete Coaching Record / нет Prompt 5 sections. Trajectory (P4) может быть; Premium-only summary отсутствует. |

---

## 10. Prompt 6 — Pre-Coaching Brief (Kota's Read)

**Trigger:** human coach booking confirmed (1:1 or group)  
**Tier:** Pro + Premium (booking entitlements per subscription rules)

### AIP-P6-001 — Generate on booking + store — TESTED

| | |
|---|---|
| **Preconditions** | Premium with credits (или Pro если group booking); book coach |
| **Steps** | Confirm booking |
| **Expected** | `generate-kota-read` fires; **`kotaReadJson`** on `coachBooking` (or group booking row) with: `patterns_observed`, `not_yet_reached`, `be_careful_about`, `most_important_now`, `confidence_note`. Formatted text is derived at email/Admin display time (not dual-written to `kotaRead`). |

### AIP-P6-002 — Full brief = factual + Kota's Read — TESTED

| | |
|---|---|
| **Preconditions** | Booking with stored Kota Read |
| **Steps** | Open coach email (or log body) |
| **Expected** | **Factual** (no AI): classification/scores, coaching mode, paths, open commitment, flags, session count/last date. **Kota's Read**: patterns (bullets; provisional if &lt;5 sessions), not-yet-reached, be-careful-about, most-important-now. Tone: professional coach-to-coach, not user-facing warmth. Not diagnosis/clinical. Session themes input: last 5 sessions, ~600 tokens. |

### AIP-P6-003 — Email delivery until Coach Workspace — TESTED

| | |
|---|---|
| **Preconditions** | `assignedCoachEmail` on booking **or** `COACH_BRIEF_INBOX` / SendGrid configured |
| **Steps** | Book session; optionally set assigned coach email in Admin → Coach briefs; check inbox + `coach_kota_read_brief` delivery log |
| **Expected** | Email to **assigned coach** when `assignedCoachEmail` is set (`kotaReadEmailDetail` like `sent:assigned:…`); otherwise **COACH_BRIEF_INBOX** (`sent:inbox:…`). Catalog hook `coach_kota_read_brief` reflects delivery. |

### AIP-P6-004 — crisis_prone / low history — TESTED

| | |
|---|---|
| **Preconditions** | User with crisis_prone fingerprint **or** &lt;5 sessions |
| **Steps** | Generate brief |
| **Expected** | crisis_prone explicitly noted in be-careful. &lt;5 sessions: provisional language / insufficient history paths as in prompt. |

### AIP-P6-005 — Free / no entitlement — TESTED

| | |
|---|---|
| **Preconditions** | Free or Pro without 1:1 entitlement |
| **Steps** | Attempt book 1:1 |
| **Expected** | Upsell / block per subscription plan; no Kota Read email. |

---

## 11. Content QA checklist (на каждую живую генерацию)

Отмечать Pass/Fail вручную; не автоматизировать жёстко.

| Check | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|
| Correct length band | 3×2–3 para | 2–4 sent | short 2-part | 2–3 sent | 5 sections | 4 components |
| Not advice / not cheerleading | ✓ | ✓ | ✓ | ✓ | ✓ | n/a (pro handoff) |
| Not session recap / not generic wellness | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mode-appropriate tone | ✓ | ✓ | ✓ | — | — | — |
| Flag-safe when flags active | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Schema / storage correct | JSON | text | JSON | text | JSON | JSON |
| Right audience | user | user | user | user | user | **coach** |

---

## 12. Матрица Acceptance Criteria → сценарии

| Spec requirement | Scenario IDs |
|---|---|
| Daily insights scheduled; 3 insights; 7-day feed; notify after store | AIP-P1-001…005, OVR-042 |
| Journal reflection delayed display + From Kota | AIP-P2-001…004 |
| Path closing 3-part + CTA context | AIP-P3-001…005 |
| Trajectory sync + PDF §3 Pro/Premium | AIP-P4-001…004 |
| Coaching summary async, Premium-only, notify, fail closed | AIP-P5-001…005 |
| Kota's Read on booking + email brief | AIP-P6-001…005 |
| Tier gates Free vs Pro/Premium | AIP-COMMON-001, per-prompt *-003/005 |
| Tone / flags | AIP-COMMON-003/004, §11 |

---

## 13. Known gaps / blockers to log

| Item | Note |
|---|---|
| OpenAI key missing | All generation scenarios BLOCKED |
| Push not registered | P1/P5 notify — verify email/DB flag instead |
| Reassessment not due | Use seeded assessmentResult + direct edge invoke for P4/P5 |
| Coach Workspace | Spec: email until Phase 3 — do not fail for missing Workspace UI |
| Latency P5 >5 min | Flag to Dr. Sam per spec; record duration in report |
| OVR-036 vs OVR-042 | Marketing/copy tests for Pro may still mention insights; **feed is live** under OVR-042 |

---

*Uncloud360™ · Test plan derived from AI Prompt Specifications · Confidential*
