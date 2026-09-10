# План тестирования: Enterprise Admin Controls (Part A + Part B + Part C)

**Спека:** [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) — **Part A (§§1–11)**, **Part B (§§12–22)**, **Part C (§§23–32)**  
**Overrides (Part A):** OVR-022, OVR-048, OVR-053, OVR-054, OVR-055 (`docs/product-overrides.md`)  
**Overrides (Part B):** OVR-022, OVR-023, OVR-024, OVR-038, OVR-055  
**Overrides (Part C):** OVR-022, OVR-038, OVR-051, OVR-054, OVR-055, OVR-056  
**Related:** US-205 / US-206 / US-207 / US-208 / US-505, `docs/Admin Account Set-Up.md`  
**Код Part A (ориентиры):**

| Область | UI / API |
|---|---|
| Organizations list / create | `/admin/organizations`, `AdminWorkplacesTab`, `AddWorkplacePopup` |
| Org detail / edit / members | `/admin/organizations/:id`, `AdminOrganizationDetail`, `WorkplaceMembersPanel` |
| Enrollment codes + join URL | `WorkplaceEnrollmentCodesPanel`, `/join/{code}`, `JoinWorkplacePage` |
| Usage report (US-208) | `/admin/organizations/usage`, `AdminOrganizationUsageReport` |
| User detail from roster | `/admin/users/:id`, `AdminUserDetail` / `AdminUsersTable` |
| Edge / helpers | `peek-workplace-enrollment`, `redeem-workplace-enrollment`, `employer-enrollment-codes`, `admin-users`, `workplaceEnrollmentHelpers`, `workplaceSeatLimits` |

## How to run

- Manual / browser: `/test-list docs/enterprise-admin-controls-test-plan.md` или `/test <ID>`
- Actor: Platform Admin (`isAdmin`) — все мутации только из Admin console
- Employee checks: отдельный браузер / инкогнито (logged-out join + enterprise employee login)

## 1. Цели и объём

### 1.1 Цели

Проверить, что Platform Admin может создавать/настраивать enterprise organizations, seats, enrollment codes/URLs, billing metadata и overrides; что enrollment gating и employee visibility соответствуют Part A; что enterprise employees не биллятся индивидуально.

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Admin CRUD orgs (`/admin/organizations*`) | Part B Employer portal UX (кроме отражения Admin overrides) |
| Billing models flat_rate / pay_per_active, payment terms, price/notes/status | Stripe org Customer/Invoice/Subscription (phase 2 — metadata-only smoke) |
| Enrollment codes 6–8, multi-code, deactivate, `/join/{code}` | Full Part C paywall matrix (только smoke «no Stripe sub») |
| Seat / date / active overrides; member add/revoke/roles | Org commercial invoicing productization beyond Admin metadata |
| Org roster → Admin user detail clinical visibility | HR privacy guardrails (Part B) |
| Monthly active-users report + CSV (US-208) | Non-enterprise individual billing UX |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — OVR-054 (Part A controls), OVR-055 (HR portal-only), OVR-048/053/022  
3. [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) Part A  
4. Admin Account Set-Up / Bubble / Lovable

### 1.4 Locked decisions (§8) — проверять как норму

| Тема | Expected |
|---|---|
| Pay-per-active cap | Soft target + optional hard `maxSeats`; target alone never blocks; warn when enrolled &gt; target |
| Contract end | Blocks **new** enrollments only; existing members keep access until revoke/deactivate |
| Tier change | Immediate entitlement flip for members |
| Stripe org billing | Manual fully usable; Stripe = metadata label/notes only |
| Join URL | One URL per enrollment code: `/join/{code}` |
| Contact field | UI label **HR contact email** (OVR-053) |
| Half-yearly | Kept as payment term |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Admin entry | `/admin` → **Organizations** (`/admin/organizations`) |
| Usage report | `/admin/organizations/usage` |
| Join | `/join/{code}` |
| Edge | `peek-workplace-enrollment`, `redeem-workplace-enrollment`, `employer-enrollment-codes`, `admin-users` |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Platform Admin | Admin seed / `isAdmin` user | Весь Part A CRUD |
| Existing profile (HR contact) | Email уже в `profiles` | OVR-055 portal access без clinical enroll |
| Fresh emails | `eac-emp-{n}@test.com` | Enrollment / seat cap |
| Non-admin user | `sub-pro@test.com` | Negative: нет доступа к Admin org mutations |

Password для seed QA users: `qwerty123` (если применимо).

### 2.3 Минимальные данные для прогона

1. **Flat-rate org** — 3–5 seats (для cap без массового enroll), Pro, annual, manual, future end date.  
2. **Pay-per-active org** — target seats + optional `maxSeats`, Premium.  
3. Несколько enrollment codes (active + deactivated).  
4. ≥1 enrolled employee с activity events в выбранном UTC month (chat / path / journal / assessment / check-in).

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + UI inventory | 20–30 мин | EAC-A-ACCESS-*, EAC-A-UI-* |
| 1 | Create org + validation + HR contact (OVR-055) | 30–45 мин | EAC-A-ORG-* |
| 2 | Codes + join URL | 45–60 мин | EAC-A-CODE-*, EAC-A-JOIN-* |
| 3 | Flat-rate seats + overrides | 45–60 мин | EAC-A-FLAT-*, EAC-A-OVR-* |
| 4 | Pay-per-active + usage report | 45–60 мин | EAC-A-PPA-*, EAC-A-RPT-* |
| 5 | Tier / members / visibility | 30–45 мин | EAC-A-TIER-*, EAC-A-MEM-*, EAC-A-VIS-* |
| 6 | Billing must-not + smoke pack §11 | 20–30 мин | EAC-A-BILL-*, EAC-A-PACK-* |

---

## 4. Access & UI inventory

### EAC-A-ACCESS-001 — Только Platform Admin — TESTED

| | |
|---|---|
| **Preconditions** | Non-admin logged in |
| **Steps** | Открыть `/admin/organizations`, `/admin/organizations/usage` |
| **Expected** | Доступ запрещён (redirect / guard). Org create/edit API отклонён для non-admin. |

### EAC-A-ACCESS-002 — Admin Organizations area (OVR-048) — TESTED

| | |
|---|---|
| **Preconditions** | Platform Admin |
| **Steps** | `/admin` → sidebar Organizations; открыть list, Add organization, detail, usage |
| **Expected** | Все экраны из §7 доступны: list, add/edit, detail (billing/seats/codes/members), usage report, deep link to user detail. |

### EAC-A-UI-001 — List columns — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 org |
| **Steps** | Открыть `/admin/organizations` |
| **Expected** | Колонки включают name, tier, billing model, seats utilization (`active/seat` или model-appropriate), end date, active, payment term. |

---

## 5. Organization create / edit (§3)

### EAC-A-ORG-001 — Happy path create (required fields) — TESTED

| | |
|---|---|
| **Preconditions** | Admin; уникальный org name; валидный HR contact email |
| **Steps** | Add organization: name, HR contact email, tier Pro/Premium, billing model, seats ≥1, payment term, start/end dates, Active=true. Optional: price, notes, payment method. Save. |
| **Expected** | Org в списке. Нет Stripe charge за seats. Auto-mint enrollment code (или явный Generate) — mint failure surfaced, Admin на detail для Generate/Assign (OVR-054). |

### EAC-A-ORG-002 — Validation blockers — TESTED

| | |
|---|---|
| **Preconditions** | Admin на форме create/edit |
| **Steps** | (a) пустое name; (b) invalid email; (c) end &lt; start; (d) seats &lt; 1 / empty required enums |
| **Expected** | Save blocked; clear field errors. Org не создаётся. |

### EAC-A-ORG-003 — Soft name uniqueness — TESTED

| | |
|---|---|
| **Preconditions** | Org с именем `Acme QA` уже есть |
| **Steps** | Создать вторую org с тем же display name |
| **Expected** | Создание допускается с warning toast (OVR-054); обе видны в list. |

### EAC-A-ORG-004 — HR contact = existing profile (OVR-055) — TESTED

| | |
|---|---|
| **Preconditions** | Email контакта = существующий profile |
| **Steps** | Create/edit org с этим contact email. Sign in как этот user. |
| **Expected** | Portal access (`/employer`) без clinical auto-enroll; seat не списан. Clinical enroll только через members panel / invite. |

### EAC-A-ORG-005 — Edit all config fields (§3.5) — TESTED

| | |
|---|---|
| **Preconditions** | Существующая org |
| **Steps** | Edit: name, contact email, tier, billing model, seats/target, payment term/method, price, notes, dates, active |
| **Expected** | Сохраняется; detail отражает значения. Смена contact email обновляет primary HR portal linkage (без auto-clinical enroll). |

### EAC-A-TIER-001 — Tier enum + entitlement sync — TESTED

| | |
|---|---|
| **Preconditions** | Org с ≥1 enrolled employee; tier Pro |
| **Steps** | (a) Убедиться, что Free/custom tier недоступны. (b) Сменить org tier → Premium. Refresh employee session / entitlement. |
| **Expected** | Только Pro \| Premium. Immediate flip effective entitlement / `enterpriseTier`. Individual Stripe sub ignored for `accountType = enterprise`. |

---

## 6. Enrollment codes & join URL (§3.3–3.4)

### EAC-A-CODE-001 — Generate / assign / copy — TESTED

| | |
|---|---|
| **Preconditions** | Active org на detail |
| **Steps** | Auto-generate code; Assign custom valid code (6–8, A–Z/0–9, optional hyphen); Copy code |
| **Expected** | Codes created; clipboard copy works; list shows active codes. |

### EAC-A-CODE-002 — Validation & uniqueness — TESTED

| | |
|---|---|
| **Preconditions** | Active code `ACME26` на Org A |
| **Steps** | (a) Assign short/long/bad charset code. (b) Assign duplicate active `ACME26` на Org B или A. |
| **Expected** | Invalid → explicit error. Duplicate active → rejected. |

### EAC-A-CODE-003 — Deactivate code — TESTED

| | |
|---|---|
| **Preconditions** | Org с active code; ≥1 already enrolled member |
| **Steps** | Deactivate code; попытка redeem / open join URL |
| **Expected** | New redemptions blocked immediately. Existing members remain enrolled. |

### EAC-A-CODE-004 — Multi-code while org active — TESTED

| | |
|---|---|
| **Preconditions** | Active org accepting enrollments |
| **Steps** | Создать 2+ active codes; deactivate один; enroll через второй |
| **Expected** | Multi-active allowed. Enroll через remaining active code succeeds (subject to seats/dates). |

### EAC-A-JOIN-001 — Copy join link + logged-out signup — TESTED

| | |
|---|---|
| **Preconditions** | Active code on active org with free seats |
| **Steps** | Copy join link → open as logged-out → signup/register |
| **Expected** | URL `/join/{code}` (or app-origin absolute). Signup with enterprise context pre-applied; same validation as manual code. |

### EAC-A-JOIN-002 — Inactive code / inactive org / seats-full messaging — TESTED

| | |
|---|---|
| **Preconditions** | (a) deactivated code; (b) `isActive=false` org; (c) flat-rate seats full |
| **Steps** | Open corresponding `/join/{code}` |
| **Expected** | Clear failure messaging. **No** silent Free signup CTA (OVR-054). Seats-full communicated before linkage completes / fails cleanly. |

### EAC-A-JOIN-003 — Peek rate limit (smoke) — TESTED

| | |
|---|---|
| **Preconditions** | Join page / `peek-workplace-enrollment`; migration `consume_edge_rate_limit` applied; edge redeployed |
| **Steps** | (1) Peek RPC as anon → denied. (2) Edge peek invalid/valid → clean errors. (3) ≥13 peek/min same IP or same code (format-valid) via edge → **429** |
| **Expected** | Durable rate limit (Postgres `edgeRateLimitBucket`, 12/min per `peek:ip:*` / `peek:code:*`); RPC peek service_role-only; no internal error leakage. Note: in-memory isolate Maps are **not** sufficient on multi-isolate Edge. |

---

## 7. Billing models (§4)

### EAC-A-FLAT-001 — Flat rate hard cap — TESTED

| | |
|---|---|
| **Preconditions** | Org `flat_rate`, `seatCount=N` (рекомендуется N=2–3), active code |
| **Steps** | Enroll N users via join/invite/add. Attempt N+1. |
| **Expected** | N succeeds. N+1 rejected (UI + API). Display `active_seats / seat_count`. |

### EAC-A-FLAT-002 — Raise / lower seat_count — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org at cap (from FLAT-001) |
| **Steps** | (a) Raise seats → enroll one more. (b) Attempt lower `seatCount` below `active_seats`. |
| **Expected** | Raise immediately allows enrollments. Lower **blocked** (client + DB `workplace_seat_floor_guard`) with message to revoke first. |

### EAC-A-PPA-001 — Pay per active: soft target + optional maxSeats — TESTED

| | |
|---|---|
| **Preconditions** | Org `pay_per_active`, target seats = T, optional `maxSeats` |
| **Steps** | Enroll past T (if `maxSeats` null or &gt; T). Observe Admin warning. If `maxSeats` set, enroll up to and beyond. |
| **Expected** | Target alone never blocks. Warning when enrolled &gt; target. Hard block only at `maxSeats` (if set). Admin shows enrolled, target, current-period active. |

### EAC-A-PPA-002 — Active user definition (billing period) — TESTED

| | |
|---|---|
| **Preconditions** | Pay-per-active org; UTC month M; members with/without events |
| **Steps** | Create in M for distinct users: chatConversation, pathSessionCompletion, journalEntry, assessmentResult, dailyCheckin. Login-only user without those events. |
| **Expected** | Users with ≥1 qualifying event count as active. Auth/login alone does **not** count (OVR-054). |

### EAC-A-RPT-001 — Monthly usage report + CSV (US-208) — TESTED

| | |
|---|---|
| **Preconditions** | Data from PPA-002; Admin |
| **Steps** | `/admin/organizations/usage` → select month M → view rows → export CSV |
| **Expected** | Per-org: name, billing model, period, active count, target seats, contracted price/term. CSV usable for manual invoice reconciliation. |

### EAC-A-BILL-001 — Payment terms & collection modes — TESTED

| | |
|---|---|
| **Preconditions** | Admin create/edit |
| **Steps** | Set Annual / Quarterly / Monthly / Half-yearly; Manual vs Stripe; price + notes + invoice status |
| **Expected** | All terms selectable. Manual fully usable without Stripe. Stripe mode is metadata-only (no org Stripe Customer/Invoice/webhook requirement). Term change does not alter employee entitlements. |

### EAC-A-BILL-002 — Billing must-not (§4.4) — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee (`accountType = enterprise`) |
| **Steps** | Attempt individual checkout / upgrade CTA path; deactivate billing collection / notes on org |
| **Expected** | No per-employee Stripe subscription created. Employee upgrade CTAs not introduced by org billing config. Historical enrollments not wiped. |

---

## 8. Seat & account overrides (§5)

### EAC-A-OVR-001 — Contract end date gates new enrollments only — TESTED

| | |
|---|---|
| **Preconditions** | Org with enrolled members + active code |
| **Steps** | Set `contractEndDate` to past. Attempt new enroll. Check existing member access. |
| **Expected** | New enrollments/code redemptions fail. Existing members retain access (no auto-revoke at end date). |

### EAC-A-OVR-002 — Deactivate / reactivate org — TESTED

| | |
|---|---|
| **Preconditions** | Active org with free seats + active code |
| **Steps** | Set `isActive=false` → try enroll. Set `isActive=true` (within dates, seats allow) → enroll. |
| **Expected** | Inactive: new enroll blocked; org still visible in Admin. Reactivate restores enrollment subject to seats/dates. No delete/recreate required. |

### EAC-A-OVR-003 — Seat utilization display after overrides — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org; change seats and enroll/revoke |
| **Steps** | Observe list + detail utilization before/after |
| **Expected** | `active_seats / seat_count` updates immediately and stays consistent with roster definition. |

---

## 9. Members & visibility (§5.4 / §6)

### EAC-A-MEM-001 — Roster add / invite / revoke / roles (OVR-022) — TESTED

| | |
|---|---|
| **Preconditions** | Active org with seats |
| **Steps** | Add existing user by email; invite new email; toggle HR/Manager roles; revoke member |
| **Expected** | Add/invite subject to seats + active contract. Revoke frees flat-rate seat. Roles update; primary contact remains contact email. Dual-mode HR requires explicit enroll (OVR-055). |

### EAC-A-VIS-001 — Org employees table — TESTED

| | |
|---|---|
| **Preconditions** | Org with mixed members; another org’s employees exist |
| **Steps** | Open org detail members / users table filtered to workplace |
| **Expected** | Columns: name, email, effective tier, roles, enrollment date, active status. Only `workplaceId = org` (+ enterprise membership). No cross-org users. |

### EAC-A-VIS-002 — Deep link to Admin user detail — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled employee in roster |
| **Steps** | Click through to `/admin/users/:id` |
| **Expected** | Full Admin user detail (profile, paths/sessions, assessments, activity indicators, flags/credits as elsewhere in Admin). Platform Admin allowed; this is **not** HR portal. |

### EAC-A-VIS-003 — Seat count ↔ roster consistency — TESTED

| | |
|---|---|
| **Preconditions** | Known roster size after add/revoke |
| **Steps** | Compare utilization widget vs roster rows that consume seats |
| **Expected** | Counts match. Portal-only HR (no clinical enroll) does **not** consume a seat (OVR-055). |

---

## 10. Audit (access rules §2)

### EAC-A-AUD-001 — Mutation audit smoke — TESTED

| | |
|---|---|
| **Preconditions** | Admin; audit storage available (DB/log per implementation) |
| **Steps** | Change seat count, billing model, price, payment term, contract end, `isActive`, create/deactivate enrollment code |
| **Expected** | Each mutation audited with who / what / when (minimum fields listed in §2). |

> Если audit UI ещё не экспонирован — проверить DB/audit table или server logs и зафиксировать gap.

---

## 11. Acceptance pack (§11) — end-to-end

Короткий регресс-пакет (можно гонять после фич-фиксов).

### EAC-A-PACK-001 — Flat-rate 100-seat story (scaled) — TESTED

| | |
|---|---|
| **Preconditions** | Admin; use small N in QA (e.g. 3) unless load env available — same rules as 100 |
| **Steps** | Create flat-rate org (N seats, Pro, annual, manual) → generate code → copy join URL → enroll N → N+1 blocked → raise to N+1 → enroll succeeds |
| **Expected** | Matches §11 items 1–2. |

### EAC-A-PACK-002 — Code + org deactivate — TESTED

| | |
|---|---|
| **Preconditions** | Org from PACK-001 |
| **Steps** | Deactivate code → join fails; deactivate org → new enrollments fail; reactivate → enroll works |
| **Expected** | Matches §11 item 3. |

### EAC-A-PACK-003 — Pay-per-active report — TESTED

| | |
|---|---|
| **Preconditions** | Pay-per-active org; ~subset of members with month-M activity |
| **Steps** | Enroll cohort → simulate activity for subset in month M → report shows that count → CSV export |
| **Expected** | Matches §11 item 4. |

### EAC-A-PACK-004 — Tier flip + Admin visibility + no employee Stripe — TESTED

| | |
|---|---|
| **Preconditions** | Org with employee; Pro → Premium |
| **Steps** | Change tier; open roster → user detail; attempt employee checkout |
| **Expected** | Entitlement Premium; Admin sees assessment/activity fields; checkout covered / no Stripe subscription (§11 items 5–7). |

---

## 12. Матрица трассировки

| ID prefix | Spec | Override / US |
|---|---|---|
| EAC-A-ACCESS / UI | §2, §7 | OVR-048 |
| EAC-A-ORG / TIER | §3.1–3.2, §3.5 | OVR-053, OVR-055 |
| EAC-A-CODE / JOIN | §3.3–3.4 | OVR-054, US-206 |
| EAC-A-FLAT | §4.1, §5.1 | OVR-054, US-207 |
| EAC-A-PPA / RPT | §4.2 | OVR-054, US-208 |
| EAC-A-BILL | §4.3–4.4 | OVR-053 / OVR-054 |
| EAC-A-OVR | §5.1–5.3 | OVR-054 |
| EAC-A-MEM / VIS | §5.4, §6 | OVR-022, OVR-055 |
| EAC-A-AUD | §2 | — |
| EAC-A-PACK | §11 | — |

---

## 13. Статусы прогона (заполнять QA)

| ID | Result | Notes |
|---|---|---|
| EAC-A-ACCESS-001 | | |
| EAC-A-ACCESS-002 | | |
| EAC-A-UI-001 | | |
| EAC-A-ORG-001 | | |
| EAC-A-ORG-002 | | |
| EAC-A-ORG-003 | | |
| EAC-A-ORG-004 | | |
| EAC-A-ORG-005 | | |
| EAC-A-TIER-001 | | |
| EAC-A-CODE-001 | | |
| EAC-A-CODE-002 | | |
| EAC-A-CODE-003 | | |
| EAC-A-CODE-004 | | |
| EAC-A-JOIN-001 | | |
| EAC-A-JOIN-002 | | |
| EAC-A-JOIN-003 | PASS | 2026-08-13: RPC anon denied; clean peek errors; durable 429 after 12/min (Postgres `consume_edge_rate_limit`; prior FAIL was isolate Map) |
| EAC-A-FLAT-001 | | |
| EAC-A-FLAT-002 | | |
| EAC-A-PPA-001 | | |
| EAC-A-PPA-002 | | |
| EAC-A-RPT-001 | | |
| EAC-A-BILL-001 | | |
| EAC-A-BILL-002 | | |
| EAC-A-OVR-001 | | |
| EAC-A-OVR-002 | | |
| EAC-A-OVR-003 | | |
| EAC-A-MEM-001 | | |
| EAC-A-VIS-001 | | |
| EAC-A-VIS-002 | | |
| EAC-A-VIS-003 | | |
| EAC-A-AUD-001 | | |
| EAC-A-PACK-001 | TESTED | 2026-08-14 retest: org `EAC-A PACK-001 Reg 0814` Pro/flat/yearly/manual, N=3, auto-code ORGE64C, join copied. Invite 3 OK (3/3). N+1 invite «Organization seats are full.»; `/join/ORGE64C` «No seats available»; peek 409 seatsFull. Raise to 4 → 4th invite OK (4/4). |
| EAC-A-PACK-002 | TESTED | 2026-08-14 retest: deactivate ORGE64C → peek 404 «Invalid or inactive enrollment code», `/join/ORGE64C` Unable to join. Org isActive=false → peek ORG9ADF 400 «enrollment is not active», join Enrollment unavailable, invite disabled. Reactivate → invite eac-a-r0814e succeeds 5/5. |
| EAC-A-PACK-003 | TESTED | 2026-08-14 retest: `/admin/organizations/usage` Aug 2026. PPA rows: Acme QA Edited 0 active/3 enrolled/target 10/max 20/$5,000; Flat Cap QA 2/6/target 5; PPA Soft Target 2/4/target 2/max 10/$1,500. Columns name/model/active/enrolled/target/term/price. Export CSV downloaded `workplace-active-users-2026-08.csv`. |
| EAC-A-PACK-004 | TESTED | 2026-08-14 retest: HRONLY Pro→Premium; roster Sub FM/enr-002/cr-run/referee3 → premium; profile enterpriseTier=premium. Deep link `/admin/users/7e30f7aa…` Profile/Paths/assessment/flags. Employee stripe-checkout 409 enterprise_covered, no Subscription nav. Org restored Pro. |

**Result values:** `PASS` · `FAIL` · `BLOCKED` · `SKIP` · `TESTED` (при повторном прогоне — обновлять Notes).

---

# Part B — Enterprise Organization Manager Portal

**Спека:** [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) — **Part B (§§12–22)**  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Employer portal entry | `/employer`, `EmployerPortal.tsx`, `useHrWorkplaces`, `AppSidebar` |
| Seat utilization | `EmployerSeatUtilizationPanel`, `employerSeatUtilizationApi` |
| Enrollment codes + join URL | `EmployerEnrollmentCodesPanel`, `employer-enrollment-codes` |
| Members / invite / roles | `WorkplaceMembersPanel`, `workplace-members`, `workplace-members` edge |
| Org-wide metrics | `EmployerContinuousMetricsPanel`, `EmployerMonthlyTrendsPanel`, `EmployerAssessmentBaselinePanel`, `employer-metrics` |
| Manager team aggregate | `ManagerTeamAggregatePanel`, `SettingsWorkplaceAggregateSection`, `managerAggregateLogic` |
| Success Plan HR assign | `EmployerSuccessPlanAssignPanel`, `workplace-assign-success-plan` |
| Privacy / ops profiles | `list_workplace_member_ops_profiles`, scoped workplace SELECT, `employerMetricsLogic` |

## How to run (Part B)

- Manual / browser: `/test-list docs/enterprise-admin-controls-test-plan.md` или `/test EAC-B-<ID>`
- Actors: Primary HR, Delegated HR, Team Manager (non-HR), enterprise employee, portal-only HR (OVR-055)
- Part A dependency: orgs/codes/seats создаются Platform Admin; HR проверяет отражение в `/employer`
- Employee checks: отдельный браузер / инкогнито для invite/join и manager opt-in

---

## B.1 Цели и объём

### B.1.1 Цели

Проверить, что HR (primary + delegated) управляет seats, codes, invites и roster **только своей** org; что analytics — anonymized/aggregated с suppression; что privacy guardrails enforced в UI **и** API/RLS; что portal-only HR не проходит clinical onboarding (OVR-055); что Team Managers видят только Settings aggregate для opted-in direct reports.

### B.1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| `/employer` access, workplace switcher, UI inventory §17 | Part A Admin CRUD (кроме reflection smoke) |
| Seat display read-only; invite/add/revoke; codes/links | HR edit billing model, price, contract dates, `seat_count` |
| DAU/WAU/MAU, classification breakdown, monthly trends | Per-user engagement lists, clinical drill-down |
| Manager Settings aggregate + opt-in (OVR-023/024) | Full «manager portal» route (Settings-only per §21) |
| Privacy: forbidden fields absent in network/RLS | Part C employee paywall matrix (smoke only where overlaps) |
| Success Plan HR assign (OVR-038) without clinical detail | Platform Admin impersonation UX |

### B.1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — OVR-055, OVR-022, OVR-023, OVR-024, OVR-038  
3. [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) Part B  
4. Part A locked decisions (seats, join URL, pay-per-active display)

### B.1.4 Locked decisions (§21) — проверять как норму

| Тема | Expected |
|---|---|
| Portal-only HR | No clinical auto-enroll; no mandatory assessment; no seat consumption (OVR-055) |
| Team Managers | Enrolled enterprise members; **take clinical assessment**; Settings aggregate only (not `/employer`) |
| DAU / MAU window | UTC calendar day / UTC calendar month |
| Min cohort / small-cell | `EMPLOYER_MIN_COHORT_SIZE = 5` (server + UI copy) |
| Manager legal banner | Hidden unless `VITE_MANAGER_AGGREGATE_LEGAL_BANNER=true` (OVR-023) |
| Opt-in for manager aggregate | `managerAggregateOptIn`; direct reports only |
| Join URL | Same as Part A: `/join/{code}` |

---

## B.2 Тестовое окружение

### B.2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Employer portal | `/employer` |
| Manager aggregate | Settings → Profile → **Workplace team aggregate** |
| Join | `/join/{code}` (HR copies from portal) |
| Edge | `employer-metrics`, `employer-enrollment-codes`, `workplace-members`, `workplace-assign-success-plan` |

### B.2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Primary HR (portal-only) | `contactEmail` org без clinical enroll | OVR-055 landing, no assessment |
| Delegated HR | Member с HR role (OVR-022) | Full `/employer` на delegated org |
| Team Manager (non-HR) | Manager role + direct reports | Settings aggregate; blocked `/employer` |
| Dual-mode HR | HR + explicit clinical enroll | Portal + clinical IA |
| Enterprise employee | Enrolled staff | Negative access; opt-in toggle |
| Platform Admin | `isAdmin` | Setup + negative: no HR clinical via `/admin/users` as HR |

Password для seed QA users: `qwerty123` (если применимо).

### B.2.3 Минимальные данные для прогона

1. **Flat-rate org** — HR contact portal-only, 3–5 seats, ≥1 active code, mix enrolled employees.  
2. **Pay-per-active org** — target + optional `maxSeats`; HR видит enrolled/target/period active без per-user list.  
3. **Small cohort org** — &lt;5 enrolled для suppression empty-states.  
4. **Large cohort org** — ≥5 enrolled с activity + assessment data для metrics/trends/classification.  
5. **Manager hierarchy** — manager M с ≥2 direct reports (opt-in on/off).  
6. **Multi-org HR** — один user primary/delegated HR на 2 workplaces (switcher).

---

## B.3 Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + roles + nav | 20–30 мин | EAC-B-ACCESS-*, EAC-B-UI-* |
| 1 | Portal-only HR (OVR-055) | 20–30 мин | EAC-B-HRONLY-* |
| 2 | Seats + Part A reflection | 20–30 мин | EAC-B-SEAT-* |
| 3 | Codes + join links | 30–45 мин | EAC-B-CODE-*, EAC-B-JOIN-* |
| 4 | Membership / invite / revoke | 45–60 мин | EAC-B-MEM-* |
| 5 | Analytics + suppression | 45–60 мин | EAC-B-MET-* |
| 6 | Manager aggregate + opt-in | 30–45 мин | EAC-B-MGR-* |
| 7 | Privacy + API/RLS smoke | 30–45 мин | EAC-B-PRIV-* |
| 8 | Success Plan assign + pack §22 | 20–30 мин | EAC-B-SP-*, EAC-B-PACK-* |

---

## B.4 Access, roles & portal entry (§13)

### EAC-B-ACCESS-001 — Non-HR blocked from `/employer` — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee без HR/Manager portal rights |
| **Steps** | Navigate `/employer`; check sidebar |
| **Expected** | Redirect to app home (`/dashboard`). No Employer portal nav item. |

### EAC-B-ACCESS-002 — HR sees only authorized workplaces — TESTED

| | |
|---|---|
| **Preconditions** | User HR on Org A only; Org B exists |
| **Steps** | Open `/employer`; inspect workplace switcher / data panels |
| **Expected** | Only Org A visible. Codes, roster, metrics scoped to Org A. Org B codes/members invisible. |

### EAC-B-ACCESS-003 — Delegated HR full portal (OVR-022) — TESTED

| | |
|---|---|
| **Preconditions** | Member granted HR role on org; not primary contact |
| **Steps** | Sign in as delegated HR → `/employer` |
| **Expected** | Full HR tools: seats, codes, members, org-wide analytics — same as primary HR for that org. |

### EAC-B-ACCESS-004 — Team Manager without HR cannot use HR tools — TESTED

| | |
|---|---|
| **Preconditions** | Manager role only (no HR) |
| **Steps** | Attempt `/employer`; attempt code generation / org-wide revoke via API if exposed |
| **Expected** | `/employer` blocked. No enrollment code admin, no org-wide roster revoke. Settings manager aggregate available separately. |

### EAC-B-ACCESS-005 — Part A changes reflected in portal — TESTED

| | |
|---|---|
| **Preconditions** | HR on active org; Platform Admin session available |
| **Steps** | Admin: deactivate org → HR refresh. Admin: lower seats to cap → HR refresh. Admin: reactivate. |
| **Expected** | Seat display, invite/code actions, and error messaging update without re-login (normal refresh sufficient). |

### EAC-B-UI-001 — Employer portal UI inventory (§17) — TESTED

| | |
|---|---|
| **Preconditions** | HR on org with data |
| **Steps** | Walk `/employer` top-to-bottom |
| **Expected** | Header + privacy one-liner; workplace switcher (if multi-org); seat utilization; continuous engagement; monthly trends; classification baseline; members; Success Plan assign; enrollment codes. No link to Admin user clinical detail. |

---

## B.5 Portal-only HR & clinical skip (§14.1)

### EAC-B-HRONLY-001 — Primary HR not forced through assessment (OVR-055) — TESTED

| | |
|---|---|
| **Preconditions** | New org; primary contact = existing profile; **no** explicit clinical enroll |
| **Steps** | Sign in as primary HR after org create |
| **Expected** | Lands on `/employer` (or employer home route). No assessment gate. `accountType` not `enterprise`. |

### EAC-B-HRONLY-002 — Clinical surfaces hidden for portal-only HR — TESTED

| | |
|---|---|
| **Preconditions** | Portal-only HR logged in |
| **Steps** | Check sidebar/nav for Chat, Paths, Journal, Results clinical entry points |
| **Expected** | Clinical IA hidden or unreachable. Employer portal entry visible. |

### EAC-B-HRONLY-003 — Portal-only HR does not consume seat — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org N seats; portal-only HR + N enrolled employees |
| **Steps** | Compare `active_seats / seat_count` in Admin and `/employer` |
| **Expected** | HR not counted in active seats. N/N utilization reflects employees only. |

### EAC-B-HRONLY-004 — Dual-mode HR requires explicit enroll — TESTED

| | |
|---|---|
| **Preconditions** | Portal-only HR on org |
| **Steps** | Admin or HR adds same user via members panel / invite with clinical enroll (or self redeem code) |
| **Expected** | After explicit enroll: `accountType=enterprise`, seat increments, clinical IA available. HR portal still accessible. |

### EAC-B-HRONLY-005 — Team Manager takes clinical assessment — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled manager with Manager role (not portal-only HR) |
| **Steps** | Complete onboarding / login as manager employee |
| **Expected** | Clinical assessment required like other enterprise employees (not exempt). Manager aggregate remains Settings-only. |

---

## B.6 Privacy guardrails (§14.2)

### EAC-B-PRIV-001 — No Admin user detail for HR — TESTED

| | |
|---|---|
| **Preconditions** | HR logged in |
| **Steps** | Attempt `/admin/users/:id`; inspect roster UI for deep links |
| **Expected** | Access denied. Roster shows ops fields only (name, email, roles, status) — no classification/activity. |

### EAC-B-PRIV-002 — Employer metrics API: no per-user clinical payloads — TESTED

| | |
|---|---|
| **Preconditions** | HR on cohort org; browser devtools |
| **Steps** | Load `/employer`; capture `employer-metrics` (or equivalent) response |
| **Expected** | Aggregates only: counts, percentages, bucket labels, cohort size. **No** user ids, names, chat transcripts, assessment answers, journal text, per-user timelines. |

### EAC-B-PRIV-003 — Classification: buckets only, no drill-down — TESTED

| | |
|---|---|
| **Preconditions** | Org with ≥5 assessed employees |
| **Steps** | View classification breakdown; click buckets / cells if interactive |
| **Expected** | Distribution buckets only. No member list. Cells below small-cell threshold suppressed or rolled to «Other / suppressed». |

### EAC-B-PRIV-004 — Small cohort suppression (min = 5) — TESTED

| | |
|---|---|
| **Preconditions** | Org with enrolled &lt; `EMPLOYER_MIN_COHORT_SIZE` (5) |
| **Steps** | Open engagement, baseline, trends panels |
| **Expected** | Detailed breakdowns hidden; copy explains insufficient cohort. No fabricated percentages. |

### EAC-B-PRIV-005 — RLS / ops profile scope (smoke) — TESTED

| | |
|---|---|
| **Preconditions** | HR user; knowledge of member profile ids |
| **Steps** | Verify roster uses ops RPC (`list_workplace_member_ops_profiles` or equivalent); attempt direct Supabase client select of clinical columns as HR (if test harness available) |
| **Expected** | Forbidden clinical columns not returned to HR callers even on crafted queries. |

### EAC-B-PRIV-006 — Privacy copy present — TESTED

| | |
|---|---|
| **Preconditions** | HR on `/employer` |
| **Steps** | Read header/helper text on metrics panels |
| **Expected** | Copy states individual coaching content and entries stay private; data is aggregated/non-identifying. |

---

## B.7 Seat utilization (§15.1)

### EAC-B-SEAT-001 — Live utilization display — TESTED

| | |
|---|---|
| **Preconditions** | Active org; known roster size |
| **Steps** | Open `/employer` seat panel; add then revoke member |
| **Expected** | Flat-rate: `active_seats / seat_count`. Pay-per-active: enrolled, target, period active (no names). Updates after roster change. |

### EAC-B-SEAT-002 — Seats full blocks invite/enroll — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org at cap |
| **Steps** | HR: invite / add existing user |
| **Expected** | Clear «no seats available» (or equivalent). Action fails in UI + API. |

### EAC-B-SEAT-003 — HR cannot edit contract fields — TESTED

| | |
|---|---|
| **Preconditions** | HR on org detail equivalent |
| **Steps** | Inspect seat panel and portal for edit controls on tier, price, payment terms, `seat_count`, contract dates |
| **Expected** | All Part A billing/config fields read-only or absent. Only Platform Admin can change via Part A. |

---

## B.8 Enrollment codes & join links (§15.2)

### EAC-B-CODE-001 — Generate / copy code / copy join link / deactivate — TESTED

| | |
|---|---|
| **Preconditions** | HR on active org with free seats |
| **Steps** | Generate code; copy code; copy join link; deactivate code |
| **Expected** | Same charset/length rules as Part A (6–8). Clipboard works. Join link `/join/{code}`. Deactivated code blocks new redemptions. |

### EAC-B-CODE-002 — Workplace isolation — TESTED

| | |
|---|---|
| **Preconditions** | HR on Org A; Org B has its own codes |
| **Steps** | View codes panel on Org A |
| **Expected** | Org B codes not listed. Cannot manage Org B codes from Org A session. |

### EAC-B-JOIN-001 — Join link validation path matches Part A — TESTED

| | |
|---|---|
| **Preconditions** | HR copied join link from portal |
| **Steps** | Logged-out user opens link → signup; repeat with inactive org / deactivated code / seats full |
| **Expected** | Same validation and messaging as Part A join (EAC-A-JOIN-*). Successful enroll increments HR seat display. |

---

## B.9 Membership: add / invite / revoke (§15.3)

### EAC-B-MEM-001 — Invite new employee — TESTED

| | |
|---|---|
| **Preconditions** | Org with free seats; fresh email |
| **Steps** | HR send invite → recipient signup |
| **Expected** | Email sent. User auto-enrolled to org tier. Seat increments. Roster shows pending → active. |

### EAC-B-MEM-002 — Add existing user by email — TESTED

| | |
|---|---|
| **Preconditions** | Existing platform account not in org |
| **Steps** | HR add by email |
| **Expected** | Linked to workplace; enterprise tier from contract; seat increments subject to caps/dates. |

### EAC-B-MEM-003 — Revoke frees seat and entitlement — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled employee consuming seat |
| **Steps** | HR revoke member; check seat widget; sign in as revoked user |
| **Expected** | `active_seats` decrements immediately. User loses enterprise entitlement (Part C fallback rules apply). |

### EAC-B-MEM-004 — Roster columns without clinical detail — TESTED

| | |
|---|---|
| **Preconditions** | Org with mixed roles |
| **Steps** | Inspect members table |
| **Expected** | Name, email, roles, enrollment/invite status visible. No classification, chat, assessment, or activity columns. |

### EAC-B-MEM-005 — Roles: HR / Manager / direct reports (OVR-022) — TESTED

| | |
|---|---|
| **Preconditions** | HR on org |
| **Steps** | Toggle delegated HR; toggle Manager; wire direct reports |
| **Expected** | Roles persist. Delegated HR gains portal. Manager without HR does not gain `/employer`. No clinical data exposed in role UI. |

### EAC-B-MEM-006 — Block invite when org inactive or seats full — PASS

| | |
|---|---|
| **Preconditions** | (a) Admin set `isActive=false`; (b) flat-rate full |
| **Steps** | HR attempt invite/add in UI **and** `POST workplace-members` `action: invite` for an email with **no** existing profile |
| **Expected** | Blocked with clear messaging in both cases. UI disables Add/invite when inactive. API/`assign_workplace_member_by_email` must reject unknown-email invites the same as enroll (inactive → 400 «enrollment is not active»; seats full → 409 «Organization seats are full») — no `workplaceInvitation` row, no invite email. |

---

## B.10 Anonymized workforce analytics (§16)

### EAC-B-MET-001 — DAU / WAU / MAU engagement — TESTED

| | |
|---|---|
| **Preconditions** | Org ≥5 enrolled; subset with qualifying events (chat, path, journal, assessment, check-in, login per spec) |
| **Steps** | View continuous engagement panel; compare rough counts to known test activity (UTC day/week/month) |
| **Expected** | Daily, weekly, monthly active shown as counts and/or % of enrolled. No user-level list. Live data, not reassessment-only. |

### EAC-B-MET-002 — Qualifying events align with Part A active-user definition — TESTED

| | |
|---|---|
| **Preconditions** | Users with login-only vs users with chat/path/journal/assessment/check-in in UTC month |
| **Steps** | Observe MAU / period active count |
| **Expected** | Login-only without qualifying engagement may not count (align with Part A OVR-054 where applicable). Document any intentional HR-display differences vs Admin report. |

### EAC-B-MET-003 — Classification distribution (anonymized) — TESTED

| | |
|---|---|
| **Preconditions** | Cohort ≥5 with assessment classifications |
| **Steps** | View baseline / classification panel |
| **Expected** | Bucket counts or % only. Suppression for small cells. Helper copy on aggregation. |

### EAC-B-MET-004 — Monthly outcome trends + MAU companion — TESTED

| | |
|---|---|
| **Preconditions** | Org older than 1 month with score history (or partial) |
| **Steps** | View monthly trends chart |
| **Expected** | Monthly points for cohort Stability / Performance / Alignment (or product indices). MAU % companion series. Months with insufficient data omitted/unavailable — not fabricated. No per-user time series. |

### EAC-B-MET-005 — Near-term weekly sparklines (optional) — TESTED

| | |
|---|---|
| **Preconditions** | Org with recent weekly activity |
| **Steps** | View continuous / sparkline widgets if rendered |
| **Expected** | Near-term utilization only; still aggregate. Complements required monthly trends. |

---

## B.11 Manager-scoped aggregate (§16.4, OVR-023/024)

### EAC-B-MGR-001 — Manager sees direct reports only — TESTED

| | |
|---|---|
| **Preconditions** | Manager M with reports R1 (opt-in), R2 (opt-out), and non-report colleague C |
| **Steps** | Settings → Workplace team aggregate as M |
| **Expected** | Aggregate includes opted-in direct reports only. Not org-wide HR metrics. C excluded. |

### EAC-B-MGR-002 — Opt-in toggle (OVR-024) — TESTED

| | |
|---|---|
| **Preconditions** | Direct report employee |
| **Steps** | Toggle `managerAggregateOptIn` on Profile; refresh manager view |
| **Expected** | Opt-in user included in aggregate math; opt-out excluded. HR-only users also see toggle when HR access exists (OVR-024). |

### EAC-B-MGR-003 — Same suppression rules as HR aggregates — TESTED

| | |
|---|---|
| **Preconditions** | Manager with &lt;5 opted-in direct reports |
| **Steps** | Open manager aggregate panel |
| **Expected** | Suppressed or empty-state per min cohort. No individual names in breakdown. |

### EAC-B-MGR-004 — Legal banner env-gated (OVR-023) — TESTED

| | |
|---|---|
| **Preconditions** | Default env (`VITE_MANAGER_AGGREGATE_LEGAL_BANNER` unset/false) |
| **Steps** | Open manager aggregate |
| **Expected** | Amber legal banner hidden; metrics card still renders when data available. Repeat with env `true` if counsel gate needed — banner blocks/shows per OVR-023. |

### EAC-B-MGR-005 — Manager cannot see forbidden clinical data — TESTED

| | |
|---|---|
| **Preconditions** | Manager with opted-in reports |
| **Steps** | Inspect manager aggregate network response and UI |
| **Expected** | No chat logs, assessment answers, classifications tied to individuals. Aggregates only. |

---

## B.12 Success Plan HR assign (OVR-038)

### EAC-B-SP-001 — HR assigns Success Plan without clinical detail — TESTED

| | |
|---|---|
| **Preconditions** | HR on org; member eligible for assignment |
| **Steps** | Use Success Plan assign panel → assign path to member |
| **Expected** | Assignment succeeds. UI does not show assignee clinical content, chat, or assessment answers. Member gains SP access per OVR-038 rules. |

### EAC-B-SP-002 — HR assign respects workplace scope — TESTED

| | |
|---|---|
| **Preconditions** | Member on Org A only |
| **Steps** | HR on Org A attempts assign to Org B member (if UI/API allows selection) |
| **Expected** | Cross-org assignment rejected. Only same-workplace members listed. |

---

## B.13 Permissions matrix smoke (§18)

### EAC-B-PERM-001 — Capability matrix spot-check — TESTED

| | |
|---|---|
| **Preconditions** | All four actors available: Platform Admin, HR, Team Manager, Employee |
| **Steps** | For each capability row in §18 matrix, spot-check one representative action |
| **Expected** | Matches matrix: HR yes on seats view, codes, invite/revoke, org analytics; no on billing/seat_count edit and individual clinical; Manager no on `/employer` HR tools; Employee no portal. |

---

## B.14 Acceptance pack (§22) — end-to-end

Короткий регресс-пакет Part B (после фич-фиксов или перед релизом portal).

### EAC-B-PACK-001 — HR happy path: seats → code → invite — TESTED

| | |
|---|---|
| **Preconditions** | HR on flat-rate org with free seats |
| **Steps** | Open `/employer` → verify `n / N` → generate code → copy code → copy join link → invite employee → seat increments |
| **Expected** | Matches §22 item 1. |

### EAC-B-PACK-002 — Revoke frees seat — TESTED

| | |
|---|---|
| **Preconditions** | Employee from PACK-001 enrolled |
| **Steps** | HR revoke → observe seats → revoked user session |
| **Expected** | Seat frees; enterprise entitlement removed (§22 item 2). |

### EAC-B-PACK-003 — Metrics anonymized + suppression — TESTED

| | |
|---|---|
| **Preconditions** | Large and small cohort orgs |
| **Steps** | HR view DAU/WAU/MAU + classification %; repeat on cohort &lt;5 |
| **Expected** | No names in UI; small cohort suppressed (§22 item 3). |

### EAC-B-PACK-004 — Monthly trends without per-user points — TESTED

| | |
|---|---|
| **Preconditions** | Org with monthly score history or empty-state |
| **Steps** | Render monthly trend widget; inspect chart data |
| **Expected** | Cohort monthly points only or honest empty-state (§22 item 4). |

### EAC-B-PACK-005 — Manager restricted surface — TESTED

| | |
|---|---|
| **Preconditions** | Team Manager non-HR with opted-in reports |
| **Steps** | `/employer` blocked; Settings aggregate visible; attempt forbidden clinical views |
| **Expected** | §22 item 5. |

### EAC-B-PACK-006 — Portal-only HR no clinical onboarding — TESTED

| | |
|---|---|
| **Preconditions** | Primary HR portal-only (OVR-055) |
| **Steps** | Login flow |
| **Expected** | No forced assessment/path onboarding (§22 item 6). |

### EAC-B-PACK-007 — Network privacy on metrics — TESTED

| | |
|---|---|
| **Preconditions** | HR on metrics-rich org |
| **Steps** | DevTools on employer metrics requests |
| **Expected** | No per-user classification, transcripts, or answers (§22 item 7). |

### EAC-B-PACK-008 — Employee no employer admin ops — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee non-HR |
| **Steps** | No portal nav; no code generation / admin-only API |
| **Expected** | §22 item 8. |

---

## B.15 Матрица трассировки (Part B)

| ID prefix | Spec | Override / US |
|---|---|---|
| EAC-B-ACCESS / UI | §13, §17 | OVR-055 |
| EAC-B-HRONLY | §14.1 | OVR-055 |
| EAC-B-PRIV | §14.2 | Phase 2 §9 |
| EAC-B-SEAT | §15.1 | US-207 |
| EAC-B-CODE / JOIN | §15.2 | US-206, OVR-054 |
| EAC-B-MEM | §15.3 | OVR-022 |
| EAC-B-MET | §16.1–16.3 | US-207 / US-208 alignment |
| EAC-B-MGR | §16.4 | OVR-023, OVR-024 |
| EAC-B-SP | §17, §19 | OVR-038 |
| EAC-B-PERM / PACK | §18, §22 | — |

---

## B.16 Статусы прогона Part B (заполнять QA)

| ID | Result | Notes |
|---|---|---|
| EAC-B-ACCESS-001 | | |
| EAC-B-ACCESS-002 | | |
| EAC-B-ACCESS-003 | | |
| EAC-B-ACCESS-004 | | |
| EAC-B-ACCESS-005 | | |
| EAC-B-UI-001 | | |
| EAC-B-HRONLY-001 | | |
| EAC-B-HRONLY-002 | | |
| EAC-B-HRONLY-003 | | |
| EAC-B-HRONLY-004 | | |
| EAC-B-HRONLY-005 | | |
| EAC-B-PRIV-001 | | |
| EAC-B-PRIV-002 | | |
| EAC-B-PRIV-003 | | |
| EAC-B-PRIV-004 | | |
| EAC-B-PRIV-005 | | |
| EAC-B-PRIV-006 | | |
| EAC-B-SEAT-001 | | |
| EAC-B-SEAT-002 | | |
| EAC-B-SEAT-003 | | |
| EAC-B-CODE-001 | | |
| EAC-B-CODE-002 | | |
| EAC-B-JOIN-001 | | |
| EAC-B-MEM-001 | | |
| EAC-B-MEM-002 | | |
| EAC-B-MEM-003 | | |
| EAC-B-MEM-004 | | |
| EAC-B-MEM-005 | | |
| EAC-B-MEM-006 | PASS | 2026-08-14: inactive org → UI lock + API 400 «enrollment is not active», no invite; flat-rate full → «Seats: 1 / 1 used — full», Add/invite disabled, API 409, no workplaceInvitation |
| EAC-B-MET-001 | TESTED | |
| EAC-B-MET-002 | TESTED | |
| EAC-B-MET-003 | TESTED | |
| EAC-B-MET-004 | TESTED | |
| EAC-B-MET-005 | TESTED | |
| EAC-B-MGR-001 | TESTED | |
| EAC-B-MGR-002 | TESTED | |
| EAC-B-MGR-003 | TESTED | |
| EAC-B-MGR-004 | TESTED | |
| EAC-B-MGR-005 | TESTED | |
| EAC-B-SP-001 | TESTED | |
| EAC-B-SP-002 | TESTED | |
| EAC-B-PERM-001 | TESTED | |
| EAC-B-PACK-001 | TESTED | 2026-08-14 retest: HR emp-join-001 `/employer` HRONLY Seats 10/12. Generate ORGB092, Copy code + join link toasts. Invite eac-b-pack001-r → 11/12. |
| EAC-B-PACK-002 | TESTED | 2026-08-14 retest: HR Remove eac-b-pack001-r → Seats 11/12 → 10/12, member gone. |
| EAC-B-PACK-003 | TESTED | 2026-08-14 retest: HRONLY classification buckets (Building Momentum 50%; Capacity Erosion Hidden small cell). PACK-006 org 0/3: «Cohort 0 — metrics hidden until ≥ 5». No names in metrics. |
| EAC-B-PACK-004 | TESTED | 2026-08-14 retest: monthly trend list `2026-03…08` cohort % only; API monthlyScoreTrend avg S/P/A, no per-user points. |
| EAC-B-PACK-005 | TESTED | 2026-08-14 retest: `code3@test.com` `/employer` → `/dashboard`. Settings: Workplace team aggregate + Direct-report wellbeing aggregate; no individual clinical. |
| EAC-B-PACK-006 | TESTED | 2026-08-14 retest: `eac-b-pack-006@uncloud360.ai` login lands `/employer` (not assessment wizard). Primary: Employer + Settings. |
| EAC-B-PACK-007 | TESTED | 2026-08-14 retest: employer-metrics 200; workplace+aggregates only. classificationDistribution keys/counts/suppressed; no email/transcript/answers. |
| EAC-B-PACK-008 | TESTED | 2026-08-14 retest: `sub-fm` no Employer nav; `/employer` → `/dashboard`; employer-enrollment-codes create 403 Forbidden. |

**Result values:** `PASS` · `FAIL` · `BLOCKED` · `SKIP` · `TESTED` (при повторном прогоне — обновлять Notes).

---

# Part C — Enterprise Employee (End-User) Experience

**Спека:** [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) — **Part C (§§23–32)**  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Signup + onboarding code | `SignupPopup`, `OnboardingWorkplaceCode`, `/onboarding` |
| Join URL | `/join/{code}`, `JoinWorkplacePage`, `peek-workplace-enrollment` |
| Redeem / invite | `redeem-workplace-enrollment`, `apply_pending_workplace_invitations`, `workplaceInvitation` |
| Entitlement | `userEntitlementHelpers.ts`, `resolveUserEntitlement`, `effective_user_tier` |
| Paywall hide | `AppSidebar`, `/subscription` (`Subscription.tsx`), `SubscriptionUpgradeBannerGate` |
| Checkout bypass | `stripe-checkout` (`enterprise_covered`), `subscriptionActions` |
| Paid → enterprise | `cancelIndividualStripeOnEnterpriseConvert` |
| Revoke fallback | `unassign_workplace_member`, OVR-056 |
| Success Plan | OVR-038 — HR-assign only; self-purchase CTA hidden |

## How to run (Part C)

- Manual / browser: `/test-list docs/enterprise-admin-controls-test-plan.md` или `/test EAC-C-<ID>`
- Actors: prospective employee (logged-out), enterprise employee (Pro org / Premium org), existing Free / Stripe-paid individual, former employee (revoked), portal-only HR (negative)
- Part A/B dependency: orgs, seats, codes, invites создаются Admin/HR; employee проверяет enroll + paywall-free app
- Stripe checks: test-mode keys; confirm **no** Checkout session / **no** new individual `userSubscription` on enroll

---

## C.1 Цели и объём

### C.1.1 Цели

Проверить, что enterprise employee onboarded через code / join URL / invite получает org contract tier (Pro/Premium) без индивидуальной оплаты; что все paywall/billing surfaces скрыты; что entitlement идёт от workplace (`bypassBilling` / `bypassSessionLimit` / `enterpriseTier`); что revoke и paid→enterprise conversion соответствуют locked §31.

### C.1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Three enroll paths (code, `/join/{code}`, invite) | Part A Admin CRUD (кроме setup orgs) |
| Server-side validation: seats, org/code active, dates, single-org | HR portal UX (Part B) besides seat increment smoke |
| Provisioning fields + entitlement bypass | Org Stripe Customer/Invoice (Part A metadata) |
| Hide paywall / `/subscription` status-only / checkout reject | Full individual billing UX for non-enterprise |
| Pro vs Premium feature parity without purchase CTAs | Portal-only HR clinical skip (covered in EAC-B-HRONLY-*) |
| Revoke fallback OVR-056; paid→enterprise Stripe cancel | New Stripe subscription invent on revoke |

### C.1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — OVR-056, OVR-055, OVR-054, OVR-051, OVR-038, OVR-022  
3. [`docs/enterprise-admin-controls-requirements.md`](./enterprise-admin-controls-requirements.md) Part C  
4. US-205 / Phase 2 §9 billing rule

### C.1.4 Locked decisions (§31) — проверять как норму

| Тема | Expected |
|---|---|
| Paid individual → enterprise | Convert; **cancel Stripe immediately**; stop collection; local `userSubscription` inactive |
| Multi-workplace | One org per user; reject if already linked elsewhere |
| Revoke fallback | Restore prior Stripe-backed entitlement if still valid; else Free. **Do not** create a new Stripe sub (OVR-056) |
| `/subscription` | Status only: “Provided by {org} · Pro\|Premium” — no prices/checkout |
| Success Plan | HR-assign only; hide self-purchase CTA |
| Logged-in + `/join/{code}` | Onboarding complete → redeem in place + toast + dashboard (or `/employer` if portal-only HR). Incomplete onboarding → store code → `/onboarding` auto-redeem |

---

## C.2 Тестовое окружение

### C.2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Signup | existing individual signup (no enterprise-only signup product) |
| Onboarding code step | `/onboarding` → `OnboardingWorkplaceCode` |
| Join | `/join/{code}` |
| Subscription | `/subscription` |
| Edge | `redeem-workplace-enrollment`, `peek-workplace-enrollment`, `stripe-checkout`, `workplace-members` |

### C.2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Fresh email | `eac-c-emp-{n}@test.com` | Paths A/B/C enroll |
| Existing Free individual | seed Free user | Convert to enterprise |
| Existing Stripe Pro/Premium | seed paid user | Paid→enterprise cancel |
| Pro org employee | enrolled on Pro workplace | Path/chat Pro parity; Premium blocked without Stripe |
| Premium org employee | enrolled on Premium workplace | Premium paths + credits; no checkout |
| Former employee | revoked member | OVR-056 fallback |
| Portal-only HR | contact without clinical enroll | Negative: not forced through Part C onboarding |
| Employee already at Org A | enrolled | Single-org reject on Org B code |

Password для seed QA users: `qwerty123` (если применимо).

### C.2.3 Минимальные данные для прогона

1. **Pro flat-rate org** — seats ≥2, active code, future contract end.  
2. **Premium org** — seats ≥2, active code (for tier-parity matrix).  
3. **Full org** — flat-rate at cap (seats-full messaging).  
4. **Inactive code / inactive org** — for negative enroll.  
5. **Invite pending** — HR/Admin invite to fresh email.  
6. **Stripe-paid individual** — active Checkout-backed Pro/Premium (test mode) for conversion + revoke restore.

---

## C.3 Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Actors + IA inventory | 15–20 мин | EAC-C-IA-* |
| 1 | Enroll paths A/B/C | 45–60 мин | EAC-C-ENR-* |
| 2 | Validation failures | 30–45 мин | EAC-C-VAL-* |
| 3 | Provisioning + entitlement | 20–30 мин | EAC-C-PROV-* |
| 4 | Edge cases (paid convert, in-place, single-org) | 45–60 мин | EAC-C-EDGE-* |
| 5 | Hide paywall + server bypass | 30–45 мин | EAC-C-PAY-* |
| 6 | Tier parity Pro vs Premium | 30–45 мин | EAC-C-TIER-* |
| 7 | Revoke fallback | 20–30 мин | EAC-C-REV-* |
| 8 | Acceptance pack §32 | 20–30 мин | EAC-C-PACK-* |

---

## C.4 Post-onboarding IA (§28)

### EAC-C-IA-001 — Clinical nav without Subscription / Employer — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled enterprise employee, not HR |
| **Steps** | Inspect sidebar after onboarding complete |
| **Expected** | Dashboard, Chat, Paths, Journal (standard clinical). **Subscription hidden**. Employer portal hidden. |

### EAC-C-IA-002 — Dual-mode HR still has Employer portal — TESTED

| | |
|---|---|
| **Preconditions** | Explicitly enrolled HR (dual-mode) |
| **Steps** | Inspect sidebar |
| **Expected** | Clinical nav + Employer portal. Subscription still hidden (enterprise). |

### EAC-C-IA-003 — Portal-only HR not forced through employee onboarding — TESTED

| | |
|---|---|
| **Preconditions** | Primary HR without clinical enroll (OVR-055) |
| **Steps** | Login |
| **Expected** | Lands on `/employer`. No Uncloud360 assessment / path onboarding required. (Overlap EAC-B-HRONLY-001 — smoke here.) |

---

## C.5 Enrollment entry paths (§25.1–25.2)

### EAC-C-ENR-001 — Path A: code during onboarding (US-206) — TESTED

| | |
|---|---|
| **Preconditions** | Active Pro org with free seats + valid code; logged-out |
| **Steps** | Standard signup → onboarding workplace code step → paste code → complete remaining Uncloud360 steps |
| **Expected** | Same signup product as individuals. After redeem: `accountType=enterprise`, `workplaceId`, `enterpriseTier=pro`, `enrollmentDate` set. No Stripe Checkout. Skip-without-code remains `individual`. |

### EAC-C-ENR-002 — Path B: join URL signup — TESTED

| | |
|---|---|
| **Preconditions** | Active code; logged-out |
| **Steps** | Open `/join/{code}` → register → complete onboarding |
| **Expected** | Code pre-applied / locked. Same server validation as Path A. Profile enterprise fields match org. Seat increments. |

### EAC-C-ENR-003 — Path C: email invite auto-enroll (OVR-022) — TESTED

| | |
|---|---|
| **Preconditions** | HR/Admin invite to fresh email; org has seats |
| **Steps** | Open invite CTA → signup/auth → onboarding if needed |
| **Expected** | Pending `workplaceInvitation` applied (`apply_pending_workplace_invitations`). Auto-enroll at org tier. Seat increments. Invite marked redeemed. |

### EAC-C-ENR-004 — Skip code = individual — TESTED

| | |
|---|---|
| **Preconditions** | Logged-out; no pending invite |
| **Steps** | Signup → skip workplace code step |
| **Expected** | `accountType=individual`. No workplace linkage. Paywall/subscription UX remains individual. |

### EAC-C-ENR-005 — Three paths share server-side linkage — TESTED

| | |
|---|---|
| **Preconditions** | Same org; three distinct users via A, B, C |
| **Steps** | Compare resulting profile fields and seat math |
| **Expected** | Identical linkage semantics (fields, tier, seats). Client-only checks insufficient — redeem via edge/RPC. |

---

## C.6 Validation before linkage (§25.3)

### EAC-C-VAL-001 — Invalid / expired code or invite — TESTED

| | |
|---|---|
| **Preconditions** | Garbage code; expired invite |
| **Steps** | Redeem via onboarding and `/join/{code}` |
| **Expected** | Clear user-safe error. No partial enterprise fields. No stack traces. |

### EAC-C-VAL-002 — Deactivated code / inactive org / contract ended — TESTED

| | |
|---|---|
| **Preconditions** | (a) deactivated code; (b) `isActive=false`; (c) `contractEndDate` in the past |
| **Steps** | Attempt enroll on each |
| **Expected** | Clear errors. Existing members (if any) unchanged. User may continue as individual. |

### EAC-C-VAL-003 — Flat-rate seats-full — no partial linkage — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org at `active_seats = seat_count` |
| **Steps** | Attempt Path A, B, and invite accept |
| **Expected** | Specific seats-full message. `accountType` remains non-enterprise. Invite/code not silently consumed as success. |

### EAC-C-VAL-004 — Invite and code share seat rules — TESTED

| | |
|---|---|
| **Preconditions** | Org with 1 remaining seat |
| **Steps** | Enroll via code (fills last seat). Then accept pending invite (or reverse). |
| **Expected** | Second path fails with same seat rule. No oversell. |

### EAC-C-VAL-005 — Concurrent enroll cannot oversell (smoke) — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate org with 1 remaining seat; two clients ready |
| **Steps** | Trigger two redemptions as close as possible |
| **Expected** | Exactly one succeeds. Loser gets seats-full. Transactional seat check / lock (server-side). |

### EAC-C-VAL-006 — Single-org reject (§31) — TESTED

| | |
|---|---|
| **Preconditions** | User already enterprise at Org A; Org B has valid code |
| **Steps** | Redeem Org B code via onboarding or `/join/{code}` |
| **Expected** | Reject with clear already-enrolled-elsewhere error (409-class). Org A membership unchanged. |

### EAC-C-VAL-007 — Pay-per-active caps on employee enroll — TESTED

| | |
|---|---|
| **Preconditions** | `pay_per_active` org: enrolled past target; `maxSeats` set |
| **Steps** | Enroll until `maxSeats`; attempt +1 |
| **Expected** | Target never blocks. Hard block only at `maxSeats` (Part A). Same messaging family as join. |

---

## C.7 Successful provisioning (§25.4)

### EAC-C-PROV-001 — Canonical profile fields — TESTED

| | |
|---|---|
| **Preconditions** | Successful Path A or B into Pro org |
| **Steps** | Inspect profile (Admin user detail or DB) |
| **Expected** | `accountType=enterprise`, `workplaceId` = org, `enterpriseTier=pro`, `enrollmentDate` set. No individual Stripe sub created. |

### EAC-C-PROV-002 — Immediate entitlement without payment — TESTED

| | |
|---|---|
| **Preconditions** | Fresh enterprise Pro employee |
| **Steps** | Open Paths / Chat / Journal immediately after enroll |
| **Expected** | Pro feature access. `resolveUserEntitlement`: `bypassBilling=true`, `bypassSessionLimit=true`, `tier=enterpriseTier`. |

### EAC-C-PROV-003 — HR seat count reflects new member — TESTED

| | |
|---|---|
| **Preconditions** | HR session on `/employer`; known `n / N` |
| **Steps** | Enroll one employee; HR refresh |
| **Expected** | `active_seats` increments. Portal-only HR still not counted (OVR-055). |

### EAC-C-PROV-004 — Premium org sets `enterpriseTier=premium` — TESTED

| | |
|---|---|
| **Preconditions** | Premium contract org + free seats |
| **Steps** | Enroll new user |
| **Expected** | `enterpriseTier=premium`. Effective entitlement Premium without Checkout. |

---

## C.8 Edge cases (§25.5)

### EAC-C-EDGE-001 — Existing Free individual redeems code — TESTED

| | |
|---|---|
| **Preconditions** | Logged-in Free individual; valid code; onboarding complete |
| **Steps** | Redeem via `/join/{code}` or Settings/onboarding redeem if present |
| **Expected** | Convert to enterprise; org linked; tier from contract; paywall stops. |

### EAC-C-EDGE-002 — Existing Stripe Pro/Premium → enterprise cancel — TESTED

| | |
|---|---|
| **Preconditions** | Individual with active Stripe Pro/Premium (`userSubscription`) |
| **Steps** | Redeem valid enterprise code. Check Stripe Dashboard (test) + local sub row |
| **Expected** | Convert to enterprise. Stripe collection canceled immediately (`cancelIndividualStripeOnEnterpriseConvert`). Local subscription marked inactive. No new org Stripe customer required. |

### EAC-C-EDGE-003 — Join URL with bad code — no silent claim — TESTED

| | |
|---|---|
| **Preconditions** | Logged-out; invalid code in URL |
| **Steps** | Open `/join/NOTACODE` (or similar) |
| **Expected** | Friendly error. User can fall through to individual signup. **No** silent enterprise linkage. **No** Free signup CTA that implies enterprise succeeded (OVR-054). |

### EAC-C-EDGE-004 — “Add a code later” copy vs redeem UI — TESTED

| | |
|---|---|
| **Preconditions** | Individual who skipped code; copy on onboarding/settings if present |
| **Steps** | Search Settings / Profile for redeem UI. If copy promises “add later”, try to redeem. |
| **Expected** | Settings → Profile shows **Workplace enrollment** redeem for individuals. Valid code enrolls (same `redeem-workplace-enrollment` as join). Enterprise employees see “Provided by {org}” status, not the form. Portal-only HR does not see the form. Onboarding skip copy points to Settings → Profile. |

### EAC-C-EDGE-005 — Org tier change after enrollment (Part A immediate) — TESTED

| | |
|---|---|
| **Preconditions** | Pro org employee enrolled |
| **Steps** | Admin changes org tier → Premium. Refresh employee session / entitlement |
| **Expected** | Immediate flip to Premium (Part A locked). Still no paywall. |

### EAC-C-EDGE-006 — Logged-in completed onboarding + `/join/{code}` — TESTED

| | |
|---|---|
| **Preconditions** | Individual Free, onboarding complete; valid code |
| **Steps** | Open `/join/{code}` while logged in |
| **Expected** | Redeem **in place**; toast; route to dashboard (or `/employer` if portal-only HR). |

### EAC-C-EDGE-007 — Logged-in incomplete onboarding + `/join/{code}` — TESTED

| | |
|---|---|
| **Preconditions** | User mid-onboarding; valid code |
| **Steps** | Open `/join/{code}` |
| **Expected** | Store code → continue `/onboarding` → auto-redeem. No duplicate signup. |

---

## C.9 Hide paywall & billing (§26 / US-205)

### EAC-C-PAY-001 — Sidebar Subscription hidden — TESTED

| | |
|---|---|
| **Preconditions** | Active enterprise employee |
| **Steps** | Inspect sidebar |
| **Expected** | No Subscription nav item (not a dead link). |

### EAC-C-PAY-002 — `/subscription` status-only (§31) — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee |
| **Steps** | Deep-link `/subscription` |
| **Expected** | Status copy “Provided by {org} · Pro\|Premium”. **No** plan cards, prices, Monthly/Yearly toggle, Checkout, Founding Member, comparison matrix. |

### EAC-C-PAY-003 — Upgrade banners absent — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee |
| **Steps** | Open Dashboard, Journal, Paths, Chat, Results |
| **Expected** | `SubscriptionUpgradeBannerGate` does not render upgrade banner. No past-due / payment-recovery banners for covered access. |

### EAC-C-PAY-004 — Locked-feature dialogs: contact HR, no Stripe — TESTED

| | |
|---|---|
| **Preconditions** | Pro enterprise; feature that is Premium-only (path or similar) |
| **Steps** | Attempt to open locked Premium feature |
| **Expected** | Blocked **without** purchase CTA. Copy: contact HR / org does not include this. Success Plan self-purchase hidden (OVR-038). |

### EAC-C-PAY-005 — Free session-limit paywall bypassed — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee; enough chat/path usage that a Free user would hit caps |
| **Steps** | Use AI chat / sessions beyond Free limits |
| **Expected** | No session-limit paywall. `bypassSessionLimit=true`. |

### EAC-C-PAY-006 — Settings has no subscription leftovers (OVR-051) — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee |
| **Steps** | Open Settings Profile / Security |
| **Expected** | No plan upsell, checkout, or billing-portal manage-payment CTA. |

### EAC-C-PAY-007 — `stripe-checkout` enterprise_covered — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise session; ability to invoke `stripe-checkout` (UI attempt or authenticated API) |
| **Steps** | Request individual plan Checkout |
| **Expected** | Status `enterprise_covered` (or equivalent error). **No** Stripe Checkout session created. |

### EAC-C-PAY-008 — Subscription change actions empty / forbidden — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee |
| **Steps** | Inspect `subscriptionActions` / plan card actions on `/subscription` |
| **Expected** | Actions list empty or forbidden. No upgrade/downgrade/cancel-individual-collection CTAs. |

---

## C.10 Tier parity (§27)

### EAC-C-TIER-001 — Pro enterprise: Pro paths OK, Premium blocked without checkout — TESTED

| | |
|---|---|
| **Preconditions** | Pro org employee; known Pro-gated and Premium-only paths |
| **Steps** | Open Pro path; attempt Premium-only path |
| **Expected** | Pro paths + Pro chat rules work. Premium-only blocked **without** checkout modal. Entitlement from `enterpriseTier`, not stale `profiles.tier`. |

### EAC-C-TIER-002 — Premium enterprise: Premium paths + coach credits — TESTED

| | |
|---|---|
| **Preconditions** | Premium org employee |
| **Steps** | Open Premium path; exercise Premium coaching credit flow if product includes it |
| **Expected** | Premium paths and Premium credit rules work as for paid Premium. Checkout not offered. |

### EAC-C-TIER-003 — Journal / insights / milestones without upgrade prompts — TESTED

| | |
|---|---|
| **Preconditions** | Pro or Premium enterprise (post-assessment) |
| **Steps** | Journal entry; insights/results; milestone/module if in IA |
| **Expected** | Works per paid-tier rules. No upgrade banners or Checkout. |

### EAC-C-TIER-004 — Success Plan: HR-assign only (OVR-038) — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee without HR-assigned SP |
| **Steps** | Attempt self-purchase / self-enroll Success Plan from employee UI |
| **Expected** | Self-purchase CTA hidden. After HR assign (Part B SP panel), assigned plan accessible without Stripe. |

### EAC-C-TIER-005 — PDF / report downloads follow tier gates — TESTED

| | |
|---|---|
| **Preconditions** | Pro vs Premium enterprise as applicable |
| **Steps** | Attempt PDF/report download surfaces gated by tier |
| **Expected** | Same gates as individual Pro/Premium. Failures use non-purchase messaging. |

---

## C.11 Revoke & former employee (§24 / OVR-056)

### EAC-C-REV-001 — Revoke → Free when no prior Stripe grant — TESTED

| | |
|---|---|
| **Preconditions** | Employee enrolled from Free / never paid; no valid `userSubscription` |
| **Steps** | HR revoke; sign in as former employee |
| **Expected** | Enterprise fields cleared. Falls back to Free. Paywall / session limits may return. **No** new Stripe subscription created. |

### EAC-C-REV-002 — Revoke restores prior Stripe-backed entitlement — TESTED

| | |
|---|---|
| **Preconditions** | Prefer a user whose Stripe period is still valid **without** going through paid→enterprise cancel (that path cancels Stripe). If only convert-then-revoke is available, expect Free (Stripe already canceled) and note it. |
| **Steps** | HR revoke. Check `profiles.tier` / `subscribed` vs `subscription_effective_tier` |
| **Expected** | If existing Stripe-backed `userSubscription` still grants access → restore that tier. Else Free. Do not invent a new Stripe sub (OVR-056). |

### EAC-C-REV-003 — Org deactivate does not auto-wipe existing employee access (Part A policy) — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled employees; Admin sets `isActive=false` |
| **Steps** | Employee continues using app; new enroll blocked (already Part A) |
| **Expected** | Existing members keep access until revoke (Part A locked). Part C paywall remains hidden while still enterprise. |

---

## C.12 Acceptance pack (§32) — end-to-end

Короткий регресс-пакет Part C.

### EAC-C-PACK-001 — New user + code → enterprise, no paywall — TESTED

| | |
|---|---|
| **Preconditions** | Active Pro org + code + seats |
| **Steps** | Signup + code → enroll → check profile, sidebar, Dashboard |
| **Expected** | `accountType=enterprise`, tier matches org; no Subscription nav; no upgrade banner (§32 item 1). |

### EAC-C-PACK-002 — New user + join URL — TESTED

| | |
|---|---|
| **Preconditions** | Same org, distinct email |
| **Steps** | `/join/{code}` → signup → enroll |
| **Expected** | Same as PACK-001 (§32 item 2). |

### EAC-C-PACK-003 — Invite → auto-enroll → seat increments — TESTED

| | |
|---|---|
| **Preconditions** | HR invite; free seats |
| **Steps** | Signup via invite email |
| **Expected** | Auto-enroll; HR `active_seats` +1 (§32 item 3). |

### EAC-C-PACK-004 — Seats-full fails cleanly — TESTED

| | |
|---|---|
| **Preconditions** | Flat-rate at capacity |
| **Steps** | Attempt enroll |
| **Expected** | Seats-full message; no enterprise fields (§32 item 4). |

### EAC-C-PACK-005 — Pro vs Premium path gates without checkout — TESTED

| | |
|---|---|
| **Preconditions** | One Pro employee + one Premium employee |
| **Steps** | Pro: Pro path OK, Premium path blocked without modal. Premium: Premium path + credits work; no checkout |
| **Expected** | §32 items 5–6. |

### EAC-C-PACK-006 — `/subscription` + `stripe-checkout` covered — TESTED

| | |
|---|---|
| **Preconditions** | Enterprise employee |
| **Steps** | Deep-link `/subscription`; invoke checkout |
| **Expected** | No prices/Checkout UI; API `enterprise_covered`; no session (§32 items 7–8). |

### EAC-C-PACK-007 — Revoke returns individual gates — TESTED

| | |
|---|---|
| **Preconditions** | Enrolled employee without remaining Stripe grant |
| **Steps** | HR revoke; use app as former employee |
| **Expected** | Enterprise access removed; Free gates / paywall may return (§32 item 9). |

### EAC-C-PACK-008 — Inactive code / org → individual fallback — TESTED

| | |
|---|---|
| **Preconditions** | Deactivated code or inactive org |
| **Steps** | Attempt enroll; continue as individual |
| **Expected** | Cannot enroll; user can proceed as individual (§32 item 10). |

---

## C.13 Матрица трассировки (Part C)

| ID prefix | Spec | Override / US |
|---|---|---|
| EAC-C-IA | §28 | OVR-051, OVR-055 |
| EAC-C-ENR | §25.1–25.2 | US-206, OVR-022 |
| EAC-C-VAL | §25.3 | OVR-054, §31 single-org |
| EAC-C-PROV | §25.4 | US-205 |
| EAC-C-EDGE | §25.5 | OVR-056, §31 |
| EAC-C-PAY | §26 | US-205, OVR-051, OVR-038 |
| EAC-C-TIER | §27 | OVR-038 |
| EAC-C-REV | §24, §25.5 | OVR-056 |
| EAC-C-PACK | §32 | — |

---

## C.14 Статусы прогона Part C (заполнять QA)

| ID | Result | Notes |
|---|---|---|
| EAC-C-IA-001 | TESTED | |
| EAC-C-IA-002 | TESTED | |
| EAC-C-IA-003 | TESTED | |
| EAC-C-ENR-001 | TESTED | 2026-08-14 retest: eac-c-enr-001b@uncloud360.ai, ORG6663. Redeem 200, advanced to name, completed 13 steps → /dashboard. accountType=enterprise, workplaceId HRONLY, enterpriseTier=pro, enrollmentDate set, no Stripe checkout / no userSubscription. |
| EAC-C-ENR-002 | TESTED | 2026-08-14: /join/ORG038C → /signup?enterpriseCode=ORG038C, sessionStorage ORG038C. Signup eac-c-enr-002@uncloud360.ai auto-redeem 200, skipped locked code UI to name, completed to /dashboard. accountType=enterprise, workplaceId HRONLY, enterpriseTier=pro, seats 3→4. |
| EAC-C-ENR-003 | TESTED | 2026-08-14: Admin invite eac-c-enr-003@uncloud360.ai on HRONLY. inviteUserByEmail created user; invitation accepted immediately; accountType=enterprise, enterpriseTier=pro, workplaceId HRONLY, enrollmentDate set. Seats 4→5/8. Invite status=accepted. |
| EAC-C-ENR-004 | TESTED | 2026-08-14: signup eac-c-enr-004@uncloud360.ai, Skip code → name. accountType=individual, workplaceId/enterpriseTier/enrollmentDate null, tier=free. /subscription shows Free current + Upgrade to Pro/Premium (not enterprise covered). |
| EAC-C-ENR-005 | TESTED | 2026-08-14: Path A 001b, B 002, C 003 — identical accountType=enterprise, workplaceId=HRONLY, enterpriseTier=pro, enrollmentDate set, tier=pro. A/B via redeem-workplace-enrollment 200; C via workplace-members invite accept. |
| EAC-C-VAL-001 | TESTED | 2026-08-14: /join/XXXXXX → «Unable to join» / «Invalid or inactive enrollment code», no Free CTA, no stack. Onboarding eac-c-val-001 + XXXXXX → same user-safe error, redeem 404, profile stays individual. No invitation expiry column — expired-invite subcase N/A. |
| EAC-C-VAL-002 | TESTED | 2026-08-14: (a) ORG4B37 onboarding+join → «Invalid or inactive enrollment code». (b) isActive=false + /join/ORG038C → «enrollment is not active». (c) contractEnd 2026-08-01 + join → same inactive message. Existing 5 members remain enterprise. Org restored active 2026-08-14–2027-08-14. |
| EAC-C-VAL-003 | TESTED | 2026-08-14 retest: Path A onboarding eac-c-val-001 + ORG6663 → UI «Your organization's seats are full. Contact your HR team.», redeem 409, profile stays individual. Join Path B «No seats available». Invite 409 «Organization seats are full.», no invitation. |
| EAC-C-VAL-004 | TESTED | 2026-08-14 reverse: 1 remaining seat; invite eac-c-val-004-pend@uncloud360.ai auto-enrolled (6/6). Code Path A val-001 + ORG6663 → «seats are full», stays individual. No oversell (6 members). |
| EAC-C-VAL-005 | TESTED | 2026-08-14: 1 remaining (6/7). Parallel redeem ORG6663: val-001 409 seats-full (stays individual); enr-004 200 enterprise. After: 7 members, no oversell. |
| EAC-C-VAL-006 | TESTED | 2026-08-14: HRONLY member enr-002 + /join/ORG8A16 (Acme) → «Already enrolled elsewhere», redeem 409 «already enrolled with another organization». workplaceId stays HRONLY. Incomplete enr-004 join skipped code step (no redeem); API still 409. |
| EAC-C-VAL-007 | TESTED | 2026-08-14: EAC-A PPA target 5, maxSeats 6, started at 4. 007a+ORGF57D enrolled as 5th (at target). 007b invite enrolled as 6th (past target). +1 join «No seats available»; invite 409 «Organization seats are full.» Target did not block. |
| EAC-C-PROV-001 | TESTED | 2026-08-14: eac-c-enr-001b Path A HRONLY: accountType=enterprise, workplaceId=ffb375bb…, enterpriseTier=pro, enrollmentDate set, profiles.tier=pro. userSubscription planTier/status=free, no Stripe ids. |
| EAC-C-PROV-002 | TESTED | 2026-08-14: enr-002 Pro enterprise: /paths no Upgrade, /chat composer no session-limit, /journal loads. resolveUserEntitlement for enterprise: bypassBilling=true, bypassSessionLimit=true, tier=enterpriseTier. Sidebar has no Subscription. |
| EAC-C-PROV-003 | TESTED | 2026-08-14: HR emp-join-001 /employer Seats 7/12. Invite eac-c-prov-003@uncloud360.ai → 8/12. Portal-only eac-b-pack-006 workplaceId=null (not counted, OVR-055). |
| EAC-C-PROV-004 | TESTED | 2026-08-14: signup eac-c-prov-004 + Acme ORG8A16 → accountType=enterprise, workplaceId Acme, enterpriseTier=premium, profiles.tier=premium, enrollmentDate set. No Checkout. |
| EAC-C-EDGE-001 | TESTED | 2026-08-14: Free completed `sub-cr-run@test.com` + `/join/ORG6663`. redeem 200; accountType=enterprise, workplaceId HRONLY, enterpriseTier=pro, seats 8→9. Dashboard: no Subscription nav, no Upgrade. Join page then hit peek 429 after effect re-runs (toast «already enrolled»); conversion still applied. |
| EAC-C-EDGE-002 | TESTED | 2026-08-14: `sub-p2pr-stripe-run@test.com` (Stripe Pro active `sub_1Ty7n3…`) + `/join/ORG038C`. Converted enterprise HRONLY Pro. userSubscription planTier=free, status=inactive, stripeSubscriptionId=null (`billing_expire_subscription`). Dashboard no Subscription. Local Stripe CLI is a different account (resource_missing) — Dashboard cancel not independently confirmed. |
| EAC-C-EDGE-003 | TESTED | 2026-08-14: logged-out `/join/NOTACODE` → «Unable to join» / «Invalid or inactive enrollment code.». Home only (no Free/Sign Up CTA). Copy: do not continue as individual Free from this link (OVR-054). sessionStorage join code null. Home → landing Sign Up. No redeem. |
| EAC-C-EDGE-004 | TESTED | 2026-08-14: Settings Profile now has Workplace enrollment redeem (`SettingsEnrollmentCodeSection`). Re-run: skip-code individual can add code on Profile; enterprise sees Provided-by status; portal-only HR has no form. |
| EAC-C-EDGE-005 | TESTED | 2026-08-14: Admin Edit HRONLY Pro→Premium; Save. All 10 members enterpriseTier/tier=premium immediately. Employee `eac-c-enr-002` `/subscription`: «Provided by EAC-B HRONLY-001 · premium», no Subscription nav, no checkout. Org restored Pro; members back to pro. |
| EAC-C-EDGE-006 | TESTED | 2026-08-14 retest: peek-once fix. Free completed `sub-fm@test.com` + `/join/ORG6663`. 1× peek 200, 1× redeem 200, routed `/dashboard`. No Subscription/Upgrade. accountType=enterprise, HRONLY, enterpriseTier=pro, seats 11→12. Toast auto-dismissed before assert. |
| EAC-C-EDGE-007 | TESTED | 2026-08-14: signup `eac-c-edge-007@uncloud360.ai` mid-onboarding (welcome) + `/join/ORG8A16`. Stored ORG8A16, stayed `/onboarding` (no duplicate signup). Get started → auto-redeem 200, advanced to name, code cleared. accountType=enterprise, Acme, enterpriseTier=premium, onboardingCompleted=false. |
| EAC-C-PAY-001 | TESTED | 2026-08-14: `sub-fm@test.com` (HRONLY Pro enterprise) dashboard nav: Dashboard/Chat/Voice/Journal/Paths/Settings only. No Subscription item, no `/subscription` links. |
| EAC-C-PAY-002 | TESTED | 2026-08-14: `sub-fm` `/subscription` «Your access» / «Provided by EAC-B HRONLY-001 · pro». No prices, plan cards, Monthly/Yearly, Checkout, Founding Member. |
| EAC-C-PAY-003 | TESTED | 2026-08-14: `sub-fm` Dashboard, Journal, Paths, Chat — no Upgrade/Start Pro/past-due banners. Gate returns null for enterprise. No dedicated `/results` route (dashboard assessment). |
| EAC-C-PAY-004 | TESTED | 2026-08-14: Pro enterprise `sub-fm`. Sleep Mastery (premium): «Upgrade required»; Upgrade Plan opens HR dialog («not included in your organization's plan. Contact your HR administrator… individual checkout is not available»). No Stripe prices. New Manager Success Plan: HR-assign copy, no Purchase add-on (OVR-038). |
| EAC-C-PAY-005 | TESTED | 2026-08-14: `sub-fm` /chat composer available, no «7 sessions» / session-limit upsell. `isFreeTierUser` false for enterprise (`bypassSessionLimit=true` via resolveUserEntitlement). |
| EAC-C-PAY-006 | TESTED | 2026-08-14: Settings tabs Profile/Security only. No upgrade, checkout, billing-portal, or Subscription copy. |
| EAC-C-PAY-007 | TESTED | 2026-08-14: authenticated `stripe-checkout` `{tier:pro, interval:month}` as `sub-fm` → 409 `{status:enterprise_covered, message:Your organization covers this subscription.}`. No Checkout URL. |
| EAC-C-PAY-008 | TESTED | 2026-08-14: `/subscription` enterprise status-only; no plan cards so no subscriptionActions. Zero upgrade/downgrade/cancel/checkout CTAs. |
| EAC-C-TIER-001 | TESTED | 2026-08-14: `sub-fm` HRONLY Pro. Enrolled Follow-Through Systems (pro) — active, Unenroll only, no checkout. Sleep Mastery (premium) blocked with HR dialog, no Stripe (PAY-004). Entitlement from enterpriseTier=pro. |
| EAC-C-TIER-002 | TESTED | 2026-08-14: flipped HRONLY Pro→Premium (no completed Acme onboarded users). `sub-fm` Sleep Mastery available→enrolled, Unenroll, no checkout. Dashboard: Premium 1:1 credit copy, no Start Premium. Org restored Pro. |
| EAC-C-TIER-003 | TESTED | 2026-08-14: `sub-fm` /journal and /dashboard (assessment/results) load; no Upgrade/Start Pro/Checkout banners (PAY-003). |
| EAC-C-TIER-004 | TESTED | 2026-08-14: New Manager Success Plan as Pro enterprise: «Ask your HR administrator to assign… Individual purchase is not available on enterprise accounts.» No Purchase add-on CTA. HR-assign access already covered Part B SP-001/002. |
| EAC-C-TIER-005 | TESTED | 2026-08-14: Pro enterprise `sub-fm` Dashboard «Download results (PDF)» allowed (no purchase CTA / no HR block). Generator threw `sanitizePdfText` TypeError (undefined.replace) — no Stripe. Premium full-report gate uses same LockedFeature HR dialog as PAY-004. |
| EAC-C-REV-001 | TESTED | 2026-08-14: HR emp-join-001 removed `eac-c-enr-001b`. Profile accountType=individual, workplaceId/enterpriseTier null, tier=free, subscribed=false. userSubscription planTier/status=free, no Stripe ids. Login: Subscription nav back. |
| EAC-C-REV-002 | TESTED | 2026-08-14: only convert-then-revoke available (`sub-p2pr-stripe-run` Stripe already canceled on EDGE-002). After HR Remove: individual, tier=free, subscribed=false. userSubscription inactive, stripeSubscriptionId null, existing stripeCustomerId leftover, no new Stripe sub (OVR-056). |
| EAC-C-REV-003 | TESTED | 2026-08-14: Admin set HRONLY isActive=false. `sub-fm` still accountType=enterprise enterpriseTier=pro. Dashboard: no Subscription nav. Org restored isActive=true, contractTier=pro, 10/12 enrolled. |
| EAC-C-PACK-001 | TESTED | 2026-08-14 retest pack: no new Path A wizard. Live `sub-fm` enterprise (HRONLY), no Subscription nav (A-PACK-004). Invite enroll covered B-PACK-001. |
| EAC-C-PACK-002 | TESTED | 2026-08-14 retest: `/join/ORGE64C` inactive → Unable to join; `/join/ORG9ADF` inactive org → Enrollment unavailable; peek valid ORG9ADF when org active. |
| EAC-C-PACK-003 | TESTED | 2026-08-14 retest: HR invite eac-b-pack001-r auto-enrolled, seats 10→11 (B-PACK-001). |
| EAC-C-PACK-004 | TESTED | 2026-08-14 retest: A-PACK-001 N+1 invite «Organization seats are full.»; `/join/ORGE64C` at cap «No seats available»; peek 409 seatsFull. |
| EAC-C-PACK-005 | TESTED | 2026-08-14 retest: A-PACK-004 Pro→Premium roster/enterpriseTier premium; employee checkout blocked. Path-gate UI not re-clicked this run (prior TIER-001/002). |
| EAC-C-PACK-006 | TESTED | 2026-08-14 retest: `sub-fm` stripe-checkout 409 enterprise_covered. `code3@test.com` `/subscription` «Your access» / «Provided by test · premium», no prices/Checkout. |
| EAC-C-PACK-007 | TESTED | 2026-08-14 retest: HR revoke frees seat (B-PACK-002). Former-employee login/paywall return not re-run (prior REV-001). |
| EAC-C-PACK-008 | TESTED | 2026-08-14 retest: A-PACK-002 deactivated code + inactive org join pages; copy tells not to continue as Free (OVR-054). |

**Result values:** `PASS` · `FAIL` · `BLOCKED` · `SKIP` · `TESTED` (при повторном прогоне — обновлять Notes).
