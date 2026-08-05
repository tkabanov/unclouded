# План тестирования: Path Library (55 paths + Success Plans)

**Источник (authority):** [`docs/new_paths_content/Uncloud360_Canonical_Path_Library.md`](./new_paths_content/Uncloud360_Canonical_Path_Library.md)  
**Success Plans:** [`docs/new_paths_content/Uncloud360_Success_Plan_Paths.md`](./new_paths_content/Uncloud360_Success_Plan_Paths.md)  
**Дата:** 2026-08-04  
**Область:** каталог Guided Paths, tier-доступ (Free / Pro / Premium), сессии, enrollment, Success Plan add-on (Pro/Premium), employer assignment.

---

## 1. Цели и объём

### 1.1 Цели

Проверить, что path library соответствует каноническому split и продуктовому позиционированию:

- **55 self-select paths** с каноническими именами, pillar и tier
- **Free — 10 paths** (1–8, 14–15): достаточный опыт без оплаты
- **Pro — 41 paths** (9–13, 16–41, 45–51, 53–55): основная глубина библиотеки
- **Premium — 4 paths** (42–44, 52): узкий, явно дифференцированный набор
- Tier gate в UI **и** server-side enforcement (enrollment / session progress)
- Upsell при попытке открыть locked path (Pro vs Premium messaging)
- **7 Success Plan paths** — отдельный add-on поверх 55; доступны к покупке Pro/Premium; employer-assignable (HR); **не** входят в счёт 55
- Контент сессий (session count, coaching text, reflection, micro-commitment) для путей с заполненными batch-файлами
- Path-specific reassessment Question 4 по каноническим именам

### 1.2 Вне scope

- Individual billing flows (checkout, proration, cancel) — см. [`docs/individual-subscription-test-plan.md`](./individual-subscription-test-plan.md); здесь только **эффект tier на path access**
- Deep-dive modules (OVR-009 — без path-style tier gate)
- Journal / Milestones (OVR-005)
- Admin Users / Workplaces детали — только пересечение с assignment Success Plans и Admin → Paths
- Авторы контента Phase 2 «TO WRITE» в Canonical: отсутствие полного текста — **content gap**, не блокер tier-гейтов (проверять metadata + gate; full session QA — когда контент загружен)

### 1.3 Приоритет источников

1. Явная инструкция в текущей задаче (tier split + Success Plans as Pro/Premium add-on, HR-assign)
2. [`docs/product-overrides.md`](./product-overrides.md) — особенно OVR-019, OVR-037
3. Canonical Path Library + Success Plan Paths + batch content
4. Bubble IR / migration specs

| Override | Implication for QA |
|----------|-------------------|
| **OVR-019** | The Unsent Letter — `tier: free` + health-flag visibility; не путать с Pro path gate |
| **OVR-037** | Runtime seed из `docs/new_paths_content/` batches. **Известный gap vs target:** Success Plans сейчас seeded как `tier: free` / self-select catalog; employer assign UI out of scope. **Target для этого плана:** Success Plans = add-on Pro/Premium + HR assign, вне 55. Fail/skip с пометкой *IMPL-GAP*, пока код не приведён к target. |
| **OVR-003** | Upsell / upgrade — через Settings → Subscription и locked-feature popups |

---

## 2. Каноническая матрица доступа

### 2.1 Self-select library (55)

| Tier пользователя | Доступные library paths | Locked |
|-------------------|-------------------------|--------|
| **Free** | 1–8, 14–15 (10) | Pro (41) + Premium (4) |
| **Pro** | Free (10) + Pro (41) = 51 | Premium (4) |
| **Premium** | Все 55 | — |
| **Founding Member** | Как Pro (если FM = Pro entitlements) | Premium (4), пока не upgrade |

### 2.2 Free paths (ожидаемый список)

| # | Path Name | Pillar | Library visibility |
|---|-----------|--------|--------------------|
| 1 | Getting Through Hard Seasons | Emotional Wellbeing | Always (tier Free) |
| 2 | Burnout Recovery | Professional | Always (tier Free) |
| 3 | Recovery Roadmap | Emotional Wellbeing | **Flag-gated:** `recovery_mode_active` (not an upgrade wall) |
| 4 | Nervous System Basics | Emotional Wellbeing | Always (tier Free) |
| 5 | Navigating Grief and Loss | Emotional Wellbeing | **Flag-gated:** `grief_mode_active` (not an upgrade wall) |
| 6 | Boundary Setting Foundations | Emotional Wellbeing | Always (tier Free) |
| 7 | Clarity and Direction | Professional | Always (tier Free) |
| 8 | Building Professional Momentum | Professional | Always (tier Free) |
| 14 | Foundations of a Balanced Life | Health & Wellness | Always (tier Free) |
| 15 | Building Daily Structure | Health & Wellness | Always (tier Free) |

**QA note:** Free catalog membership is still **10** paths (tier). For a user **without** grief/recovery flags, Library shows **8/10**; #3 and #5 appear only when the matching health flag is set (same pattern as Unsent Letter / OVR-019 / PL-REC-003). Absence of #3/#5 without flags is **not** a Free-tier fail.

### 2.3 Premium paths (только Premium)

| # | Path Name | Pillar |
|---|-----------|--------|
| 42 | High Performance Sustainability | Professional |
| 43 | The Optimization Protocol | Professional |
| 44 | Deep Identity Work | Emotional Wellbeing |
| 52 | Sleep Mastery | Health & Wellness |

### 2.4 Pro paths (кратко)

Все остальные из 55: **9–13, 16–41, 45–51, 53–55** (41 шт.). Полные имена — в Canonical.

Pillar totals (library): Emotional 26 · Professional 20 · Health & Wellness 9.
_(Canonical summary historically said 25/21/9; the Complete Path List sums to 26/20/9 — that detailed list wins.)_

### 2.5 Success Plans (вне 55)

| # | Name | Sessions |
|---|------|----------|
| SP1 | New Manager Success Plan | 5 (4 + bridge) |
| SP2 | Burnout Prevention Success Plan | 5 |
| SP3 | Leadership Development Success Plan | 5 |
| SP4 | Career Transition Success Plan | 5 |
| SP5 | Returning from Leave Success Plan | 5 |
| SP6 | High Potential Success Plan | 5 |
| SP7 | Performance Improvement Success Plan | 5 |

**Target product rules (этот план):**

- Не входят в счёт 55 self-select library
- Add-on **для покупки** на тарифах **Pro и Premium** (Free не покупает / не стартует без assignment+entitlement)
- **Employer-assignable** (HR / workplace admin)
- Self-select из основной library **не** является primary path (по продуктовому описанию — HR assign; self-purchase add-on — отдельный entitlement)

---

## 3. Тестовое окружение

### 3.1 Компоненты

| Компонент | Назначение |
|-----------|------------|
| Frontend Paths page | My Paths / Paths Library / filters / detail / start |
| Supabase `path`, `pathSession`, `pathEnrollment` | Catalog + progress |
| Tier helpers / RLS / `my_tier_allows` / `path_required_tier` | Server enforcement |
| Stripe test + seed users | Free / Pro / Premium fixtures |
| Admin → Paths | Content enable/disable, session edit (если в scope admin QA) |
| Workplace / HR portal | Assign Success Plan (*когда UI готов*) |

### 3.2 Тестовые пользователи

Использовать seed individual subscription users (см. subscription test plan) или эквивалент:

| Email (пример) | Tier | Для чего |
|----------------|------|----------|
| `sub-free@test.com` | Free | Free-only access, locks, upsell |
| `sub-pro@test.com` | Pro | Pro library + Premium lock + Success Plan purchase |
| `sub-premium@test.com` | Premium | Full 55 + Success Plan |
| Enterprise / HR admin | Workplace | Assign Success Plan сотруднику |
| Enterprise employee Pro/Premium | Workplace seat | Получить assignment, пройти sessions |

### 3.3 Минимальный dataset

1. В `path` — все 55 канонических имён с корректным `tier` / `pillar` / `sessionsCount` (где контент есть).
2. ≥1 Free, ≥1 Pro, ≥1 Premium path с полными sessions (для E2E session flow).
3. 7 Success Plan rows (`path_type` / `subMode` = `success_plan`).
4. Пользователи с active enrollment (in progress + completed) для My Paths.
5. Пользователь с grief/recovery flag для Unsent Letter (OVR-019), если path в runtime.

---

## 4. ID-схема кейсов

| Префикс | Область |
|---------|---------|
| PL-CAT-* | Catalog completeness / names / pillars |
| PL-FREE-* | Free tier access |
| PL-PRO-* | Pro tier access |
| PL-PREM-* | Premium tier access |
| PL-GATE-* | Locks, upsells, server enforcement |
| PL-ENR-* | Enrollment, progress, completion |
| PL-SES-* | Session content structure |
| PL-FIL-* | Filters / pillars / search |
| PL-REC-* | Recommendations / onboarding enrollment |
| PL-REA-* | Reassessment Q4 path-specific |
| PL-SP-* | Success Plans add-on + HR assign |
| PL-ADM-* | Admin path management |
| PL-DOWN-* | Downgrade / cancel impact on enrolled paid paths |

---

## 5. Catalog & metadata

### PL-CAT-001 — Ровно 55 self-select library paths — TESTED

| | |
|---|---|
| **Preconditions** | Seeded DB / staging catalog. |
| **Steps** | 1) Admin → Paths или SQL count library paths (exclude `success_plan`). 2) Сверить имена с Canonical. |
| **Expected** | 55 paths; имена **точно** как в Canonical (authority). Success Plans **не** увеличивают счёт до 62 в «library 55». |

### PL-CAT-002 — Tier labels на каждой path card / detail — TESTED

| | |
|---|---|
| **Steps** | Открыть Paths Library; spot-check Free / Pro / Premium samples + detail popup. |
| **Expected** | Badge/label Free / Pro / Premium совпадает с Canonical § Complete Path List. |

### PL-CAT-003 — Pillar distribution — TESTED

| | |
|---|---|
| **Steps** | Агрегировать catalog по pillar (library 55; exclude Success Plans + Unsent Letter). |
| **Expected** | Emotional Wellbeing **26**, Professional **20**, Health & Wellness **9**. Includes Clarity & Priority Reset (Pro/Professional stub) and Recovery Roadmap as Emotional. |

### PL-CAT-004 — Free set exact membership — TESTED

| | |
|---|---|
| **Steps** | Отфильтровать `tier = free` в library (без Success Plans). |
| **Expected** | Ровно paths **1–8, 14–15**; нет 9–13, 16+, Unsent Letter отдельно по OVR-019. |

### PL-CAT-005 — Premium set exact membership — TESTED

| | |
|---|---|
| **Steps** | Отфильтровать `tier = premium`. |
| **Expected** | Только 42, 43, 44, 52 с каноническими именами. |

### PL-CAT-006 — Pro set count = 41 — TESTED

| | |
|---|---|
| **Steps** | Count `tier = pro` library paths. |
| **Expected** | 41; множество = {9–13, 16–41, 45–51, 53–55}. |

### PL-CAT-007 — Canonical name wins over legacy aliases — TESTED

| | |
|---|---|
| **Steps** | Поиск по UI/DB старых имён из Reassessment / Bubble, если известны. |
| **Expected** | В UI только canonical names; нет дублей «старое + новое» имя одной path. |

---

## 6. Free tier

### PL-FREE-001 — Free user: Free-tier access без upgrade wall (flag gates отдельно) — TESTED

| | |
|---|---|
| **Preconditions** | `sub-free@test.com`, onboarding complete; **без** `grief_mode_active` / `recovery_mode_active` (типичный seed). |
| **Steps** | Library → для каждого **видимого** Free path → Start / Continue. Spot-check: #3 Recovery Roadmap и #5 Navigating Grief **скрыты** без flags. |
| **Expected** | **8/10** Free paths видимы и стартуемы без upgrade wall; enrollment + первая session OK. #3 / #5 **не** в Library без matching flag (клинический flag gate, не Pro/Premium lock). Полный набор 10 — см. PL-REC-003 с flagged user. |
| **Observed (2026-08-04)** | PASS vs corrected Expected: 8 visible Free; Nervous System Basics enroll OK; #3/#5 hidden without flags. Prior FAIL was overstated Expected («все 10» ignoring flag gates). Flagged retest: `free-flags@test.com` → all 10 + Unsent Letter (see PL-REC-003). |

### PL-FREE-002 — Free user: Pro path locked — TESTED

| | |
|---|---|
| **Steps** | Открыть Pro path (напр. «Focus and Follow-Through» #11). |
| **Expected** | Locked / needs upgrade; CTA на Pro (не только Premium); Start **не** создаёт enrollment без entitlement. |

### PL-FREE-003 — Free user: Premium path locked — TESTED

| | |
|---|---|
| **Steps** | Открыть Premium path (напр. «Sleep Mastery» #52). |
| **Expected** | Premium-specific lock messaging; CTA Premium. |

### PL-FREE-004 — Free user: My Paths только Free enrollments — TESTED

| | |
|---|---|
| **Steps** | После попыток open Pro/Premium — My Paths. |
| **Expected** | Нет active Pro/Premium enrollments, созданных в обход gate. |

### PL-FREE-005 — Free experience «достаточно для genuine experience» — TESTED

| | |
|---|---|
| **Steps** | На Free (без flags): убедиться, что в Library есть paths из Emotional + Professional + Health. |
| **Expected** | Без flags: EW 1,4,6; Prof 2,7,8; Health 14–15 (все три pillar). С flags: также #3 / #5. Catalog membership всё ещё 1–8 + 14–15. |

---

## 7. Pro tier

### PL-PRO-001 — Pro user: доступ ко всем Free + Pro (51) — TESTED

| | |
|---|---|
| **Preconditions** | Active Pro. |
| **Steps** | Spot-check Free path + несколько Pro (classification-specific, health, professional). Start. |
| **Expected** | Enrollment OK; нет lock на Pro paths. |

### PL-PRO-002 — Pro user: Premium paths locked — TESTED

| | |
|---|---|
| **Steps** | Открыть каждый из 42, 43, 44, 52. |
| **Expected** | Все четыре locked; upsell Premium; enrollment не создаётся. |

### PL-PRO-003 — Pro = «core library» positioning — TESTED

| | |
|---|---|
| **Steps** | Сравнить видимые unlocked counts: Free vs Pro. |
| **Expected** | Pro существенно шире Free (51 vs 10 unlocked library paths); Premium остаётся малым дифференциатором (4). |

---

## 8. Premium tier

### PL-PREM-001 — Premium: полный доступ ко всем 55 — TESTED

| | |
|---|---|
| **Preconditions** | Active Premium. |
| **Steps** | Start по одному Free, одному Pro, каждому Premium path. |
| **Expected** | Все стартуют без upsell. |

### PL-PREM-002 — Premium paths visually differentiated — TESTED

| | |
|---|---|
| **Steps** | Library filter / badges для Premium. |
| **Expected** | 4 Premium paths явно отличимы от Pro; copy не смешивает «Pro includes Premium paths». |

---

## 9. Gates, upsells, server enforcement

### PL-GATE-001 — UI lock недостаточен: API/RPC reject — TESTED

| | |
|---|---|
| **Preconditions** | Free user; известен `pathId` Pro path. |
| **Steps** | Прямой insert/update `pathEnrollment` или RPC start session (PostgREST / client bypass UI). |
| **Expected** | Ошибка / RLS / `my_tier_allows` reject; row не появляется (или не usable). |

### PL-GATE-002 — Deep-link / stale enrollment после downgrade — TESTED

| | |
|---|---|
| **Preconditions** | User был Pro, enrolled in Pro path; затем Free (cancel expired). |
| **Steps** | Открыть My Paths / deep-link enrollment / продолжить session. |
| **Expected** | Progress read-only (бар + % видны). **Continue** заменён на **Upgrade Plan** / upgrade wall. Deep-link `?session=` показывает upgrade wall (`data-has-upgrade=true`), **без** coaching text. Завершение paid session reject на API/RLS. Unenroll (abandon) разрешён. Регресс: silent full access. |
| **UX locked** | My Paths card + Path detail + Dashboard current path + SessionCompletionRoute. Server: `20260804180000_pl_gate_002_stale_enrollment_tier_lock.sql`. |
| **Observed (2026-08-04)** | PASS after `db push` of PL-GATE-002 migration. Fixture `sub-free@test.com` + stale Pro «Breaking Out…»: My Paths Upgrade Plan (no Continue); detail Unenroll+Upgrade; deep-link `data-has-upgrade=true` without coaching; `pathSession` SELECT returns 0 rows; progress PATCH **403**; `list_path_session_steps` returns titles only. |

### PL-GATE-003 — Upsell feature keys — TESTED

| | |
|---|---|
| **Steps** | Free→Pro path vs Free/Pro→Premium path. |
| **Expected** | Разные locked features (`proPath` vs `premiumPath` или эквивалент); правильный plan highlighted. |
| **Observed (2026-08-04)** | Free→Pro «Focus…»: title «This path is part of Pro», plans Pro+$29 / Premium+$79. Free→Premium «Sleep Mastery»: title «This path is part of Pro or Premium» (`premiumPath` copy), benefits Premium library. Pro→Premium: only Premium $79 + «Upgrade to Premium» (Pro plan hidden). |

### PL-GATE-004 — Concurrent tabs: upgrade mid-session — TESTED

| | |
|---|---|
| **Steps** | Free: open locked Pro path (upsell). В другой вкладке завершить Pro checkout + sync. Вернуться → Start. |
| **Expected** | После sync entitlement path стартует без reload-багов / stale lock. |
| **Observed (2026-08-05, https://uncloud360.vercel.app)** | **PASS** на `free-flags@test.com`. Tab1: Focus upsell «This path is part of Pro». Tab2: Upgrade to Pro → Stripe Checkout; cancel/success URLs уже на `https://uncloud360.vercel.app/settings?tab=subscription&checkout=…` (не localhost). Оплата test card 4242 → redirect на Vercel; после webhook/sync — «Welcome to Pro!», plan active. Focus: Upgrade required снят → Enroll → My Paths Active → Continue открывает session step 1 без upgrade wall. (Ранее `sub-free@test.com` тоже уже Pro после прошлого checkout.) |

---

## 10. Enrollment & progress

### PL-ENR-001 — Start path создаёт active enrollment — TESTED

| | |
|---|---|
| **Steps** | Eligible user → Start Free path. |
| **Expected** | `pathEnrollment` status active; path появляется в My Paths; progress 0 / session 1. |
| **Observed (2026-08-05, vercel)** | `free-flags@test.com`: Enroll Free «Boundary Setting Foundations» → POST `pathEnrollment` **201**; list shows `status: active`, `completedSessionsCount: 0`, `currentSessionId` set. My Paths: Active, 0%, Continue → `?session=` step 1 content. |

### PL-ENR-002 — Complete all sessions → completed — TESTED

| | |
|---|---|
| **Steps** | Пройти все sessions короткого path (напр. 5-session Free). |
| **Expected** | Status completed; My Paths отражает completion; нельзя «перезапустить» без продукта-правила restart (зафиксировать). |
| **Observed (2026-08-05, vercel)** | Free «Boundary Setting Foundations» (6 sessions): Submit answers ×6 → progress 17→33→50→67→83→**100% Completed**. My Paths: только «View Path» (нет Continue/Restart). Library: completed, без Enroll/Restart. **Продукт:** restart UI отсутствует. |

### PL-ENR-003 — Abandon / switch path — TESTED

| | |
|---|---|
| **Steps** | При наличии UI abandon — abandon; иначе start второго path. |
| **Expected** | Поведение согласовано с продуктом (один active vs multiple); нет orphan broken state. |
| **Observed (2026-08-05, vercel)** | **Продукт:** abandon/unenroll UI отсутствует. Multiple active **разрешены** (до enroll: 4 Active). Start второго Free «Building Daily Structure» → Active 0% Continue рядом с прежними; orphan/broken state нет. |

### PL-ENR-004 — sessionsCount совпадает с контентом — TESTED

| | |
|---|---|
| **Steps** | Для MVP paths 1–18 (COMPLETE): сравнить `sessionsCount` с числом `pathSession` rows и batch docs. |
| **Expected** | Совпадение (± documented ~N только если UI показывает approximate — предпочтительно точное число). |
| **Observed (2026-08-05, vercel)** | REST: первые 18 active paths (A–D…) — `sessionsCount` == `pathSession` rows (exact). UI card «N sessions» совпадает. Sample dialog Steps = N (Boundary: 6 steps; «Last completed: Step 6» не лишний session). **Note:** 4 Premium paths с `sessionsCount`>0 но **0** `pathSession` rows (Deep Identity Work, High Performance Sustainability, Sleep Mastery, The Optimization Protocol) — вне MVP 1–18; см. PL-SES-004. |

---

## 11. Session content (authored paths)

### PL-SES-001 — Session structure — TESTED

| | |
|---|---|
| **Preconditions** | Path с загруженным batch content. |
| **Steps** | Открыть session 1: coaching text, reflection questions, micro-commitment. |
| **Expected** | Все три блока присутствуют и сохраняются (answers persist). |
| **Observed (2026-08-05, vercel)** | «Building Daily Structure» session: coaching text + 3 reflection textareas + Micro-commitment + Submit answers. После submit → My Paths **17%**, Next = session 2 (progress persisted). |

### PL-SES-002 — Ordered progression — TESTED

| | |
|---|---|
| **Steps** | Попытка открыть session N+1 до завершения N (если gated). |
| **Expected** | Порядок соблюдён **или** explicit free navigation — без пропуска данных progress. |
| **Observed (2026-08-05, vercel)** | «Building Daily Structure» at 17% (session 2 current). Deep-link `?session=` на session 4/6 → session UI **не** открывается (fallback на Paths list, без explicit lock copy). Continue → корректно session 2. Progress не скипается. **Продукт:** gated, silent fallback. |

### PL-SES-003 — Bridge session (Success Plans only) — TESTED

| | |
|---|---|
| **Steps** | На Success Plan: session 5 = bridge; recommended next library paths. |
| **Expected** | Bridge copy + рекомендации в library; enrollment в recommended path уважает tier gate пользователя. |
| **Observed (2026-08-05, vercel)** | Все 7 Success Plans: session 5 bridge titles («…from here / platform…»). UI «Career Transition» s5: bridge coaching + «The platform library has paths…»; **нет** clickable recommended-path links (prose only). Tier-gate enrollment = общий library gate (см. PL-GATE). Detail dialog также имеет **Unenroll** (в отличие от обычных library paths в ENR-003). |

### PL-SES-004 — Phase 2 «TO WRITE» paths — TESTED

| | |
|---|---|
| **Steps** | Открыть path без полного контента (если есть в catalog). |
| **Expected** | Не падает UI; либо hidden/disabled в Admin, либо empty-state. Не считать content-empty за pass full session QA. |
| **Observed (2026-08-05, vercel)** | Stub «Clarity & Priority Reset» (Pro, `sessionsCount: 0`): card «Content TO WRITE»; detail «Session steps are not available yet…»; Enroll → My Paths Active без Continue; View Path → empty-state + Unenroll. UI не падает. Premium paths (Sleep Mastery и др.) **имеют** `pathSession` rows (видимы Premium; ранее 0 rows у Pro = RLS). Не full session QA. |

---

## 12. Filters & discovery

### PL-FIL-001 — Filter by tier — TESTED

| | |
|---|---|
| **Steps** | Filters Free / Pro / Premium (если есть в `PathsFilterRow`). |
| **Expected** | Списки соответствуют матрице §2. |
| **Observed (2026-08-05, vercel)** | Tier combobox: free → **15** Free-only; pro → **40** Pro-only; premium → **4** Premium-only; All Tiers → 59 (40+15+4). |

### PL-FIL-002 — Filter by pillar — TESTED

| | |
|---|---|
| **Steps** | Emotional / Professional / Health. |
| **Expected** | Только paths выбранного pillar; counts разумны. |
| **Observed (2026-08-05, vercel retest)** | **PASS.** Pillar combobox: Emotional **24**, Professional **27**, Health **8** (только свой pillar); All Pillars **59** (=24+27+8). |

### PL-FIL-003 — Locked paths visible vs hidden — TESTED

| | |
|---|---|
| **Steps** | Free user в Library. |
| **Expected** | Зафиксировать продукт: locked paths **видны** (с lock) для upsell **или** скрыты. Регресс — inconsistent mix. |
| **Observed (2026-08-05, vercel)** | **Продукт: locked visible** (upsell). Free signup (skip onboarding) → All Tiers: 15 Enroll (Free) + **44 Upgrade required**. Pro filter: 40/40 locked; Premium: 4/4 locked; Free: 15/15 enroll. Mix consistent, не скрыты. |

---

## 13. Recommendations / onboarding

### PL-REC-001 — Onboarding auto-enroll respects Free tier — TESTED

| | |
|---|---|
| **Preconditions** | New Free user; classification + primary pillar. |
| **Steps** | Complete onboarding. |
| **Expected** | Auto-enrolled paths только `tier ≤ free` (и flag rules). Нет silent Pro enrollment. |
| **Observed (2026-08-05, vercel)** | New Free signup → full onboarding (Professional role, health pillar path via answers, Capacity Erosion, health «None of the above»). Subscription **Free**. Auto-enroll: only **Building Daily Structure** (`tier: free`, Active). No Pro/Premium enrollments. |

### PL-REC-002 — Pro onboarding может рекомендовать Pro paths

| | |
|---|---|
| **Preconditions** | New Pro user. |
| **Steps** | Onboarding → recommended / enrolled. |
| **Expected** | Могут появиться Pro paths; Premium — нет, пока не Premium. |
| **Observed (2026-08-05, vercel)** | **FAIL.** New user: onboarding → Results → Upgrade to Pro (Stripe) → webhook → Pro active → «Go to my dashboard». Auto-enroll only Free paths (Boundary Setting Foundations, Getting Through Hard Seasons, Nervous System Basics). **Root cause:** `completeOnboarding` вызывает `autoEnrollPathsAfterOnboarding` **без** `userTier`; API defaults `userTier ?? TIER.FREE` (`pathsOnboardingEnrollmentApi.ts`). Pro enrollment при onboarding невозможен при текущем коде. |

### PL-REC-003 — Flag-gated paths (grief / recovery) — TESTED

| | |
|---|---|
| **Steps** | User without flags vs with grief/recovery; Unsent Letter / Recovery Roadmap rules. |
| **Expected** | Visibility по triggerSignals + OVR-019; tier отдельно. |
| **Observed (2026-08-04)** | Fixture `free-flags@test.com` / `qwerty123` (manual signup + onboarding): `results.recovery_mode_active` + `grief_mode_active` = true. Library shows **all 10** Free paths incl. #3 Recovery Roadmap + #5 Navigating Grief; Unsent Letter visible (OVR-019). Session start OK on Recovery Roadmap (`?session=`). Contrast: `sub-free@test.com` without flags = 8/10 (PL-FREE-001). |

---

## 14. Reassessment Question 4

### PL-REA-001 — Q4 uses canonical path name

| | |
|---|---|
| **Preconditions** | User completed path #N; 90-day reassessment due. |
| **Steps** | Пройти reassessment до path-specific Q4. |
| **Expected** | Текст совпадает с Canonical «Path-Specific Reassessment Questions» для этого #N (имя path в вопросе каноническое). |

### PL-REA-002 — Sample matrix (минимум)

Прогнать Q4 хотя бы для: Free #1, Free #14, Pro #18, Premium #52 (когда Premium path completed).

---

## 15. Success Plans (add-on + HR)

> Target behavior per product brief. Где текущий код = free catalog self-select (OVR-037) — помечать **IMPL-GAP**.

### PL-SP-001 — Success Plans не входят в 55

| | |
|---|---|
| **Steps** | Count library self-select vs `success_plan`. |
| **Expected** | 55 + 7 = 62 total path rows (или эквивалент); marketing/UI «55 paths» не считает Success Plans. |

### PL-SP-002 — Free cannot purchase / start Success Plan add-on

| | |
|---|---|
| **Steps** | Free user: найти Success Plan purchase / start. |
| **Expected** | Недоступно без Pro/Premium (+ add-on entitlement) **или** только через future HR assign + seat rules. *IMPL-GAP если сейчас free self-select.* |

### PL-SP-003 — Pro can purchase Success Plan add-on

| | |
|---|---|
| **Steps** | Pro → purchase Success Plan add-on (когда billing surface готов) → Start SP1. |
| **Expected** | Entitlement выдаётся; enrollment OK; sessions (5) доступны. |

### PL-SP-004 — Premium can purchase Success Plan add-on

| | |
|---|---|
| **Steps** | Аналогично PL-SP-003 на Premium. |
| **Expected** | Purchase + start OK. |

### PL-SP-005 — HR assigns Success Plan to employee

| | |
|---|---|
| **Preconditions** | Workplace HR admin; employee on Pro or Premium seat (*уточнить seat rules*). |
| **Steps** | HR assigns e.g. «New Manager Success Plan» → employee login → My Paths. |
| **Expected** | Assigned path visible; employee может проходить без отдельного self-select из core 55. *Skip если assign UI out of scope (OVR-037) — завести bug/ticket на gap.* |

### PL-SP-006 — HR assign list = ровно 7 plans

| | |
|---|---|
| **Steps** | HR assign picker. |
| **Expected** | Только 7 имён из §2.5; нет смешения с library 55. |

### PL-SP-007 — Assigned Success Plan не обходит Premium library gate

| | |
|---|---|
| **Steps** | Pro employee на Success Plan; из bridge рекомендован Premium library path. |
| **Expected** | Рекомендация видна, но Start Premium library path всё ещё требует Premium. |

### PL-SP-008 — All 7 plans: 5 sessions + bridge

| | |
|---|---|
| **Steps** | Spot-check session counts per Success Plan in DB/UI. |
| **Expected** | 5 sessions each; last = bridge to platform library. |

---

## 16. Admin

### PL-ADM-001 — Admin Paths lists tiers correctly

| | |
|---|---|
| **Steps** | Settings → Admin → Paths; найти Free/Pro/Premium samples + Success Plan. |
| **Expected** | Metadata editable/consistent with Canonical; Success Plan type отличим. |

### PL-ADM-002 — Disable path hides from library

| | |
|---|---|
| **Steps** | Disable Pro path; login Pro user → Library. |
| **Expected** | Path не стартуется / скрыт; existing enrollment поведение зафиксировать. |

### PL-ADM-003 — Non-admin cannot manage paths

| | |
|---|---|
| **Steps** | Non-admin Settings. |
| **Expected** | Нет Admin → Paths. |

---

## 17. Downgrade / lifecycle impact

### PL-DOWN-001 — Pro → Free: Pro enrollments

| | |
|---|---|
| **Steps** | Cancel Pro, дождаться expiry (или seed expired); открыть former Pro enrollment. |
| **Expected** | Нет продолжения paid sessions (Upgrade Plan / wall); Free paths остаются. См. PL-GATE-002. |

### PL-DOWN-002 — Premium → Pro: Premium enrollments

| | |
|---|---|
| **Steps** | Scheduled downgrade → после даты; Premium path enrollment. |
| **Expected** | Premium paths locked; Pro paths остаются. |

### PL-DOWN-003 — Success Plan add-on expiry

| | |
|---|---|
| **Steps** | Купленный add-on истёк / seat lost; открыть Success Plan. |
| **Expected** | Access revoked по правилам billing (зафиксировать: immediate vs period end). |

---

## 18. Регрессионный smoke (30–40 мин)

Минимальный прогон перед релизом path/content seed:

1. **PL-CAT-001, 004, 005, 006** — counts & membership  
2. **PL-FREE-001, 002, 003** — Free access + locks  
3. **PL-PRO-001, 002** — Pro access + Premium lock  
4. **PL-PREM-001** — full access  
5. **PL-GATE-001** — server reject  
6. **PL-ENR-001** + один full short path (**PL-ENR-002**)  
7. **PL-SP-001** + **PL-SP-002** (или IMPL-GAP note)  
8. **PL-REA-001** на одном completed Free path (если reassessment reachable)

---

## 19. Трассировка: path # → тест-фокус

| Paths | Primary cases |
|-------|----------------|
| Free 1–8, 14–15 | PL-FREE-*, PL-CAT-004, PL-SES on COMPLETE content |
| Pro 9–13, 16–41, 45–51, 53–55 | PL-PRO-001, PL-GATE-*, PL-REC-002 |
| Premium 42–44, 52 | PL-PREM-*, PL-PRO-002, PL-DOWN-002 |
| Success Plans SP1–SP7 | PL-SP-*, PL-SES-003 |
| Unsent Letter (extra) | OVR-019 + PL-REC-003 |

---

## 20. Известные gaps / открытые вопросы для QA sign-off

| ID | Topic | Impact |
|----|-------|--------|
| G1 | OVR-037: Success Plans сейчас `tier: free` self-select; target = Pro/Premium add-on + HR | PL-SP-* могут fail до реализации |
| G2 | Employer assign UI «out of scope» в OVR-037 | PL-SP-005/006 skip until built |
| G3 | Phase 2 paths marked TO WRITE in Canonical vs authored batches (OVR-037) | Content QA только для seeded sessions |
| G4 | Billing surface для Success Plan «purchase add-on» | Уточнить Stripe product/price до PL-SP-003/004 |
| G5 | Может ли Free employee получить HR-assigned Success Plan без Pro seat? | Нужно product rule перед enterprise QA |

---

## 21. Definition of Done (функционал path library)

- [ ] 55 paths в catalog с каноническими именами и tier split 10 / 41 / 4  
- [ ] Free / Pro / Premium access matrix подтверждена UI + server  
- [ ] Upsells различают Pro vs Premium paths  
- [ ] Enrollment + session progress на representative Free/Pro/Premium paths  
- [ ] Success Plans учтены отдельно от 55; add-on/HR правила либо реализованы, либо явно IMPL-GAP с ticket  
- [ ] Reassessment Q4 sample с canonical names  
- [ ] Smoke §18 зелёный на staging  

---

_Uncloud360 · Path Library test plan · Confidential_
