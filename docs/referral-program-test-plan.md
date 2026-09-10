# План тестирования: Referral Program (B2B Referral Partners)

**Спека:** [`docs/referral-program-requirements.md`](./referral-program-requirements.md)  
**Задачи:** [`docs/referral-program-agent-tasks.md`](./referral-program-agent-tasks.md) (REF-00…REF-08)  
**Verification notes:** [`docs/referral-program-ref08-verification.md`](./referral-program-ref08-verification.md)  
**Overrides:** **OVR-058** (B2B partners + organic coexist); OVR-021 organic share cards remain — `docs/product-overrides.md`  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Admin nav / route | `/admin/referral-partners`, `adminNav`, `AdminConsole` |
| Partners list / CRUD | `AdminReferralPartnersTab`, `AddReferralPartnerPopup`, `referralPartnersApi` |
| Partner detail | `AdminReferralPartnerDetail` (profile, stats, referred users) |
| Program dashboard | `AdminReferralDashboard`, `referralPartnerStats` |
| Admin user referral block | `AdminUserDetail` (+ attribution correction) |
| Signup capture | `/signup?ref={CODE}`, `referralAttribution.ts` (`sessionStorage` key `uncloud360.pendingReferralCode`) |
| Schema | `supabase/migrations/20260825200000_referral_partners.sql` (`referralPartner`, profile attribution columns) |
| Unit tests | `referralAttribution.test.ts`, `referralPartnerStats.test.ts` |

## How to run

- Manual / browser: `/test-list docs/referral-program-test-plan.md` или `/test <ID>`
- Actor Admin: Platform Admin / Settings Admin (`is_settings_admin` / `isAdmin`)
- Actor User: новый signup (incognito) + существующие Free / Pro / Premium для subscription lifecycle
- Prefetch: `supabase db push` (или apply) migration `20260825200000_referral_partners.sql`
- Automated smoke (optional): `frontend` vitest — attribution + partner stats suites

---

## 1. Цели и объём

### 1.1 Цели

Проверить полный цикл Referral Program: регистрацию и управление B2B referral partners, уникальные коды/ссылки, attribution при signup, отображение на admin user/partner профилях, program + partner статистику, связку с subscription tier/status, ручную коррекцию attribution, сосуществование с organic user→user referrals (OVR-021 / OVR-058), и data readiness для будущих комиссий (без payout UI).

### 1.2 In scope / Out of scope

| In scope | Out of scope (v1) |
|---|---|
| Admin Referral Partners CRUD + activate/deactivate | Partner self-serve portal / login |
| Unique code + copyable `/signup?ref={CODE}` | Commission rate UI, automated payouts |
| Signup capture + persistent partner attribution | Stripe Connect to partners |
| Manual admin attribution correct/clear | Multi-touch attribution graphs |
| Admin user profile referral block | Public marketing landing pages for partners |
| Partner Referred Users + search/filter | Partner email notifications |
| Referral Dashboard + partner-level stats | Historical rebuild of pre-feature users |
| Subscription-driven stats refresh | Final commission rule definitions |
| Organic coexistence (partner-first, else user code) | Click/impression tracking beyond attributed signups |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-058**, **OVR-021**  
3. Locked decisions в [`docs/referral-program-agent-tasks.md`](./referral-program-agent-tasks.md) REF-00  
4. [`docs/referral-program-requirements.md`](./referral-program-requirements.md)  
5. Bubble / Lovable / migration specs

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| Attribution model | **First valid `ref` in signup session wins**; post-registration `?ref=` never reassigns |
| Code format | `^[A-HJ-NP-Z2-9]{4,16}$`; system-generated on create; admin may set if unique |
| Editable codes after create | Yes, if unique vs other partners **and** vs organic `profiles.referralCode` |
| Inactive partner | No **new** attribution; history kept |
| Invalid / inactive / unknown code | **Soft-fail**: signup proceeds, no partner assigned |
| Storage TTL | `sessionStorage` key `uncloud360.pendingReferralCode` (tab session only; no multi-day cookie) |
| URL shape | `/signup?ref={CODE}` |
| Channel resolution | **Partner-first** (active partner only), else organic user code → `referredByUserId` |
| Paid conversion (stats) | Prefer **ever converted** (`referralFirstPaidAt`) + current tier for ops |
| Commissions | Data hooks only; **no** commission/payout UI |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` (или staging) |
| Admin partners | `/admin/referral-partners` |
| Admin dashboard | Referral Dashboard (same section / linked from partners) |
| Admin user | Admin → Users → user detail |
| Signup | `/signup?ref={CODE}` |
| DB | `referralPartner` + `profiles.referralPartnerId` / `referralPartnerCode` / `referredAt` / `referralFirstPaidAt` / correction audit |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Platform Admin | Admin seed / settings admin | CRUD partners, dashboard, correct attribution |
| Non-admin user | обычный Free/Pro | Negatives: нет доступа к `/admin/referral-partners` |
| New referred user | fresh email, incognito | Signup via partner link |
| Organic referred user | signup via existing user share code | Partner fields null; `referredByUserId` set |
| Organic (no ref) | signup без `?ref=` | No partner, no organic referrer |
| Free → Pro → Premium | referred user + billing test path | Tier segmentation + conversion |
| Second partner | Active partner B | Multi-ref / reassign scenarios |
| Organic referrer user | existing user with `profiles.referralCode` | Coexistence + code collision |

Password для seed QA users: `qwerty123` (если применимо).

### 2.3 Минимальные данные для прогона

1. Migration `referral_partners` применена.  
2. ≥2 **Active** partners (разные types: e.g. coach, influencer) + ≥1 **Inactive**.  
3. ≥1 known organic user share code (для coexistence / collision).  
4. Возможность создать новых users через signup (email confirm / test bypass per env).  
5. Способ сменить subscription tier/status тестового referred user (Admin override, Stripe test, или seed).  
6. Incognito / отдельный browser profile для чистого `sessionStorage`.

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + Admin UI inventory | 15–20 мин | REF-ACCESS-*, REF-UI-* |
| 1 | Partner CRUD + codes/links | 30–45 мин | REF-PART-*, REF-CODE-* |
| 2 | Signup attribution + session rules | 45–60 мин | REF-ATTR-*, REF-ORG-* |
| 3 | Admin user profile + manual correct | 20–30 мин | REF-USER-* |
| 4 | Partner referred users + filters | 25–40 мин | REF-LIST-* |
| 5 | Partner + program stats / dashboard | 30–45 мин | REF-STAT-*, REF-DASH-* |
| 6 | Subscription lifecycle linkage | 45–60 мин | REF-SUB-* |
| 7 | Persistence / compensation readiness | 15–25 мин | REF-HIST-*, REF-COMP-* |
| 8 | Business rules smoke pack | 20–30 мин | REF-RULE-*, REF-E2E-* |

**Полный ручной прогон:** ~4–6 часов.  
**Smoke (критичный путь):** REF-ACCESS-002, REF-PART-001, REF-CODE-001, REF-ATTR-001, REF-SUB-002, REF-ATTR-005, REF-USER-003, REF-E2E-001.

---

## 4. Access & UI inventory

### REF-ACCESS-001 — Non-admin не видит Referral Partners — TESTED

| | |
|---|---|
| **Preconditions** | Non-admin logged in |
| **Steps** | Открыть `/admin/referral-partners` (и связанные admin tabs) |
| **Expected** | Доступ запрещён (guard / redirect). Partner mutate API / RLS отклонены. |

### REF-ACCESS-002 — Admin открывает Referral Partners — TESTED

| | |
|---|---|
| **Preconditions** | Platform Admin |
| **Steps** | `/admin` → Referral Partners (nav / URL) |
| **Expected** | Раздел открывается: list partners, create, link на dashboard/detail. |

### REF-UI-001 — Partner list inventory — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 partner exists |
| **Steps** | Открыть partners list |
| **Expected** | Видны name, type, status, code/link (или entry to detail), date added; есть create / filters active-inactive если реализованы. |

### REF-UI-002 — Dashboard entry — TESTED

| | |
|---|---|
| **Preconditions** | Admin |
| **Steps** | Открыть Referral Dashboard (nav или link из partners) |
| **Expected** | Program-level metrics загружаются без выбора конкретного partner. |

---

## 5. Admin — Referral Partner Management (§5)

### REF-PART-001 — Create partner (happy path) — TESTED

| | |
|---|---|
| **Preconditions** | Admin; уникальный email/code |
| **Steps** | Create partner: name, type (coach/therapist/influencer/other), email, optional contact, status Active. Save. |
| **Expected** | Partner в списке Active; поля сохранены; `createdAt` / date added заполнены; auto-generated unique `referralCode` + tracking link `/signup?ref={CODE}`. |

### REF-PART-002 — Create with custom code — TESTED

| | |
|---|---|
| **Preconditions** | Admin; code в формате `^[A-HJ-NP-Z2-9]{4,16}$`, уникальный |
| **Steps** | Create partner с явно заданным code |
| **Expected** | Partner создан с этим code; link соответствует code. |

### REF-PART-003 — Edit partner metadata — TESTED

| | |
|---|---|
| **Preconditions** | Partner с ≥1 attributed user |
| **Steps** | Изменить name, type, email, contact. Save. Открыть attributed user profile. |
| **Expected** | Detail/list отражают новые metadata. User attribution (`referralPartnerId`, code snapshot, `referredAt`) **не** переписывается из-за rename. |

### REF-PART-004 — Deactivate partner — TESTED

| | |
|---|---|
| **Preconditions** | Active partner с attributed users |
| **Steps** | Deactivate → Inactive. Открыть partner detail + referred users. |
| **Expected** | Status Inactive. Исторические attributions остаются. Partner stats/list не обнуляются. |

### REF-PART-005 — Reactivate partner — TESTED

| | |
|---|---|
| **Preconditions** | Inactive partner |
| **Steps** | Activate снова. Новый signup с этим code. |
| **Expected** | Новые attributions снова разрешены (Active). Старые users на месте. |

### REF-PART-006 — Validation (required / format) — TESTED

| | |
|---|---|
| **Preconditions** | Admin на create/edit |
| **Steps** | (a) пустое name; (b) invalid email; (c) code вне regex / слишком короткий; (d) пустой type |
| **Expected** | Save blocked; clear errors; запись не создаётся / не портится. |

### REF-PART-007 — Partner types — TESTED

| | |
|---|---|
| **Preconditions** | Admin |
| **Steps** | Создать партнёров с типами coach, therapist, influencer, other (или controlled list) |
| **Expected** | Типы сохраняются и отображаются в list/detail. |

---

## 6. Referral codes & tracking links (§6)

### REF-CODE-001 — Auto-generated unique code + URL — TESTED

| | |
|---|---|
| **Preconditions** | Admin |
| **Steps** | Create partner без custom code. Открыть detail. |
| **Expected** | Уникальный code; tracking URL вида `{origin}/signup?ref={CODE}`; code соответствует DB unique constraint. |

### REF-CODE-002 — Copy referral link — TESTED

| | |
|---|---|
| **Preconditions** | Partner detail открыт |
| **Steps** | Copy link control → paste в notepad / new tab |
| **Expected** | Clipboard содержит полный signup URL с `ref`; открытие URL ведёт на signup с тем же code. |

### REF-CODE-003 — Duplicate code rejected (create) — TESTED

| | |
|---|---|
| **Preconditions** | Partner A с code `TESTCODE1` |
| **Steps** | Create partner B с тем же code |
| **Expected** | Ошибка (UI + API/DB); partner B не создаётся. |

### REF-CODE-004 — Duplicate code rejected (edit) — TESTED

| | |
|---|---|
| **Preconditions** | Partners A и B с разными codes |
| **Steps** | Edit B → code = code A. Save. |
| **Expected** | Reject; code B не меняется. |

### REF-CODE-005 — Collision with organic user `referralCode` — TESTED

| | |
|---|---|
| **Preconditions** | User с `profiles.referralCode = ORGUSER1` (или известный seed code) |
| **Steps** | Create/edit partner с code `ORGUSER1` |
| **Expected** | Reject (partner codes must not collide with user share codes). |

### REF-CODE-006 — One code → one partner (BR-01/02) — TESTED

| | |
|---|---|
| **Preconditions** | ≥2 partners |
| **Steps** | Проверить uniqueness в list + попытка duplicate |
| **Expected** | Каждый code принадлежит ровно одному partner; DB unique enforced. |

---

## 7. Signup attribution (§7–8, OVR-058)

### REF-ATTR-001 — Happy path: link → signup → partner attribution — TESTED

| | |
|---|---|
| **Preconditions** | Active partner code `PCODE1`; fresh email; incognito |
| **Steps** | Open `/signup?ref=PCODE1` → complete registration |
| **Expected** | Profile: `referralPartnerId` = partner, `referralPartnerCode` = `PCODE1`, `referredAt` set. User appears on partner Referred Users (typically Free). |

### REF-ATTR-002 — Session retention across signup navigation — TESTED

| | |
|---|---|
| **Preconditions** | Active partner; multi-step or multi-page signup UI |
| **Steps** | Open `?ref=`; navigate away within same tab to another signup step / back; complete signup **without** clearing tab session |
| **Expected** | `sessionStorage` retains pending code; attribution still applied on success. |

### REF-ATTR-003 — First-touch wins (two refs before signup) — TESTED

| | |
|---|---|
| **Preconditions** | Active partners A and B; incognito |
| **Steps** | Visit `/signup?ref=A` then `/signup?ref=B` in **same** tab; complete signup |
| **Expected** | User attributed to **A** (first valid ref). Not B. |

### REF-ATTR-004 — Organic signup (no ref) — TESTED

| | |
|---|---|
| **Preconditions** | Fresh email; URL without `ref` |
| **Steps** | Complete signup |
| **Expected** | No partner (`referralPartnerId` null). No invented partner. |

### REF-ATTR-005 — Post-registration `?ref=` does not reassign — TESTED

| | |
|---|---|
| **Preconditions** | User already attributed to partner A (or organic-only) |
| **Steps** | While logged in (or after signup), open `/signup?ref=B` or marketing URL with other code |
| **Expected** | Attribution **unchanged**. No auto-reassign. |

### REF-ATTR-006 — Invalid / unknown code → soft-fail — TESTED

| | |
|---|---|
| **Preconditions** | Fresh email |
| **Steps** | `/signup?ref=NOTAREALCODE` → complete signup |
| **Expected** | Signup succeeds; no partner assigned. |

### REF-ATTR-007 — Inactive partner code → no new attribution — TESTED

| | |
|---|---|
| **Preconditions** | Partner Inactive with code `OLDCODE`; history users exist |
| **Steps** | New user `/signup?ref=OLDCODE` → register |
| **Expected** | Soft-fail: no new partner attribution. Existing referred users still listed under partner. |

### REF-ATTR-008 — Abandoned signup → no DB attribution — TESTED

| | |
|---|---|
| **Preconditions** | Active partner |
| **Steps** | Open `?ref=` → fill partial form → close tab / abandon |
| **Expected** | No profile row attributed. Closing tab clears `sessionStorage` pending code. |

### REF-ATTR-009 — New tab does not inherit pending code — TESTED

| | |
|---|---|
| **Preconditions** | Tab 1 visited `?ref=A` |
| **Steps** | Open **new** tab → `/signup` without ref → register |
| **Expected** | No partner (sessionStorage is per-tab). |

---

## 8. Organic coexistence (OVR-058 / OVR-021)

### REF-ORG-001 — Partner-first when code matches active partner — TESTED

| | |
|---|---|
| **Preconditions** | Active partner code that does **not** collide with user codes |
| **Steps** | Signup via partner link |
| **Expected** | Partner fields set; `referredByUserId` **not** set via partner path. |

### REF-ORG-002 — Organic user share code still works — TESTED

| | |
|---|---|
| **Preconditions** | Existing user share code `USERCODE`; no active partner with that code |
| **Steps** | `/signup?ref=USERCODE` → register |
| **Expected** | `referredByUserId` (+ organic code snapshot) set; **partner** fields null. Analytics / organic referral counts still work. |

### REF-ORG-003 — Prefer partner when both channels could match — TESTED

| | |
|---|---|
| **Preconditions** | Only reachable if product allows same string in both namespaces — normally blocked by collision. If collision prevented, mark N/A. |
| **Steps** | Per OVR-058 resolution order |
| **Expected** | Active partner wins when partner lookup succeeds; else organic. Document actual result. |

---

## 9. Admin user profile — referral info (§9)

### REF-USER-001 — Attributed user shows referral block — TESTED

| | |
|---|---|
| **Preconditions** | User attributed to partner |
| **Steps** | Admin → Users → open user detail |
| **Expected** | Shows: Referred by (partner name + link), code used, referral date, current tier, subscription status, conversion info if available (`referralFirstPaidAt` / paid date). |

### REF-USER-002 — Organic / unreferred empty state — TESTED

| | |
|---|---|
| **Preconditions** | User without partner |
| **Steps** | Open admin user detail |
| **Expected** | Empty / “Not referred” (partner). Organic referrer may still show separately if product surfaces it — partner block empty. |

### REF-USER-003 — Manual reassign partner — TESTED

| | |
|---|---|
| **Preconditions** | User on partner A; partner B exists |
| **Steps** | Admin corrects attribution A → B. Save. Check partner A/B lists + stats + user block. |
| **Expected** | User moves to B. A list no longer includes user. Stats update. Audit fields set when available (`referralCorrectedBy` / `referralCorrectedAt`). |

### REF-USER-004 — Manual clear partner — TESTED

| | |
|---|---|
| **Preconditions** | Attributed user |
| **Steps** | Admin clears partner attribution |
| **Expected** | Partner fields cleared (or explicitly null). User removed from partner Referred Users. Organic fields untouched unless intentionally cleared. |

### REF-USER-005 — Subscription change does not clear attribution — TESTED

| | |
|---|---|
| **Preconditions** | Referred Free user |
| **Steps** | Upgrade / cancel subscription via normal billing path |
| **Expected** | Referral block still shows same partner/code/`referredAt`. Only live subscription fields change. |

---

## 10. Partner profile — Referred Users (§10)

### REF-LIST-001 — List only this partner’s users — TESTED

| | |
|---|---|
| **Preconditions** | Partner A with users; Partner B with different users |
| **Steps** | Open A → Referred Users |
| **Expected** | Only A’s users. Columns at minimum: name, email, registration date, referral date, tier, status, conversion date (if any), cancellation date (if platform supports). |

### REF-LIST-002 — Row opens admin user profile — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 referred user |
| **Steps** | Click row / user link |
| **Expected** | Navigates to admin user detail for that user. |

### REF-LIST-003 — Search by name/email — TESTED

| | |
|---|---|
| **Preconditions** | ≥3 referred users with distinct names/emails |
| **Steps** | Search substring matching one user |
| **Expected** | List filters to matching rows only. |

### REF-LIST-004 — Filter by subscription tier — TESTED

| | |
|---|---|
| **Preconditions** | Referred users on Free and Pro (and Premium if available) |
| **Steps** | Filter Free / Pro / Premium |
| **Expected** | Rows match current tier. |

### REF-LIST-005 — Filter by subscription status — TESTED

| | |
|---|---|
| **Preconditions** | Mix of Active and Canceled (and Trial/Past due/Expired if platform has them) |
| **Steps** | Apply status filters |
| **Expected** | Rows match current status; unsupported statuses documented as N/A. |

---

## 11. Partner-level statistics (§12)

### REF-STAT-001 — Partner summary metrics present — TESTED

| | |
|---|---|
| **Preconditions** | Partner with known mix of Free/Pro/Premium / canceled |
| **Steps** | Open partner detail performance summary |
| **Expected** | Total referred; Free; Pro; Premium; Active; Canceled/non-active; Paid conversions; Conversion rate (formula tooltip if present). Counts match list + subscription truth. |

### REF-STAT-002 — Free → Pro updates counts — TESTED

| | |
|---|---|
| **Preconditions** | Referred Free user on partner |
| **Steps** | Upgrade user to Pro. Refresh partner stats. |
| **Expected** | Free −1, Pro +1; paid conversions / rate update; user remains on referred list; attribution unchanged. |

### REF-STAT-003 — Cancel updates status, not attribution — FAIL (cancel-at-period-end)

| | |
|---|---|
| **Preconditions** | Referred paid Active user |
| **Steps** | Cancel subscription. Refresh stats/list. |
| **Expected (original AC)** | Active ↓ / Canceled ↑. User still on Referred Users. Partner/code unchanged. |
| **Actual (2026-08-26)** | User `ref-attr-003-a@test.com` after Cancel Subscription: attribution unchanged (**PASS** — CUSTCDE2 / partner / referredAt); still on Referred Users (**PASS**). Metrics: Active 4, Canceled 0; row status still `active`; filter Canceled → empty «No referred users match» (**FAIL**). Admin user: `pro` / `scheduledToCancel`. |
| **Analysis** | Consistent with **OVR-029** (paid access until period end) and partner stats `isPaidReferralProfile` / `resolveSubscriptionStatus` (paid entitlement ⇒ Active). Stats do **not** map cancel-at-period-end → Canceled/non-active. Canceled ↑ only after entitlement actually drops (period end / inactive Free), not on Cancel click. Same gap likely on **REF-SUB-004**. |

### REF-STAT-004 — Conversion rate formula — TESTED

| | |
|---|---|
| **Preconditions** | Known N referred, K ever-paid |
| **Steps** | Compare UI conversion rate to `K / N` (or documented formula) |
| **Expected** | Matches documented definition (prefer ever-converted via `referralFirstPaidAt`). |

---

## 12. Referral Dashboard (§11)

### REF-DASH-001 — Program volume metrics — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 partner, ≥1 referred user |
| **Steps** | Open Referral Dashboard |
| **Expected** | Total partners (optionally active/inactive split); total referred users; total referrals generated (= attributed signups in v1); metrics without partner id filter. |

### REF-DASH-002 — New referrals period filter — TESTED

| | |
|---|---|
| **Preconditions** | Attributions on different dates (or create one “today”) |
| **Steps** | Select period that includes / excludes known referrals |
| **Expected** | “New referrals” updates to match attributions/registrations in range. |

### REF-DASH-003 — Tier segmentation — TESTED

| | |
|---|---|
| **Preconditions** | Referred Free + paid users |
| **Steps** | View Free / Pro / Premium segments |
| **Expected** | Clear distinction referred-but-Free vs converted-to-paid; counts match underlying data. |

### REF-DASH-004 — Status segmentation — TESTED

| | |
|---|---|
| **Preconditions** | Mix of statuses among referred users |
| **Steps** | View Active / Canceled / Trial / Past due / Expired (as supported) |
| **Expected** | Breakdown matches platform subscription statuses. |

### REF-DASH-005 — Dashboard vs partner detail consistency — TESTED

| | |
|---|---|
| **Preconditions** | Small dataset (2–3 partners) |
| **Steps** | Sum partner totals vs program dashboard totals |
| **Expected** | Aggregates reconcile (same subscription source of truth). |

---

## 13. Subscription status tracking (§13)

### REF-SUB-001 — Register → counted as referral (Free) — TESTED

| | |
|---|---|
| **Preconditions** | Active partner |
| **Steps** | New referred signup |
| **Expected** | Appears in volume + Free segment; partner total +1. |

### REF-SUB-002 — Upgrade Free → Pro — TESTED

| | |
|---|---|
| **Preconditions** | Referred Free |
| **Steps** | Upgrade to Pro |
| **Expected** | Moves to Pro; paid conversion counted; `referralFirstPaidAt` stamped once; attribution intact. |

### REF-SUB-003 — Upgrade Pro → Premium — TESTED

| | |
|---|---|
| **Preconditions** | Referred Pro |
| **Steps** | Upgrade to Premium |
| **Expected** | Premium segment; attribution intact; first-paid timestamp not wiped. |

### REF-SUB-004 — Cancel → Canceled / Non-active — TESTED

| | |
|---|---|
| **Preconditions** | Referred paid Active |
| **Steps** | Cancel |
| **Expected** | Still attributed. **Note (OVR-029 / REF-STAT-003):** cancel-at-period-end keeps Pro + partner Active until period ends; Canceled/non-active only after entitlement drops. Do not expect Active ↓ on Cancel click alone. |

### REF-SUB-005 — Reactivate after cancel — TESTED

| | |
|---|---|
| **Preconditions** | Referred canceled paid user |
| **Steps** | Resubscribe / reactivate |
| **Expected** | Status returns to Active (or current truth); attribution unchanged; ever-converted still true. |

### REF-SUB-006 — BR-04 invariant (no overwrite on sub changes) — TESTED

| | |
|---|---|
| **Preconditions** | Attributed user |
| **Steps** | Cycle Free → Pro → cancel → resubscribe; inspect DB/UI attribution fields |
| **Expected** | `referralPartnerId` / `referralPartnerCode` / `referredAt` never cleared by subscription pipeline. |

---

## 14. History, persistence & compensation readiness (§14–15)

### REF-HIST-001 — Minimum retained fields visible/queryable — TESTED

| | |
|---|---|
| **Preconditions** | Attributed converted user |
| **Steps** | Inspect admin UI + DB columns |
| **Expected** | Partner, code, source/link (or derived), registration date, attribution date, current status, conversion signal (`referralFirstPaidAt`). |

### REF-HIST-002 — Deactivate partner does not cascade-delete attributions — TESTED

| | |
|---|---|
| **Preconditions** | Partner with users |
| **Steps** | Deactivate partner; query referred users |
| **Expected** | Users remain attributed; history available for reporting. |

### REF-HIST-003 — Rename partner keeps stable id — TESTED

| | |
|---|---|
| **Preconditions** | Partner with attributions |
| **Steps** | Rename partner |
| **Expected** | Same partner `id`; FK attributions still resolve; display name updates. |

### REF-COMP-001 — Compensation data hooks (no payout UI) — TESTED

| | |
|---|---|
| **Preconditions** | Schema applied |
| **Steps** | Verify presence of immutable attribution + `referralFirstPaidAt` + stable partner id; confirm **no** commission/payout/Connect-to-partner UI |
| **Expected** | Data sufficient to answer: who referred whom; who converted; to which tier (current + first paid); when; active vs canceled. No payout feature shipped. |

---

## 15. Business rules smoke pack (§17)

### REF-RULE-001 — BR-01 / BR-02 unique code — TESTED

| | |
|---|---|
| **Steps** | Duplicate code attempts (create + edit) |
| **Expected** | Always rejected. |

### REF-RULE-002 — BR-03 attribution stored after registration — TESTED

| | |
|---|---|
| **Steps** | REF-ATTR-001 |
| **Expected** | Persistent partner link on profile. |

### REF-RULE-003 — BR-04 subscription must not remove attribution — TESTED

| | |
|---|---|
| **Steps** | REF-SUB-006 |
| **Expected** | Attribution intact. |

### REF-RULE-004 — BR-05 no ref → no partner — TESTED

| | |
|---|---|
| **Steps** | REF-ATTR-004 |
| **Expected** | Null partner. |

### REF-RULE-005 — BR-06 stats auto-update from subscription truth — TESTED

| | |
|---|---|
| **Steps** | REF-STAT-002 / REF-SUB-002 without manual “recalculate” (beyond refresh) |
| **Expected** | Counts follow live/current subscription data. |

### REF-RULE-006 — BR-07 admin can correct attribution — TESTED

| | |
|---|---|
| **Steps** | REF-USER-003 / REF-USER-004 |
| **Expected** | Reassign/clear works; lists/stats update. |

### REF-RULE-007 — BR-08 / BR-09 historical + future commissions — TESTED

| | |
|---|---|
| **Steps** | REF-HIST-* + REF-COMP-001 |
| **Expected** | History retained; commission-ready fields without redesign. |

---

## 16. End-to-end acceptance (§20 / REF-08)

### REF-E2E-001 — Full lifecycle path — FAIL (step 4 / cancel status)

| | |
|---|---|
| **Preconditions** | Clean Active partner; billing test path available |
| **Steps** | 1) Admin creates Active partner → unique code + copyable link<br>2) New user opens link → signup → appears on Referred Users as Free<br>3) Upgrade Free → Pro → stats move; attribution unchanged; `referralFirstPaidAt` set<br>4) Cancel → Canceled; still listed<br>5) Second `?ref=` after registration does not reassign<br>6) Admin reassigns to another partner → lists/stats update<br>7) Separate organic signup via user share code → `referredByUserId` only<br>8) Deactivated partner: history kept; new signup with that code does not partner-attribute |
| **Expected** | All steps pass. Matches REF-08 checklist in `referral-program-ref08-verification.md`. |
| **Actual (2026-08-26)** | Steps 1–3, 5–8 covered PASS via PART/SUB/ATTR/USER/ORG/HIST (this + prior sessions). **Step 4 FAIL:** cancel → `scheduledToCancel`, still listed + attributed, but partner/dashboard status stays Active (paid) until entitlement ends — same as **REF-STAT-003**. |

### REF-E2E-002 — Negative pack — TESTED

| | |
|---|---|
| **Steps** | Non-admin access; duplicate code; invalid code soft-fail; inactive code soft-fail; no-ref signup |
| **Expected** | All negatives behave per locked decisions; no data corruption. |

---

## 17. Automated / regression (optional)

| Suite | Path | Covers |
|---|---|---|
| First-touch sessionStorage | `frontend/src/lib/share/referralAttribution.test.ts` | REF-ATTR-003 style |
| Partner stats aggregation + filters | `frontend/src/lib/settings/admin/referralPartnerStats.test.ts` | REF-STAT / REF-LIST filters |
| Admin nav route | `adminSpecialistAvailabilityApi.test.ts` (or nav tests) | `/admin/referral-partners` resolution |

Run from `frontend` with project vitest config after relevant changes.

---

## 18. Traceability

| Requirements § | Test IDs |
|---|---|
| §5 Partner management | REF-PART-*, REF-ACCESS-*, REF-UI-001 |
| §6 Codes & links | REF-CODE-* |
| §7–8 Attribution | REF-ATTR-*, REF-ORG-* |
| §9 User profile | REF-USER-* |
| §10 Referred users | REF-LIST-* |
| §11 Dashboard | REF-DASH-* |
| §12 Partner stats | REF-STAT-* |
| §13 Subscription tracking | REF-SUB-* |
| §14 History | REF-HIST-* |
| §15 Compensation readiness | REF-COMP-* |
| §16 Admin controls | Covered across PART/CODE/USER/LIST/DASH |
| §17 Business rules | REF-RULE-* |
| §19–20 Outcome / E2E | REF-E2E-* |
| OVR-058 / OVR-021 | REF-ORG-*, REF-ATTR-007, REF-CODE-005 |

---

## 19. Pass / fail log (fill during run)

| ID | Result | Tester | Date | Notes |
|---|---|---|---|---|
| REF-ACCESS-001 | | | | |
| REF-ACCESS-002 | | | | |
| REF-UI-001 | | | | |
| REF-UI-002 | | | | |
| REF-PART-001 | | | | |
| REF-PART-002 | | | | |
| REF-PART-003 | | | | |
| REF-PART-004 | | | | |
| REF-PART-005 | | | | |
| REF-PART-006 | | | | |
| REF-PART-007 | | | | |
| REF-CODE-001 | | | | |
| REF-CODE-002 | | | | |
| REF-CODE-003 | | | | |
| REF-CODE-004 | | | | |
| REF-CODE-005 | | | | |
| REF-CODE-006 | | | | |
| REF-ATTR-001 | | | | |
| REF-ATTR-002 | | | | |
| REF-ATTR-003 | | | | |
| REF-ATTR-004 | | | | |
| REF-ATTR-005 | | | | |
| REF-ATTR-006 | | | | |
| REF-ATTR-007 | | | | |
| REF-ATTR-008 | | | | |
| REF-ATTR-009 | | | | |
| REF-ORG-001 | | | | |
| REF-ORG-002 | | | | |
| REF-ORG-003 | | | | |
| REF-USER-001 | | | | |
| REF-USER-002 | | | | |
| REF-USER-003 | | | | |
| REF-USER-004 | | | | |
| REF-USER-005 | | | | |
| REF-LIST-001 | | | | |
| REF-LIST-002 | | | | |
| REF-LIST-003 | | | | |
| REF-LIST-004 | | | | |
| REF-LIST-005 | | | | |
| REF-STAT-001 | | | | |
| REF-STAT-002 | | | | |
| REF-STAT-003 | FAIL | | 2026-08-26 | Cancel-at-period-end: attribution OK; Active/Canceled metrics unchanged (still paid/`scheduledToCancel`, OVR-029). |
| REF-STAT-004 | | | | |
| REF-DASH-001 | | | | |
| REF-DASH-002 | | | | |
| REF-DASH-003 | | | | |
| REF-DASH-004 | | | | |
| REF-DASH-005 | | | | |
| REF-SUB-001 | | | | |
| REF-SUB-002 | | | | |
| REF-SUB-003 | | | | |
| REF-SUB-004 | | | | |
| REF-SUB-005 | | | | |
| REF-SUB-006 | | | | |
| REF-HIST-001 | | | | |
| REF-HIST-002 | | | | |
| REF-HIST-003 | | | | |
| REF-COMP-001 | | | | |
| REF-RULE-001 | | | | |
| REF-RULE-002 | | | | |
| REF-RULE-003 | | | | |
| REF-RULE-004 | | | | |
| REF-RULE-005 | | | | |
| REF-RULE-006 | | | | |
| REF-RULE-007 | | | | |
| REF-E2E-001 | | | | |
| REF-E2E-002 | | | | |

**Smoke subset:** REF-ACCESS-002, REF-PART-001, REF-CODE-001, REF-ATTR-001, REF-SUB-002, REF-ATTR-005, REF-USER-003, REF-E2E-001.
