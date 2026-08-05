# План тестирования: Individual Subscription Management

**Источник:** [`docs/Unclouded _ Individual Subscription Management Flow (1).md`](./Unclouded%20_%20Individual%20Subscription%20Management%20Flow%20(1).md)  
**Дата:** 2026-08-04  
**Область:** Individual billing — Free, Pro, Premium, Founding Member; monthly/yearly; upgrades/downgrades; cancel/resume; Premium credits; 1:1 booking; payment failure; backend entitlements.

---

## 1. Цели и объём

### 1.1 Цели

Проверить, что individual subscription management соответствует спецификации:

- Четыре тарифа (Free, Pro, Premium, Founding Member) и корректное отображение фич по планам
- Monthly/yearly billing (yearly — когда цены подтверждены продуктом)
- Upgrades (Free→Pro, Free→Premium, Pro→Premium с proration) и downgrade (Premium→Pro в конце периода)
- Cancel / resume без потери доступа до конца billing period
- Premium credit accrual, накопление, redemption и потеря при downgrade/expiry
- Contextual upsell pop-ups с locked features
- Статусы: Active, Scheduled to cancel, Scheduled to downgrade, Past due, Inactive/expired
- Server-side enforcement entitlements (UI lock недостаточен)
- Idempotency: duplicate webhooks, double-click, parallel tabs

### 1.2 Вне scope

- Workplace / enterprise billing (`code2@test.com` … `code5@test.com`)
- Admin Users tab (read-only subscription data; deactivate — OVR-035)
- Coaching Insights feed в Pro marketing copy (OVR-036 — не проверять promise «3 articles daily» на карточках Pro)

### 1.3 Приоритет источников

1. Явная инструкция в текущей задаче  
2. [`docs/product-overrides.md`](./product-overrides.md) — особенно OVR-003, OVR-026, OVR-027, OVR-028, OVR-029, OVR-036  
3. Данный документ (client spec)  
4. Bubble IR / migration specs

**OVR-003:** Subscription UI — **Settings → Subscription** (не отдельные removed tabs).  
**OVR-029:** Возврат на Free — только через cancel + expiration; Free card без кнопки при active paid.  
**OVR-026:** Founding Member — 100 seats, $19/12 mo, затем standard Pro $29; FM price не восстанавливается.  
**OVR-027:** 1:1 — monthly credits (2 credits = 30 min session), не «included sessions».  
**OVR-028:** Group session — included в Pro (1/month), без $97 add-on.

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Компонент | Назначение |
|-----------|------------|
| Frontend (`localhost:3000` или staging) | UI subscription screen, upsells, checkout redirect |
| Stripe **test mode** | Checkout, proration, payment failure |
| Supabase Edge Functions | `stripe-checkout`, `stripe-portal`, `stripe-subscription`, `stripe-webhook`, `subscription-lifecycle`, `wix-bookings-webhook` |
| Wix Bookings | Redirect 1:1; webhook confirm/cancel |
| Stripe CLI | Forward webhooks на localhost QA |

### 2.2 Секреты и конфигурация

```powershell
# PowerShell
$env:STRIPE_SECRET_KEY = "sk_test_..."
$env:SUPABASE_SERVICE_ROLE_KEY = "..."
node scripts/sync_stripe_plan_prices.mjs

npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref szkextipgpupqoppccoy
# Canonical origin for email CTAs / invites (not Stripe return URLs).
npx supabase secrets set APP_ORIGIN=https://uncloud360.vercel.app --project-ref szkextipgpupqoppccoy
# Optional extras (comma-separated) for preview hosts beyond the built-in allowlist:
# npx supabase secrets set APP_ORIGINS=https://preview.example.com --project-ref szkextipgpupqoppccoy
```

**Stripe return URLs are dynamic:** `stripe-checkout` / `stripe-portal` take the browser
origin (`returnOrigin` body + `Origin` header), validated against an allowlist
(localhost, Vercel prod/previews, `APP_ORIGIN` / `APP_ORIGINS`). Localhost QA and
Vercel prod can share one Supabase project without flipping `APP_ORIGIN`.

**Localhost checkout:** Stripe не POST'ит webhooks на localhost. Без `stripe listen` **или** Dashboard webhook endpoint на remote `…/stripe-webhook` tier / add-on / Premium credits останутся stale после успешной оплаты (если нет sync fallback).

```bash
# Option A — temporary CLI forward (sets a listen whsec_ you must put in secrets)
stripe listen --forward-to https://szkextipgpupqoppccoy.supabase.co/functions/v1/stripe-webhook
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... --project-ref szkextipgpupqoppccoy

# Option B — permanent Dashboard endpoint (preferred for shared remote)
# stripe webhook_endpoints create --url https://…/functions/v1/stripe-webhook
#   enabled: checkout.session.completed, customer.subscription.*, invoice.paid, invoice.payment_failed
# then secrets set STRIPE_WEBHOOK_SECRET from the endpoint secret
```

**Fallback sync:** после redirect `?checkout=success` app вызывает `stripe-subscription` `action: sync` — подтягивает tier, Premium credit с latest paid invoice, и **Success Plan add-on** с latest paid Checkout session (`product=success_plan_addon`).

**Ops:** `VITE_COACH_BOOKING_URL` для Wix redirect; webhook: `.../functions/v1/wix-bookings-webhook`.

### 2.3 Тестовые карты Stripe

- Успешная оплата  
- Decline (failed upgrade / renewal)  
- 3DS (если включено в Stripe Dashboard)

### 2.4 Годовые цены

Спека: yearly Pro/Premium — **TBD**. Не проверять жёстко зашитые yearly суммы, пока продукт не подтвердил Price IDs. SUB-UP-F2P-002 — skip или placeholder.

---

## 3. Матрица статусов подписки

| Статус | Что симулировать | Ключевые проверки |
|--------|------------------|-------------------|
| **Free** | Нет active paid subscription | Upgrade Pro/Premium; locked paid features |
| **Active** (Pro / Premium / FM) | `status = active`, auto-renew | Renewal date, cancel, upgrades |
| **Scheduled to cancel** | Cancel подтверждён, период не истёк | Access до даты; Resume; нет next renewal |
| **Scheduled to downgrade** | Premium → Pro запланирован | Premium до даты; credits expire copy |
| **Past due** | Failed renewal, в grace period | Banner; Update payment; credits не начисляются |
| **Inactive / expired** | Период закончился | Free tier; credits недоступны |

Scheduled cancel/downgrade **не** считаются immediately inactive.

---

## 4. Тестовые пользователи (seed)

```bash
SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_individual_subscription_test_users.mjs
```

| Email | Tier | Password | Примечание |
|-------|------|----------|------------|
| `sub-free@test.com` | Free | `qwerty123` | Onboarding complete |
| `sub-up-f2p-run@test.com` | Free (checkout E2E) | `qwerty123` | `seed_single_free_checkout_user.mjs` |
| `sub-pro@test.com` | Active Pro | `qwerty123` | |
| `sub-premium@test.com` | Active Premium | `qwerty123` | **2 credits** — bookable 1:1 |
| `sub-pro-cancel@test.com` | Scheduled cancel (Pro) | `qwerty123` | Resume flow |
| `sub-premium-downgrade@test.com` | Scheduled downgrade | `qwerty123` | Credits expiry copy |
| `sub-fm@test.com` | Founding Member | `qwerty123` | FM label, discount end date |

Дополнительно: Premium с 0, 1 credit; FM slot 101 (cap exhausted); past due user (manual Stripe/test clock).

Premium-path upsell: нужен catalog path с `tier=premium` (не менять tier у Pro paths).

---

## 5. Сценарии тестирования

Формат: **ID** — краткое имя. Preconditions → Steps → Expected.

---

### 5.0 Точки входа (Subscription Management Entry Points)

| ID | Сценарий | Preconditions | Steps | Expected |
|----|----------|---------------|-------|----------|
| **SUB-ENTRY-001** | Settings → Subscription — TESTED | Individual user, любой tier | Settings → Subscription | Полный экран: планы, current plan, actions по состоянию |
| **SUB-ENTRY-002** | Landing pricing CTA — TESTED | — | С landing открыть pricing / subscribe | Полный экран или эквивалентный checkout flow |
| **SUB-ENTRY-003** | Locked feature → pop-up — TESTED | Free | Premium path, reassessment, Book group, Book 1:1 | Contextual pop-up (не full settings); планы и тексты — §5.2 |
| **SUB-ENTRY-004** | Pro → 1:1 upsell — TESTED | Active Pro | Book 1:1 / Unlock 1:1 | Title «Unlock 1:1 Sessions»; **только Premium**; Not now / Upgrade to Premium |
| **SUB-ENTRY-005** | Premium без upsell — TESTED | Active Premium, ≥2 credits | Premium path, reassessment, group, 1:1 | Нет upgrade pop-up; прямой доступ / booking |

---

### 5.1 Экран подписки — общие требования

| ID | Сценарий | Expected |
|----|----------|----------|
| **SUB-UI-001** | Обязательные поля по состоянию — TESTED | Планы; monthly/yearly selector; цены; фичи; **Current plan**; billing frequency; next renewal **или** expiration / downgrade effective date; Premium credit balance; только валидные кнопки enabled |
| **SUB-UI-002** | Free card — TESTED | «Current plan»; нет renewal date; нет Cancel |
| **SUB-UI-003** | Free без кнопки при paid — TESTED | Pro/Premium active → Free card без selectable action |
| **SUB-UI-004** | Locale / timezone дат — TESTED | Формат по locale пользователя (напр. «April 15, 2026») |
| **SUB-UI-005** | Checkout amount from provider — TESTED | Amount due, proration, tax — с Stripe/backend; UI не единственный источник финальной суммы |

**Plan card descriptions (smoke):** Free / Pro / Premium feature lists на карточках соответствуют спеке (без Coaching Insights feed на Pro — OVR-036).

---

### 5.2 Free — locked features

| ID | Trigger | Plans in pop-up | Expected copy (ключевые фразы) |
|----|---------|-----------------|--------------------------------|
| **SUB-FREE-LOCK-001** | Premium path — TESTED | Pro + Premium | «Upgrade to Pro or Premium to unlock this path…» |
| **SUB-FREE-LOCK-002** | Reassessment — TESTED | Pro + Premium | Reassessment progress message из спеки |
| **SUB-FREE-LOCK-003** | Book group session — TESTED | Pro + Premium | Group session access message |
| **SUB-FREE-LOCK-004** | Book 1:1 — TESTED | **Premium only** | Credits; two credits for one 30-minute session |

Pop-up объясняет, почему feature locked.

---

### 5.3 Free → upgrade

| ID | Flow | Steps | Expected |
|----|------|-------|----------|
| **SUB-UP-F2P-001** | Upgrade to Pro (monthly) — TESTED | Upgrade → checkout: plan, interval, price, features, amount due, renewal, auto-renew → Continue to Payment → success | Pro immediate; renewal date; «Welcome to Pro!» (или checkout success banner); premium paths / reassessment / group unlocked |
| **SUB-UP-F2P-002** | Upgrade to Pro (yearly) — TESTED | — | Skip пока yearly TBD |
| **SUB-UP-F2PR-001** | Upgrade to Premium — TESTED | Checkout → success | Premium active; **1 credit** после confirmed payment; balance + next credit date + renewal; success message mentions credit |
| **SUB-UP-F2P-003** | Failed payment on upgrade — TESTED | Decline card | Остаётся Free; paid features locked; payment error copy |

**Checkout dialog (Free→Pro):** title «Upgrade to Pro»; message про premium paths, group session, reassessment; Back / Continue to Payment.

**Checkout dialog (Free→Premium):** title «Upgrade to Premium»; message про monthly credit и 2 credits = 1 session.

---

### 5.4 Pro — экран и доступ

| ID | Expected |
|----|----------|
| **SUB-PRO-001** | Pro: Current plan, billing frequency, next renewal, Cancel; Premium: Upgrade; Free: no button — TESTED |
| **SUB-PRO-002** | Premium path, reassessment, group — доступ без upsell — TESTED |
| **SUB-PRO-003** | 1:1 → Premium-only pop-up (SUB-ENTRY-004) — TESTED |

---

### 5.5 Pro → Premium upgrade

| ID | Steps | Expected |
|----|-------|----------|
| **SUB-UP-P2PR-001** | Upgrade → confirm: current plan, new plan, remaining Pro balance, Premium price, amount due, new renewal → Confirm → pay — TESTED | Premium immediate; 1 credit после payment; proration в Stripe invoice; success message |
| **SUB-UP-P2PR-002** | Payment failed — TESTED | Остаётся Pro; Premium locked; **нет** credit; «We couldn't complete your upgrade…» |
| **SUB-UP-P2PR-003** | Duplicate webhook — TESTED | Один credit; один Premium period |

**Dialog:** «Unlock 1:1 sessions… prorate your current Pro subscription»; Keep Pro / Confirm Upgrade.

---

### 5.6 Premium — экран и credit display

| ID | Expected |
|----|----------|
| **SUB-PRM-001** | Current plan, billing, next renewal, Available credits, Cancel; Pro: Downgrade to Pro; Free: no button — TESTED |
| **SUB-PRM-002** | Balance; «Two credits = one 30-minute…»; next credit date; при scheduled cancel/downgrade — expiry date unused credits — TESTED |

Premium users **не** видят upgrade prompts на Premium features.

---

### 5.7 Premium credit system (правила 1–18)

| ID | Rule / scenario | Expected |
|----|-----------------|----------|
| **SUB-CR-001** | Первый credit после activation — TESTED | +1 только после successful first payment |
| **SUB-CR-002** | Renewal credit — TESTED | +1 за billing period; не два за один period |
| **SUB-CR-003** | Failed renewal — TESTED | Новый credit **не** начисляется |
| **SUB-CR-004** | Refund / reversal — TESTED | Нет duplicate credits от reversed payment |
| **SUB-CR-005** | Accumulation — TESTED | Credits копятся при active Premium |
| **SUB-CR-006** | Resume preserves credits — TESTED | Scheduled cancel + resume → тот же balance; accrual continues |
| **SUB-CR-007** | Downgrade effective — TESTED | Все unused credits **lost** при переходе на Pro |
| **SUB-CR-008** | Inactive Premium — TESTED | Credits unusable (не transfer to Pro) |

---

### 5.8 1:1 session booking

| ID | State | Expected |
|----|-------|----------|
| **SUB-BOOK-001** | Premium, ≥2 credits — TESTED | «Book a 1:1 Session»; helper «Two credits will be used after your booking is confirmed»; redirect Wix Bookings |
| **SUB-BOOK-002** | Premium, <2 credits — TESTED | «Not enough credits»; button disabled; helper с текущим count |
| **SUB-BOOK-003** | Booking not completed — TESTED | Credits **не** списаны; hold release (cron ~14d или manual release) |
| **SUB-BOOK-004** | Booking confirmed — TESTED | −2 credits ровно один раз |
| **SUB-BOOK-005** | Duplicate confirm callback — TESTED | Не более одного списания 2 credits |
| **SUB-BOOK-006** | Cancel booking — TESTED | По configured cancellation policy (pending → hold release; confirmed → per product policy) |
| **SUB-BOOK-007** | Inactive Premium, balance > 0 — TESTED | «Your credits are no longer available because your Premium subscription is inactive» |
| **SUB-BOOK-008** | Redirect error — TESTED | Toast booking redirect error; credits not deducted; abort RPC |

| **SUB-BOOK-009** | Pro / Free — TESTED | «Unlock 1:1 Sessions» → Premium upsell pop-up |

---

### 5.9 Founding Member

| ID | Scenario | Expected |
|----|----------|----------|
| **SUB-FM-001** | FM UI — TESTED | Label Founding Member; «Includes Pro access»; $19/mo; start; discount end; standard $29 after; next renewal; Cancel; pricing notice с датой перехода |
| **SUB-FM-002** | No FM → standard Pro switch — TESTED | Нет «downgrade to Pro»; только Cancel / Upgrade Premium |
| **SUB-FM-003** | 101-й user (cap 100) — TESTED | FM недоступен (server cap) |
| **SUB-FM-004** | 12 months → auto Pro $29 — TESTED | После discount end + renewal: billing Pro $29; без FM label |
| **SUB-FM-005** | FM → Premium dialog — TESTED | «Upgrade to Premium?»; proration + **permanent forfeiture** FM price; Keep Founding Member / Continue to Premium |
| **SUB-FM-006** | FM → Premium confirmed — TESTED | Premium immediate; prorated balance; FM price lost forever |
| **SUB-FM-007** | После FM→Premium, downgrade later — TESTED | Standard Pro price; **не** $19 FM |
| **SUB-FM-008** | Cancel FM — TESTED | Dialog «price cannot be restored»; active until date; resume до expiry сохраняет FM price |
| **SUB-FM-009** | FM expired after cancel — TESTED | Free; FM offer не восстанавливается (`billing_expire_subscription` forfeits FM flags + slot) |

FM = Pro feature access (pricing status, not separate entitlement tier).

---

### 5.10 Cancellation (Pro / Premium / FM)

| ID | Tier | Expected |
|----|------|----------|
| **SUB-CAN-PRO-001** | Pro — TESTED | Dialog «Cancel Pro Subscription?»; Keep Pro / Cancel Subscription; auto-renew off; access до [Date]; toast; Cancel → **Resume subscription** |
| **SUB-CAN-PRM-001** | Premium — TESTED | Warning про credits at period end; expiry date unused credits после confirm |
| **SUB-CAN-FM-001** | FM — TESTED | «Founding Member price cannot be restored»; active until [Date] |
| **SUB-CAN-001** | Scheduled cancel UI — TESTED | «Canceled — active until [Date]»; **нет** next renewal; Resume visible |
| **SUB-CAN-002** | Access until date — TESTED | До expiry: paid features + Premium credits (≥2) redeemable |
| **SUB-CAN-ERR-001** | API failure — TESTED | Cancellation error copy; plan остаётся active |

---

### 5.11 Resume subscription

| ID | Scenario | Expected |
|----|----------|----------|
| **SUB-RES-001** | Pro / Premium resume — TESTED | Scheduled cancel, до expiry → Resume → Yes, Resume → Active; renewal restored; Premium credits preserved |
| **SUB-RES-002** | FM resume — TESTED | Copy про сохранение Founding Member price |
| **SUB-RES-003** | After expiry — TESTED | Resume недоступен; Free + upgrade options |
| **SUB-RES-ERR-001** | Resume failure — TESTED | Resume error с датой expiry |

Dialog: «Welcome back! Resuming will restore automatic renewal…»; Premium add-on про accumulated credits; FM add-on про FM price.

---

### 5.12 Premium → Pro downgrade

| ID | Scenario | Expected |
|----|----------|----------|
| **SUB-DG-001** | Schedule downgrade — TESTED | Dialog «Downgrade to Pro?»; credits lost on [Date]; Confirm → scheduled; success message |
| **SUB-DG-002** | Scheduled downgrade UI — TESTED | Premium: active until + downgrade scheduled; credits + expire on; **Keep Premium**; Pro: «Your Pro plan will begin on [Date]» |
| **SUB-DG-003** | Effective date — TESTED | Pro active; 1:1 locked; **все** unused Premium credits lost; Pro charge на renewal |
| **SUB-DG-004** | No immediate refund — TESTED | Нет refund за unused Premium days до downgrade date |
| **SUB-DG-005** | Cancel scheduled downgrade — TESTED | Keep Premium → Yes → downgrade снят; normal renewal; accrual continues |
| **SUB-DG-006** | Mutual exclusion — TESTED | Нельзя одновременно scheduled cancel **и** scheduled downgrade |
| **SUB-DG-ERR-001** | Schedule failure — TESTED | Downgrade error; Premium unchanged |

Downgrade **не** immediate — Premium access и credits до конца текущего period.

---

### 5.13 Subscription expiration

| ID | Trigger | Expected |
|----|---------|----------|
| **SUB-EXP-001** | Pro / FM cancel → period end — TESTED | Free; нет premium paths, reassessment, group; inactive; upgrade buttons |
| **SUB-EXP-002** | Premium cancel → period end — TESTED | Free; 1:1 disabled; credits unusable; accrual stopped; transaction history сохраняется для reporting |
| **SUB-EXP-003** | Downgrade effective (≠ cancel) — TESTED | **Pro** (не Free); без Premium credits |

---

### 5.14 Payment failure / past due

| ID | Scenario | Expected |
|----|----------|----------|
| **SUB-PAY-001** | Failed renewal banner — TESTED | «We couldn't process your latest payment…»; **Update Payment Method** |
| **SUB-PAY-002** | Grace period — TESTED | Monthly: 7 days; Yearly: 14 days — paid access сохраняется; **no new Premium credit** |
| **SUB-PAY-003** | Grace exhausted — TESTED | Inactive; paid access off; credits unusable |
| **SUB-PAY-004** | Recovery — TESTED | Update payment → success → «Your payment method has been updated, and your subscription is active» |

---

### 5.15 Backend entitlements (Feature Access Rules)

Прямой вызов API/RPC **без UI** для каждой фичи:

| Feature | Free | Pro (incl. scheduled cancel до date) | Premium | Expired |
|---------|------|--------------------------------------|---------|---------|
| Premium paths | deny | allow | allow | deny |
| Reassessment | deny | allow | allow | deny |
| Group booking | deny | allow | allow | deny |
| Credit accrual | — | — | on paid period | blocked |
| 1:1 / redeem | deny | deny | allow if ≥2 & active | deny |

| ID | Scenario | Expected |
|----|----------|----------|
| **SUB-BE-001** | Scheduled cancel, `now < periodEnd` — TESTED | API allow paid features |
| **SUB-BE-002** | Scheduled downgrade, до effective date — TESTED | Premium APIs OK |
| **SUB-BE-003** | Stale UI session (expired user) — TESTED | Backend deny despite UI |

SQL proof: `supabase/tests/premium_credits_and_subscription_proof.sql`

---

### 5.16 Loading и duplicate-action prevention

| ID | Scenarios | Expected |
|----|-----------|----------|
| **SUB-LOAD-001** | Double-click: Upgrade, Cancel, Resume, Schedule downgrade, Checkout — TESTED | Button disabled + loading (Upgrading… / Canceling… / etc.); один Stripe session / один lifecycle RPC |
| **SUB-LOAD-002** | Parallel tabs: одновременно Cancel — TESTED | Idempotent или понятная ошибка; один scheduled cancel |

---

### 5.17 Error messages (smoke)

| ID | Trigger | Expected message (ключевая фраза) |
|----|---------|-----------------------------------|
| **SUB-ERR-001** | Generic RPC fail — TESTED | «couldn't update your subscription» |
| **SUB-ERR-002** | Payment fail — TESTED | check your payment method |
| **SUB-ERR-003** | Insufficient credits — TESTED | two credits + current count |
| **SUB-ERR-004** | Booking redirect fail — TESTED | credits have not been deducted |
| **SUB-ERR-005** | Cancellation fail — TESTED | couldn't cancel… still active |
| **SUB-ERR-006** | Resume fail — TESTED | try again before… expires on [Date] |
| **SUB-ERR-007** | Downgrade fail — TESTED | couldn't schedule your downgrade |

---

## 6. Матрица Acceptance Criteria → сценарии

| AC | Scenario IDs |
|----|--------------|
| 1 | SUB-UP-F2P-001, SUB-UP-F2PR-001 |
| 2 | SUB-FREE-LOCK-001…004 |
| 3–5 | SUB-UP-P2PR-001, SUB-UP-F2PR-001 |
| 6–7 | SUB-CR-001…004, SUB-UP-P2PR-003 |
| 8–11 | SUB-DG-001…003 |
| 12–14 | SUB-CAN-PRO-001, SUB-CAN-PRM-001, SUB-CAN-001 |
| 15–17 | SUB-RES-001…002, SUB-CR-006 |
| 18–19 | SUB-EXP-001…002, SUB-BOOK-007 |
| 20–21 | SUB-BOOK-003…004 |
| 22–24 | SUB-FM-003…007 |
| 25 | SUB-UP-P2PR-002, SUB-CR-003, SUB-PAY-002 |
| 26 | SUB-UP-P2PR-001, SUB-DG-001, SUB-FM-005 |
| 27 | SUB-LOAD-001, SUB-BOOK-005 |
| 28 | SUB-BE-001…003 |

Unit tests: `frontend/src/lib/subscription/subscriptionAcceptanceCriteria.test.ts`, `frontend/src/lib/settings/subscriptionEntitlement.test.ts`

---

## 7. Рекомендуемый порядок прогона

### Фаза 1 — Smoke (≈2–3 h)

1. SUB-ENTRY-001, SUB-ENTRY-003  
2. SUB-UP-F2P-001 (Free → Pro)  
3. SUB-CAN-PRO-001 → SUB-RES-001  
4. SUB-EXP-001  

### Фаза 2 — Premium path (≈4–5 h)

1. SUB-UP-F2PR-001, SUB-CR-001, SUB-CR-002  
2. SUB-BOOK-001…004, SUB-BOOK-007  
3. SUB-DG-001…003, SUB-DG-005  

### Фаза 3 — Proration & Founding Member (≈3 h)

1. SUB-UP-P2PR-001, SUB-UP-P2PR-002  
2. SUB-FM-001, SUB-FM-005…009  

### Фаза 4 — Payments & edge cases (≈2 h)

1. SUB-PAY-001…004  
2. SUB-LOAD-001…002, SUB-ERR-001…007  

### Фаза 5 — Backend proof (≈1 h)

1. SUB-BE-001…003  
2. `supabase/tests/premium_credits_and_subscription_proof.sql`

---

## 8. Критерии выхода (Exit criteria)

- Все сценарии фаз 1–3 пройдены без blocker/critical defects  
- Backend entitlements (SUB-BE-*) и SQL proof — green  
- Нет duplicate credits / duplicate booking deductions при replay webhook  
- Product overrides OVR-003, OVR-026–029, OVR-036 учтены в UI copy и flows  
- Yearly billing — documented skip или pass после подтверждения цен  

---

## 9. Связанные артефакты

| Артефакт | Путь |
|----------|------|
| Client spec | `docs/Unclouded _ Individual Subscription Management Flow (1).md` |
| Product overrides | `docs/product-overrides.md` |
| Seed script | `scripts/seed_individual_subscription_test_users.mjs` |
| Stripe price sync | `scripts/sync_stripe_plan_prices.mjs` |
| Migrations | `supabase/migrations/20260727100000_*` … `20260727140000_*` |
| Subscription UI | `frontend/src/components/settings/SettingsSubscriptionTab.tsx` |
| Plan catalog | `frontend/src/lib/subscription/planCatalog.ts` |
