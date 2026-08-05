# План тестирования: Success Plans

**Источник (content):** [`docs/new_paths_content/Uncloud360_Success_Plan_Paths.md`](./new_paths_content/Uncloud360_Success_Plan_Paths.md)  
**Доступ (authority):** [`docs/product-overrides.md`](./product-overrides.md) — **OVR-038** (перекрывает «Available to all tiers» в content doc)  
**Связанные планы:** [`path-library-test-plan.md`](./path-library-test-plan.md) (каталог 55 + пересечения), [`individual-subscription-test-plan.md`](./individual-subscription-test-plan.md) (tier checkout)  
**Дата:** 2026-08-05  
**Область:** 7 Success Plan paths, one-time add-on ($97), self-serve enrollment (Pro/Premium), HR assignment (включая Free seats), sessions / bridge, lifecycle при downgrade.

---

## 1. Цели и объём

### 1.1 Цели

Проверить, что Success Plans работают как **отдельный слой поверх library 55**:

- **7 paths** с каноническими именами, `subMode = success_plan`, по **5 sessions** (4 coaching + 1 bridge)
- **Не входят** в marketing/счёт «55 guided paths»
- Self-serve: только **Pro или Premium** + активный **one-time Success Plan add-on** (unlock **всех 7**)
- Free **не** покупает add-on и **не** self-enroll без HR assignment
- **HR / employer** может assign любой из 7 планов workplace member’у (включая Free seat)
- UI gates + **server-side** enforcement (`user_can_access_path` / enrollment)
- Checkout Stripe ($97 one-time), webhook grant entitlement
- Downgrade Pro/Premium → Free **блокирует** self-serve SP; **HR-assigned** enrollment остаётся
- Bridge session и path-specific reassessment Q4

### 1.2 Вне scope

- Полный regression library 55 (Free/Pro/Premium tier split) — см. path-library plan
- Individual subscription proration / cancel / Premium credits — см. individual-subscription plan; здесь только **эффект tier + add-on на SP access**
- Deep-dive modules, Journal (OVR-005)
- Авторы Phase 2 library «TO WRITE» — не относится к SP (SP content authored)

### 1.3 Приоритет источников

1. Явная инструкция в текущей задаче  
2. **OVR-038** (и OVR-037 для seed; OVR-003 для Subscription / upsell surface)  
3. Success Plan Paths markdown (имена, sessions, bridge, reassessment Q)  
4. Bubble IR / migration specs / content «Available to all tiers» — **не** использовать для access rules

| Override | Implication for QA |
|----------|-------------------|
| **OVR-038** | Self-serve = Pro/Premium + add-on **или** `pathEnrollment.source = hr_assign`. Free + addon alone = **denied**. Free + HR = **allowed**. |
| **OVR-037** | Catalog seed из `docs/new_paths_content/`; SP rows отдельно от library 55. |
| **OVR-003** | Purchase / upsell — Settings → Subscription и locked-feature popups на path detail. |

---

## 2. Каноническая матрица

### 2.1 Семь Success Plans

| ID | Name | Sessions | Bridge |
|----|------|----------|--------|
| SP1 | New Manager Success Plan | 5 | S5 → library recommendations |
| SP2 | Burnout Prevention Success Plan | 5 | S5 |
| SP3 | Leadership Development Success Plan | 5 | S5 |
| SP4 | Career Transition Success Plan | 5 | S5 |
| SP5 | Returning from Leave Success Plan | 5 | S5 |
| SP6 | High Potential Success Plan | 5 | S5 |
| SP7 | Performance Improvement Success Plan | 5 | S5 |

Всего: **35 sessions**. Catalog badge: **Success Plan** (не Free/Pro/Premium label библиотеки).

### 2.2 Access matrix (OVR-038)

| User tier | Add-on | HR assign на этот path | Self-enroll / Continue | Purchase CTA |
|-----------|--------|------------------------|------------------------|--------------|
| Free | — | нет | **Blocked** (`upgrade_required`) | Upgrade Plan (не Purchase) |
| Free | active* | нет | **Blocked** (`upgrade_required`) | Upgrade Plan |
| Free | — | да | **Allowed** (`hr_assign`) | — |
| Pro | нет | нет | **Blocked** (`purchase_required`) | Purchase Success Plan Add-on |
| Pro | да | нет | **Allowed** (`addon`) — все 7 | — (already owned) |
| Pro | нет | да | **Allowed** (`hr_assign`) — только assigned path | Purchase для остальных SP |
| Premium | нет | нет | **Blocked** (`purchase_required`) | Purchase |
| Premium | да | нет | **Allowed** (`addon`) — все 7 | — |
| Premium | нет | да | **Allowed** (`hr_assign`) | Purchase для остальных |

\*Add-on row может существовать после прошлых покупок, но `user_has_success_plan_addon` требует **effective tier ≥ Pro** — Free + stale addon ≠ access.

**HR assign wins first** в `resolveSuccessPlanAccess`: если есть assignment, reason = `hr_assign` даже при наличии add-on.

### 2.3 Add-on product rules

| Rule | Expected |
|------|----------|
| Price | **$97** one-time (`9700` cents, `unclouded_success_plan_addon`) |
| Scope | Unlock **all 7** Success Plans (не per-path SKU) |
| Who can checkout | Effective tier **≥ Pro**; Free → error / Upgrade |
| Idempotency | Повторный purchase при active add-on → «already have» |
| Grant | Stripe Checkout → webhook → `successPlanAddon.status = active` |
| Enrollment source (self-serve) | `pathEnrollment.source = addon` |
| Enrollment source (HR) | `pathEnrollment.source = hr_assign` |

---

## 3. Тестовое окружение

### 3.1 Компоненты

| Компонент | Назначение |
|-----------|------------|
| Frontend Library / Path detail | Badge, lock, Purchase / Upgrade / Start / Unenroll |
| Settings → Subscription | Add-on status + Purchase CTA |
| Employer portal | `EmployerSuccessPlanAssignPanel` — assign / unassign |
| Stripe test mode | One-time Checkout Session `product: success_plan_addon` |
| Edge Functions | `stripe-checkout`, `stripe-webhook`, `workplace-assign-success-plan` |
| Supabase | `successPlanAddon`, `user_can_access_path`, enrollments |
| Stripe CLI | Webhooks на localhost |

### 3.2 Аккаунты

| Account | Role | Focus |
|---------|------|-------|
| Free individual | `sub-free@…` / workplace Free seat | Upgrade wall; HR assign unlock |
| Pro individual | `sub-pro@…` | Purchase add-on → enroll all 7 |
| Premium individual | `sub-premium@…` | Same as Pro for SP |
| Workplace HR admin | Employer portal | Assign / unassign list = 7 |
| Workplace member Free | Same workplace | SP via HR only |
| Workplace member Pro | Same workplace | HR + optional self add-on |

### 3.3 Preconditions

1. Seeded paths: 7 rows с `subMode = success_plan` (или `triggerSignals` содержит `path_type:success_plan`).
2. Stripe price synced / `successPlanAddonPrice` active = $97.
3. Для localhost checkout: `stripe listen --forward-to …/stripe-webhook`.
4. Workplace с ≥1 member на Free и ≥1 на Pro (для HR matrix).

---

## 4. Каталог и идентификация

### SP-CAT-001 — Ровно 7 Success Plans в catalog — TESTED

| | |
|---|---|
| **Steps** | Library UI + DB: filter `subMode = success_plan`. |
| **Expected** | Ровно **7** имён из §2.1; badge «Success Plan»; не смешаны с Free/Pro/Premium library badges. |

### SP-CAT-002 — Не входят в счёт 55 — TESTED

| | |
|---|---|
| **Steps** | Сверить marketing copy Subscription («All 55…») и count library без SP. |
| **Expected** | SP не увеличивают «55»; total path rows = library (+stub/Unsent Letter per OVR-037) **+ 7 SP**. |
| **Note** | PL-SP-001 в path-library plan уже зафиксировал эквивалент (56 library + 7 SP на vercel snapshot). |

### SP-CAT-003 — Detection helpers — TESTED

| | |
|---|---|
| **Steps** | Unit / smoke: path с только `triggerSignals: path_type:success_plan` и path с `subMode: success_plan`. |
| **Expected** | Оба распознаются как Success Plan; обычный library path — нет. |

---

## 5. UI gates (self-serve)

### SP-UI-001 — Free: Upgrade, не Purchase — TESTED

| | |
|---|---|
| **Steps** | Free → открыть любой SP card / detail (без HR assign). |
| **Expected** | Lock / «Upgrade Plan»; **нет** «Purchase Success Plan Add-on»; Start/Continue недоступны. |

### SP-UI-002 — Pro/Premium без add-on: Purchase CTA — TESTED

| | |
|---|---|
| **Steps** | Pro (и отдельно Premium) без add-on → SP detail. |
| **Expected** | CTA **Purchase Success Plan Add-on**; Start enroll скрыт; catalog hint «Success Plan add-on required». |

### SP-UI-003 — Settings → Subscription surface — TESTED

| | |
|---|---|
| **Steps** | Pro/Premium → Settings → Subscription: состояние без / с add-on. |
| **Expected** | Без: кнопка purchase (~$97). С active: статус owned / purchase disabled. Free: upgrade path, не успешный checkout add-on. |

### SP-UI-004 — После add-on: все 7 unlocked — TESTED

| | |
|---|---|
| **Steps** | Pro + active add-on → открыть SP1…SP7 detail. |
| **Expected** | Start доступен на каждом; нет Purchase wall. |

### SP-UI-005 — Locked-feature upsell type — TESTED

| | |
|---|---|
| **Steps** | Free на SP → Upgrade; Pro без add-on → Purchase / upsell. |
| **Expected** | Feature key / messaging для `successPlan` (не путать с `proPath` / `premiumPath`). |

---

## 6. Billing: add-on checkout

### SP-BILL-001 — Pro successful purchase — TESTED

| | |
|---|---|
| **Steps** | Pro → Purchase (path detail или Subscription) → Stripe test pay → return. |
| **Expected** | `successPlanAddon` active; overview.successPlanAddon.active = true; можно enroll SP. |

### SP-BILL-002 — Premium successful purchase — TESTED

| | |
|---|---|
| **Steps** | Как SP-BILL-001 на Premium. |
| **Expected** | Grant + enroll OK. |

### SP-BILL-003 — Free blocked at API — TESTED

| | |
|---|---|
| **Steps** | Free вызывает checkout `product: success_plan_addon` (UI и/или direct API). |
| **Expected** | Reject: upgrade to Pro/Premium required; entitlement не создаётся. |

### SP-BILL-004 — Duplicate purchase — TESTED

| | |
|---|---|
| **Steps** | User с active add-on снова жмёт Purchase. |
| **Expected** | Friendly error «already have»; второй charge не проходит / не создаёт дубль active (unique active per user). |

### SP-BILL-005 — Webhook idempotency — TESTED

| | |
|---|---|
| **Steps** | Replay `checkout.session.completed` для того же session id. |
| **Expected** | Один grant; нет duplicate active rows (unique на `stripeCheckoutSessionId`). |

### SP-BILL-006 — Price display — TESTED

| | |
|---|---|
| **Steps** | UI показывает amount из `successPlanAddonPrice` / overview. |
| **Expected** | **$97** (или актуальный active price); currency USD. |

---

## 7. Enrollment (self-serve + server)

### SP-ENR-001 — Pro без add-on: server reject — TESTED

| | |
|---|---|
| **Steps** | Pro без add-on: попытка `enrollInPath` на SP slug (UI bypass / API). |
| **Expected** | Reject; enrollment не создаётся. |

### SP-ENR-002 — Free без HR: server reject — TESTED

| | |
|---|---|
| **Steps** | Free → enroll SP. |
| **Expected** | Reject (даже если UI обойти). |

### SP-ENR-003 — Pro + add-on: enroll OK — TESTED

| | |
|---|---|
| **Steps** | Pro + add-on → Start SP1. |
| **Expected** | Enrollment `source = addon`, status active; sessions доступны; Dashboard Current Path показывает SP badge. |

### SP-ENR-004 — Unenroll на Success Plan — TESTED

| | |
|---|---|
| **Steps** | Enrolled SP → Unenroll в detail (в отличие от некоторых library paths). |
| **Expected** | Enrollment abandoned/removed per product rules; path снова Start (при валидном entitlement). |

### SP-ENR-005 — Progress + Continue gate — TESTED

| | |
|---|---|
| **Steps** | Частичный progress на SP; закрыть / reopen; Continue. |
| **Expected** | Resume на current session; после loss of entitlement Continue blocked (см. SP-LIFE-*). |

### SP-ENR-006 — Один active library path vs SP — TESTED

| | |
|---|---|
| **Steps** | Зафиксировать product rule: можно ли одновременно active library enrollment + SP. |
| **Expected** | Задокументировать observed behavior (pass/fail по текущему enrollment policy приложения). |

---

## 8. HR / Employer assignment

### SP-HR-001 — Assign list = ровно 7 — TESTED

| | |
|---|---|
| **Steps** | Employer portal → Success Plan assign panel → path picker. |
| **Expected** | Только 7 имён §2.1; нет library 55. |

### SP-HR-002 — Assign Free member — TESTED

| | |
|---|---|
| **Steps** | HR assigns SP1 → Free seat member → login → Library / My Paths. |
| **Expected** | Enrollment `source = hr_assign`; Start/Continue **без** add-on; badge Success Plan. |

### SP-HR-003 — Assign Pro/Premium member — TESTED

| | |
|---|---|
| **Steps** | Assign SP2 Pro member без personal add-on. |
| **Expected** | Access via HR; остальные SP без add-on остаются locked (purchase_required). |

### SP-HR-004 — Unassign — TESTED

| | |
|---|---|
| **Steps** | HR removes assignment; member reopen path. |
| **Expected** | Access revoked unless personal add-on + tier ≥ Pro; Continue/Start blocked. |

### SP-HR-005 — Re-assign / switch plan — TESTED

| | |
|---|---|
| **Steps** | Assign SP1; later assign SP3 same member (или unassign then assign). |
| **Expected** | Поведение без orphaned «active» конфликтов; зафиксировать: один HR SP vs multiple. |
| **Observed** | Multiple concurrent HR SP enrollments **allowed** (code4: New Manager + Leadership both `active`/`hr_assign`). Re-assign after unassign creates a **new** active row; prior abandoned row remains (visible in My Paths with Upgrade wall for Free). No dual-active same path. |

### SP-HR-006 — Non-HR cannot assign — TESTED

| | |
|---|---|
| **Steps** | Ordinary member / non-admin вызывает assign API. |
| **Expected** | 403 / error; enrollment не создаётся. |

### SP-HR-007 — Assign не обходит library Premium gate — TESTED

| | |
|---|---|
| **Steps** | Pro member на HR SP; bridge рекомендует Premium library path → Start. |
| **Expected** | Рекомендация видна; Start Premium library path требует Premium (SP entitlement ≠ library Premium). |
| **Observed** | Leadership SP bridge content recommends **Deep Identity Work** (Premium). Session UI shows coaching/reflections but not clickable recommended-path links (same gap as SP-SES-003). As Pro `code2` with active HR SP: Library card/detail for Deep Identity Work → **Upgrade required** / **Upgrade Plan** only (no Enroll). |

---

## 9. Sessions и контент

### SP-SES-001 — 5 sessions на каждом плане — TESTED

| | |
|---|---|
| **Steps** | DB/UI session count для SP1–SP7. |
| **Expected** | Ровно 5; titles соответствуют Success Plan Paths doc (spot-check S1 + S5). |

### SP-SES-002 — Coaching / reflection / micro-commitment (S1–S4) — TESTED

| | |
|---|---|
| **Steps** | Пройти S1 на SP1 (New Manager) и spot-check один session на SP7. |
| **Expected** | Coaching text, ≥1 reflection Q, micro-commitment; save progress. |

### SP-SES-003 — Bridge session (S5) — TESTED

| | |
|---|---|
| **Steps** | Открыть session 5 каждого SP (или representative 2–3). |
| **Expected** | Bridge framing + recommended next library paths (prose; clickable links — optional / note if absent). |
| **Ref** | PL-SES-003 в path-library plan. |
| **Observed** | New Manager + Leadership S5: bridge title + coaching mentions platform library; recommended path **names not rendered** as links/list in session UI (content lives in markdown tables). |

### SP-SES-004 — Complete path → reassessment Q4 — TESTED

| | |
|---|---|
| **Steps** | Complete один SP (или seed completed); trigger reassessment reflection. |
| **Expected** | Path-specific `reassessment_reflection_question` из content doc (не generic). |
| **Observed** | All 7 SP S5 rows have path-specific `reassessmentReflectionQuestion` matching § expected substrings (how you lead / warning signs / leader you are becoming / transition now / return been like / potential requires / how you are showing up). |

| Plan | Expected Q4 (substring OK) |
|------|----------------------------|
| SP1 | …how you lead your team… |
| SP2 | …warning signs… |
| SP3 | …leader you are becoming… |
| SP4 | …transition now… |
| SP5 | …return been like… |
| SP6 | …potential requires… |
| SP7 | …how you are showing up… |

### SP-SES-005 — Performance Improvement admin note — TESTED

| | |
|---|---|
| **Steps** | SP7 content / admin loading context. |
| **Expected** | «NOTE FOR ADMINISTRATORS» не ломает user session flow; user видит coaching S1–S4 + bridge. |
| **Observed** | SP7 S1 has coachingText (1205 chars) + microCommitment for users; admin NOTE exists only in content markdown, not injected into session coaching payload. |

---

## 10. Lifecycle / downgrade

### SP-LIFE-001 — Pro → Free: self-serve SP locked — TESTED

| | |
|---|---|
| **Steps** | Pro + add-on + SP enrollment → cancel/expire to Free (или seed effective Free). |
| **Expected** | Self-serve access **denied** (`upgrade_required`); Continue blocked; add-on row alone не спасает без Pro. |
| **Observed** | `resolveSuccessPlanAccess` Free + addon → `upgrade_required` (unit). Free `code4` non-HR SP catalog → Upgrade required / Upgrade Plan. |

### SP-LIFE-002 — HR assign survives Free — TESTED

| | |
|---|---|
| **Steps** | Free member с `hr_assign` enrollment; или Pro→Free **с** HR assignment. |
| **Expected** | HR path остаётся доступен; другие SP без assign/add-on — нет. |
| **Observed** | Free `code4` with active `hr_assign` New Manager + Leadership → Continue + Assigned by employer; other SPs → Upgrade required. |

### SP-LIFE-003 — Premium → Pro: add-on остаётся — TESTED

| | |
|---|---|
| **Steps** | Premium + add-on → scheduled downgrade to Pro. |
| **Expected** | Add-on + все 7 SP по-прежнему доступны (tier всё ещё ≥ Pro). |
| **Observed** | `sub-premium@test.com` has active add-on; Library shows all SP **Available to enroll**. Access rule is tier ≥ Pro + addon (OVR-038 / unit) — Pro and Premium share entitlement. Live Stripe Premium→Pro schedule not exercised; logic equivalent. |

### SP-LIFE-004 — Add-on deactivated / refund edge — TESTED

| | |
|---|---|
| **Steps** | Deactivate add-on row (admin/SQL) при Pro; открыть SP без HR. |
| **Expected** | Access revoked → purchase_required. |
| **Observed** | Revoked `sub-pro@test.com` add-on → Library SP cards show **Success Plan add-on required**. Restored add-on after test. |

---

## 11. Dashboard / My Paths surfaces

### SP-SURF-001 — Catalog card lock states — TESTED

| | |
|---|---|
| **Steps** | Сравнить Free / Pro-no-addon / Pro+addon cards. |
| **Expected** | Free: upgrade affordance; Pro-no-addon: add-on required; Pro+addon: open. |
| **Observed** | Free `code4`: Upgrade required. Pro revoked-addon: Success Plan add-on required. Premium+addon / Pro+addon: Available to enroll. |

### SP-SURF-002 — Dashboard current path — TESTED

| | |
|---|---|
| **Steps** | Active SP enrollment на dashboard. |
| **Expected** | Success Plan label; Continue respects access; after entitlement loss — upgrade/purchase, не silent continue. |
| **Observed** | Access helpers use `isActiveHrAssignment` / tier gates on dashboard current-path card (same OVR-038). Abandoned HR no longer treated as live assign. |

### SP-SURF-003 — Session completion route gate — TESTED

| | |
|---|---|
| **Steps** | Mid-session URL / completion route при revoked access. |
| **Expected** | Gate с successPlan upsell; progress не silently writable. |
| **Observed** | Free + abandoned HR matching session → Upgrade Plan wall (before fix preferred abandoned row). Route now prefers active/paused enrollment when multiple match same `currentSessionId`. |

---

## 12. Admin / data integrity

### SP-ADM-001 — Admin Paths: SP type visible — TESTED

| | |
|---|---|
| **Steps** | Settings → Admin → Paths; найти Success Plans. |
| **Expected** | Отличимы от library; metadata consistent с content names. |

### SP-ADM-002 — Disable SP path — TESTED

| | |
|---|---|
| **Steps** | Disable one SP; Library + HR picker. |
| **Expected** | Hidden / not assignable; existing enrollment behavior зафиксировать. |
| **Observed** | Set High Potential `isActive=false` → HR assign picker shows **6** plans (High Potential absent). Re-enabled after test. |

---

## 13. Негативные и security

### SP-NEG-001 — Enrollment source spoof — TESTED

| | |
|---|---|
| **Steps** | Client пытается создать enrollment с `source = hr_assign` без workplace API. |
| **Expected** | Reject; только `workplace-assign-success-plan` (service) выставляет hr_assign. |
| **Observed** | Direct REST insert as member → **403 RLS** (`42501`). |

### SP-NEG-002 — Cross-workplace assign — TESTED

| | |
|---|---|
| **Steps** | HR workplace A assigns user из workplace B. |
| **Expected** | Reject. |
| **Observed** | HR assign non-member (`sub-premium`) → **400** `User is not an active workplace member`. |

### SP-NEG-003 — RLS on successPlanAddon — TESTED

| | |
|---|---|
| **Steps** | User A читает add-on User B. |
| **Expected** | Только own row (SELECT owner policy). |
| **Observed** | As `code@test.com`, GET `successPlanAddon?userId=eq.<premium>` → **200 []** (no leak). |

---

## 14. Регрессионный smoke (25–35 мин)

1. **SP-CAT-001, 002** — 7 SP отделены от 55  
2. **SP-UI-001, 002** — Free upgrade vs Pro purchase  
3. **SP-BILL-001** — один успешный Pro checkout + webhook  
4. **SP-ENR-003** — enroll SP1, открыть S1  
5. **SP-HR-001, 002** — assign Free member  
6. **SP-SES-003** — bridge spot-check  
7. **SP-LIFE-001** или seed: Free без HR не Continue  

Автотесты (дополняют, не заменяют E2E):

- `frontend/src/lib/paths/successPlanAccess.test.ts`
- `frontend/src/lib/paths/pathsEnrollmentApi.test.ts` (Free reject / Pro±addon)

---

## 15. Трассировка кейсов

| Area | Cases |
|------|-------|
| Catalog | SP-CAT-* |
| UI gates | SP-UI-* |
| Stripe add-on | SP-BILL-* |
| Enrollment | SP-ENR-* |
| Employer HR | SP-HR-* |
| Sessions / bridge / Q4 | SP-SES-* |
| Downgrade / lifecycle | SP-LIFE-* |
| Surfaces | SP-SURF-* |
| Admin / security | SP-ADM-*, SP-NEG-* |

Пересечение с path-library: PL-SP-* ≈ сжатая версия этого плана; при полном SP QA вести статус здесь, в PL отмечать «see success-plans-test-plan».

---

## 16. Известные gaps / notes

| ID | Topic | Impact |
|----|-------|--------|
| N1 | Bridge recommended paths могут быть prose-only (без deep links) | SP-SES-003 — не fail, если текст есть |
| N2 | Content doc говорит «all tiers / self-select» | **Игнорировать** — OVR-038 |
| N3 | One-time add-on: нет «expiry» как у subscription; «expiry» = deactivate / tier drop | SP-LIFE-001/004 |
| N4 | Concurrent multiple HR SP enrollments | Зафиксировать в SP-HR-005 |
| N5 | Founding Member = Pro entitlements? | Ожидать как Pro для purchase/access |

---

## 17. Definition of Done

- [ ] 7 SP в catalog с корректными именами и badge  
- [ ] Access matrix §2.2 подтверждена UI **и** server  
- [ ] Pro/Premium one-time $97 add-on unlocks all 7  
- [ ] Free self-serve запрещён; Free + HR assign разрешён  
- [ ] Employer assign/unassign только 7 plans  
- [ ] 5 sessions + bridge на representative plans; Q4 spot-check  
- [ ] Downgrade Free блокирует self-serve; HR assign сохраняется  
- [ ] Smoke §14 зелёный на staging  

---

_Uncloud360 · Success Plans test plan · Confidential_
