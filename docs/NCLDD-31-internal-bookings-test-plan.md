# План тестирования: NCLDD-31 — Internal Bookings Management System

**Спека:** [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md) (client clarifications CL-1…CL-10; gaps G1–G10 **resolved** 2026-08-27)  
**Jira:** [NCLDD-31](https://rapiddevelopers.atlassian.net/browse/NCLDD-31)  
**Overrides:** OVR-027 / **OVR-059** (Premium 1:1 credits: cost 2, signup +2, monthly +1 on 1st UTC, cap 6, refunds clamped), **OVR-060** (`groupSessionsUsedThisMonth`), OVR-045 (Pre-Coaching Brief), **OVR-061** (coach choice), **OVR-064** (two-step coach selection flow), **OVR-062** (load-based auto-assign / reassign / deactivate), **OVR-063** (TZ / Meet for group / Complete-at-end / waitlist 2h / end5m email) — `docs/product-overrides.md`  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Specialists CRUD | `/admin` → Specialists, `AdminSpecialistsTab`, `adminSpecialistsApi` (`specialist.timezone`) |
| Scheduling / availability | `/admin` → Scheduling, `AdminSchedulingTab` |
| Admin bookings | `/admin` → Bookings, `AdminBookingsTab`, `adminBookingsApi` |
| Group catalog (admin) | Bookings / group panel, `AdminGroupCatalogPanel`, `adminGroupSessionsApi` |
| User 1:1 booking | Dashboard / coaching booking UI, `OneOnOneBookingPanel`, `coachBookingApi` |
| User group booking | Group coaching UI, `groupCoachingApi` |
| Post-session form | `/coach-session/:token`, `CoachPostSessionPage`, `coach-post-session` edge |
| Credits | OVR-059 ledger / hold→redeem; Admin user detail credit adjust; `subscription-lifecycle` monthly |
| Google Meet / Calendar | `finalize-coach-booking` / `finalize-group-sessions`; reassign Calendar PATCH |
| Emails | confirmation (coach name + recipient TZ), Pre-Coaching Brief, 24h / 1h / **end5m** reminders; waitlist offer; cancel/reassign |

## How to run

- Manual / browser: `/test-list docs/NCLDD-31-internal-bookings-test-plan.md` или `/test <ID>`
- Actor Admin: Platform Admin (`isAdmin`) — Specialists / Scheduling / Bookings
- Actor User: Premium (1:1 + group), Pro (group only), Free (negatives)
- Email / Meet checks: тестовый inbox специалиста + user; Google Calendar тестового аккаунта интеграции (`GOOGLE_CALENDAR_ID`)
- Time-based: reminders / waitlist **2h** claim / Complete-at-end / monthly 1st — clock skew, scheduled jobs, или ручной invoke cron / edge

### Deploy before QA

Apply migrations `20260827140000` … `20260827210000`, then deploy edges: `coach-booking-reminders`, `coach-post-session`, `reassign-coach-booking`, `cancel-group-coaching-session`, `group-coaching-waitlist`, `subscription-lifecycle`, `finalize-group-sessions`, `finalize-coach-booking`.

---

## 1. Цели и объём

### 1.1 Цели

Проверить внутреннюю систему бронирования one-on-one и group coaching: admin-управление специалистами (вкл. IANA TZ) и слотами, пользовательский booking **с выбором коуча** (CL-9), кредиты (OVR-059: signup/accrual/cap/clamp), Google Meet/Calendar sync (**1:1 и group**, CL-5), email-автоматизации (вкл. end5m, recipient TZ), post-session form без аккаунта специалиста (Completed **не** от формы; Kota на submit), отмены/refunds (UTC 24h), group capacity + monthly gate (OVR-060) + waitlist (FIFO, **2h** claim, skip used-gate), admin booking management и статусы.

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Admin Specialists / Scheduling / Bookings | Внешний Wix / legacy scheduler parity |
| User 1:1 coach roster + book-again (CL-9 / G7 fallback) | Coach Workspace Phase 3 (полноценный login специалиста) |
| Credits hold/redeem/refund + signup/monthly/cap (OVR-059) | Stripe checkout / subscription billing (кроме entitlement gate + `effective_user_tier` on 1st) |
| Google Calendar event + Meet create/cancel/reassign; **group Meet** | Нагрузочное тестирование Meet API quota |
| Confirmation, Pre-Coaching Brief, 24h/1h/end5m (email only) | In-app / push for end5m; полный content QA тона Kota's Read |
| Post-session form по token; Kota `chat_session_memory` on submit | Специалист как platform user / SSO |
| Group sessions, capacity, waitlist 2h claim, monthly gate + cancel rules | Платные group add-ons ($97) — снято OVR-028 |
| Admin filters, reassign (CL-3), credit adjust, form pending | Mobile native apps; group Complete-at-end / group end5m |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-059…063**, OVR-045  
3. [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md) (CL-1…CL-10)  
4. Bubble / Lovable / migration specs

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| Standard slot | **30 minutes** (duration configurable в admin scheduling) |
| 1:1 credits (OVR-059 / CL-1) | Cost **2**; signup **+2** once; monthly **+1** on 1st UTC if `effective_user_tier = premium`; **cap 6**; cancel ≥24h refund **clamped** so balance never exceeds 6; credits never for group |
| Specialist identity (user 1:1) | Coach **visible and selectable**; book-again for last coach; name in confirm email + history (CL-9). If last coach inactive / no slots → full roster, no dead CTA (G7) |
| Auto-assign (CL-2) | Only non–user-selected paths: lowest monthly load, then random; admin override anytime |
| Specialist accounts | Специалистам **не** нужны platform login |
| Specialist TZ (G1) | Admin-editable IANA `specialist.timezone`; empty → UTC in coach-facing mail |
| User TZ (G2) | User-facing emails use `profiles.timeZone`; empty → UTC; slots UI = device-local |
| Cancel ≥24h before | Full credit refund (capped); 24h rule computed in **UTC**, deadline **displayed** in user local TZ |
| Cancel &lt;24h before | No credit refund |
| Waitlist claim window | **2 hours** after promotion; cascade to next (CL-8). Supersedes prior 24h claim |
| Group monthly gate (OVR-060) | `groupSessionsUsedThisMonth` 0/1; blocked copy with next-available date; user cancel ≥24h → 0; &lt;24h → stays 1 (spot still frees); admin full cancel → 0 for all + notify; waitlist promote **skips** counter=1 (G6) |
| Group Meet (CL-5 / G8) | Unique Meet at creation; service-account calendar owns events; group has **no** Calendar attendees |
| Status UI labels | `confirmed` → **Scheduled**; **Completed** at scheduled **end** (not form submit); Form Pending\|Submitted separate; Canceled / Waitlisted |
| End warning (G3) | **5 min** before end: **email only** to **user** (not coach) |
| Deactivate coach (CL-10) | Blocked while upcoming sessions; exact warning copy; no auto-reassign/cancel |
| Kota on form (G9) | Append `human-coach:{bookingId}` into `chat_session_memory`; stamp `postSessionKotaSyncedAt`; does not regenerate Pre-Coaching Brief |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Admin | `/admin` → Specialists, Scheduling, Bookings |
| User booking | Dashboard Human coaching / booking panel |
| Post-session | `/coach-session/{token}` (link из email / Admin Bookings) |
| Edge / jobs | booking confirm, Meet create/cancel, mailers, reminders, waitlist offer/expire, `coach-post-session`, `subscription-lifecycle` (1st UTC) |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Platform Admin | Admin seed / `isAdmin` | CRUD specialists, availability, bookings, credits |
| Premium user | `sub-premium@test.com` | 1:1 + group; credits (ledger may be dirty — holds/admin) |
| Premium signup-grant (BK-CREDIT-001) | `bk-credit-001@test.com` | Clean `signup_grant` +2; seed: `scripts/seed_single_premium_user.mjs` |
| Pro user | `sub-pro@test.com` | Group only; 1:1 locked |
| Free user | `sub-free@test.com` | Negatives: нет 1:1 / group entitlement |
| Second Premium | отдельный Premium | Race: двойной booking одного слота; waitlist claim race |
| Specialist (email only) | `coach-qa-{n}@test.com` | Inbox: confirm, brief, reminders, post-session link; set distinct IANA TZ |

Password для seed QA users: `qwerty123` (если применимо).

### 2.3 Минимальные данные для прогона

1. ≥2 **active** specialists с разными email, bio и **IANA timezone**; ≥1 **inactive**.  
2. Availability: несколько дат/слотов 30 min; хотя бы один overlapping attempt; слоты в окнах &gt;24h и &lt;24h от now (UTC).  
3. Premium с известным credit balance (0 / 1 / 2 / 5 / 6) для cap и insufficient cases; Admin manual grant ready.  
4. ≥1 upcoming group session с capacity **2** (для fill → waitlist).  
5. Доступ к тестовому Google Calendar / Meet интеграционному аккаунту.  
6. Возможность читать письма user + specialist (или mail trap / logs); user `profiles.timeZone` set ≠ coach TZ для CL-4 checks.

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + Admin UI inventory | 20–30 мин | BK-ACCESS-*, BK-UI-* |
| 1 | Specialists CRUD + TZ + deactivate guard | 30–45 мин | BK-SPEC-* |
| 2 | Scheduling & availability | 45–60 мин | BK-SCHED-* |
| 3 | 1:1 user booking + coach choice + credits | 60–90 мин | BK-1ON1-*, BK-CREDIT-*, BK-RULE-001–003 |
| 4 | Google Meet / Calendar (1:1 + group + reassign) | 30–45 мин | BK-GMEET-* |
| 5 | Emails + TZ + reminders + end5m | 45–90 мин | BK-EMAIL-*, BK-MAIL-END5M |
| 6 | Cancel + refund rules (+ clamp) + slot release | 45–60 мин | BK-CANCEL-* |
| 7 | Post-session form + Completed-at-end + Kota | 30–45 мин | BK-POST-*, BK-STATUS-COMPLETE-END |
| 8 | Group + monthly gate + cancel counters + waitlist 2h | 60–90 мин | BK-GROUP-*, BK-WAIT-* |
| 9 | Admin Bookings filters / statuses / exceptions | 30–45 мин | BK-ADMIN-* |
| 10 | Monthly jobs (1st UTC) + business rules smoke | 30–45 мин | BK-MONTHLY-*, BK-RULE-*, BK-PACK-* |

---

## 4. Access & UI inventory

### BK-ACCESS-001 — Non-admin не видит Admin booking areas — TESTED

| | |
|---|---|
| **Preconditions** | Non-admin logged in |
| **Steps** | Открыть `/admin` Specialists / Scheduling / Bookings (прямые URL / tab) |
| **Expected** | Доступ запрещён (guard / redirect). Admin mutations API отклонены. |

### BK-ACCESS-002 — Admin tabs доступны — TESTED

| | |
|---|---|
| **Preconditions** | Platform Admin |
| **Steps** | `/admin` → Specialists, Scheduling, Bookings |
| **Expected** | Все три раздела открываются; legacy aliases `coach_bookings` / `group_sessions` ведут в Bookings. |

### BK-UI-001 — User coaching booking entry — TESTED

| | |
|---|---|
| **Preconditions** | Premium |
| **Steps** | Dashboard / Human coaching → открыть 1:1 booking |
| **Expected** | Roster / slots by coach (CL-9); credits balance виден или понятен до confirm; slot times in **device-local** TZ. |

### BK-UI-002 — Pro: 1:1 locked, group available — TESTED

| | |
|---|---|
| **Preconditions** | Pro user |
| **Steps** | Открыть coaching booking |
| **Expected** | 1:1 недоступен (upgrade / locked). Group sessions видны в рамках OVR-060. |

---

## 5. Admin — Specialist Management (§1 / CL-10 / G1)

### BK-SPEC-001 — Create specialist (happy path) — TESTED

| | |
|---|---|
| **Preconditions** | Admin; уникальный email |
| **Steps** | Add specialist: name, email, profile image, bio/description (~2-line), availability status = active, **IANA timezone**. Save. |
| **Expected** | Специалист в списке active; поля сохранены включая timezone. Нет требования создать platform account / password. |

### BK-SPEC-002 — Edit specialist fields — TESTED

| | |
|---|---|
| **Preconditions** | Существующий specialist |
| **Steps** | Изменить name, email, image, bio, status, **timezone**. Save. |
| **Expected** | Detail/list отражают новые значения. Subsequent coach-facing emails use updated TZ (empty → UTC). |

### BK-SPEC-003 — Deactivate specialist — TESTED

| | |
|---|---|
| **Preconditions** | Active specialist **with upcoming confirmed bookings** |
| **Steps** | Attempt deactivate / mark inactive |
| **Expected** | **Blocked** with warning: `This coach has [X] upcoming sessions. Please reassign or cancel them before deactivating.` (CL-10). No auto-reassign/cancel. After bookings cleared/reassigned, deactivate succeeds; inactive coach not offered for new books. |

### BK-SPEC-004 — List active / inactive filters — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 active + ≥1 inactive |
| **Steps** | Переключить filter active / inactive / all |
| **Expected** | Списки соответствуют статусам. |

### BK-SPEC-005 — Validation — TESTED

| | |
|---|---|
| **Preconditions** | Admin на форме create/edit |
| **Steps** | (a) пустое name; (b) invalid email; (c) duplicate email если запрещено; (d) invalid IANA timezone если UI/API валидирует |
| **Expected** | Save blocked; clear errors; запись не создаётся / не портится. |

### BK-SPEC-006 — Empty specialist timezone → UTC in mail — NEW

| | |
|---|---|
| **Preconditions** | Specialist with empty `timezone`; confirmed 1:1 |
| **Steps** | Trigger specialist confirmation / reminder email |
| **Expected** | Coach-facing times rendered as **UTC** (G1 fallback). |

---

## 6. Admin — Scheduling & Availability (§2 / CL-9)

### BK-SCHED-001 — Create availability slots — TESTED

| | |
|---|---|
| **Preconditions** | Active specialist |
| **Steps** | Select specialist → define date(s), time slots, duration (default 30). Save. |
| **Expected** | Слоты видны в scheduling UI со статусом available. |

### BK-SCHED-002 — Edit / remove availability — TESTED

| | |
|---|---|
| **Preconditions** | Unbooked availability |
| **Steps** | Edit time/duration; remove a free slot |
| **Expected** | Изменения сохраняются; удалённый слот исчезает из user calendar. |

### BK-SCHED-003 — Overlap prevention (same specialist) — TESTED

| | |
|---|---|
| **Preconditions** | Specialist с существующим slot 10:00–10:30 |
| **Steps** | Попытаться создать overlapping slot (10:15–10:45) для того же специалиста |
| **Expected** | Создание отклонено / blocked; clear error. Overlap с booking тоже запрещён. |

### BK-SCHED-004 — Slot status: available / booked / unavailable — TESTED

| | |
|---|---|
| **Preconditions** | Один free slot; один booked; specialist inactive или past slot |
| **Steps** | Просмотреть scheduling UI и/или booking calendar |
| **Expected** | Статусы различимы: available, booked, unavailable. |

### BK-SCHED-005 — Configurable duration — TESTED

| | |
|---|---|
| **Preconditions** | Admin scheduling |
| **Steps** | Создать слот не только 30 min (если UI позволяет), убедиться default = 30 |
| **Expected** | Duration сохраняется; user confirmation / Meet event используют эту duration. |

### BK-SCHED-006 — View scheduled sessions alongside availability — TESTED

| | |
|---|---|
| **Preconditions** | ≥1 confirmed booking для специалиста |
| **Steps** | Open Scheduling для этого специалиста |
| **Expected** | Видны existing bookings / scheduled sessions рядом с availability. |

### BK-SCHED-007 — Inactive specialist cannot be scheduled for new availability (policy) — TESTED

| | |
|---|---|
| **Preconditions** | Inactive specialist |
| **Steps** | Попытаться добавить новые availability slots |
| **Expected** | Blocked или specialist отсутствует в selector для новых slots. |

### BK-SCHED-008 — User calendar is per-coach (not anonymized) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | ≥2 coaches with free slots |
| **Steps** | Open user 1:1 booking UI |
| **Expected** | Availability shown **per selected coach** / roster (CL-9) — not a fully anonymized consolidated calendar that hides coaches. |

---

## 7. User Flow — One-on-One Booking (§3) + CL-1 / CL-9

### BK-1ON1-001 — Two-step coach selection + roster (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | ≥2 active specialists с free slots; Premium с credits |
| **Steps** | Открыть 1:1 booking на step 1 |
| **Expected** | **No calendar on step 1.** Full roster visible (name, photo, short bio). Each coach has **View profile** (Sheet with full bio) and **Select coach**. No coach pre-selected. |

### BK-1ON1-001a — Rebook with previous coach(s) (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | Premium с ≥1 completed or past occurred 1:1; optional ≥2 distinct past coaches |
| **Steps** | Open 1:1 booking |
| **Expected** | Section **Rebook with previous coach** lists past coaches (most recent first). Available coach → **Rebook with [Name]** → step 2 slots for that coach only. **Choose another coach** opens full roster. |

### BK-1ON1-001b — Previous coach unavailable message (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | Premium with prior 1:1 coach A; A inactive **or** A has no free slots; other coaches have slots |
| **Steps** | Open 1:1 booking |
| **Expected** | A still listed in rebook section with message *isn't available* / *no open times*; **Rebook** CTA hidden for A. **Choose another coach** + full roster work. No dead-end. |

### BK-1ON1-001c — Legacy CL-9 roster smoke — TESTED

| | |
|---|---|
| **Preconditions** | ≥2 active specialists с free slots; Premium с credits; optional prior 1:1 with coach A |
| **Steps** | Select coach → step 2 → confirm |
| **Expected** | Coach name in confirmation email + user history after book. |

### BK-1ON1-002 — Happy path book + credit deduct + assign — TESTED

| | |
|---|---|
| **Preconditions** | Premium ≥2 credits; free slot &gt;24h UTC; coach selected |
| **Steps** | Select coach + slot → confirm. Проверить credits, booking history, Admin Bookings, confirmation email. |
| **Expected** | Booking confirmed. Credits deduct **2**. Coach name in confirmation email + user history. Booking in Admin. |

### BK-1ON1-003 — Insufficient credits — TESTED

| | |
|---|---|
| **Preconditions** | Premium с 0 или 1 credit |
| **Steps** | Попытаться забронировать 30-min slot |
| **Expected** | Booking не создаётся; credits не уходят в отрицательный баланс; понятное сообщение. |

### BK-1ON1-004 — Slot already taken (race / stale UI) — TESTED

| | |
|---|---|
| **Preconditions** | Два Premium; один free slot |
| **Steps** | User A и User B почти одновременно confirm один slot (или B confirm после A) |
| **Expected** | Только один confirmed booking. Второй получает failure; его credits **не** deducted (или hold released). Rule: slot not double-booked; re-verify availability before confirm. |

### BK-1ON1-005 — Admin reassign specialist (CL-3) — TESTED

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 booking |
| **Steps** | Admin Bookings → reassign specialist |
| **Expected** | Assigned specialist updated; Google Calendar attendees patched (member + new coach); previous coach notified (removed); new coach invited + Pre-Coaching Brief **resent**; user notified of coach change. |

### BK-1ON1-006 — Free / Pro cannot book 1:1 — TESTED

| | |
|---|---|
| **Preconditions** | Free и Pro users |
| **Steps** | Попытка 1:1 book UI / API |
| **Expected** | Locked / rejected; слот остаётся available. |

### BK-1ON1-007 — Credits only after successful confirm — TESTED

| | |
|---|---|
| **Preconditions** | Premium; провоцируемый failure после select (например, force unavailable) |
| **Steps** | Confirm на слот, который сервер отклоняет |
| **Expected** | Нет permanent redeem; balance restored / hold released. Booking не в Scheduled. |

### BK-1ON1-008 — Auto-assign path: lowest monthly load (CL-2) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Path that still auto-assigns (e.g. confirm without `p_specialist_id` / `pick_specialist_for_one_on_one_slot`); two coaches available; coach A has fewer sessions this calendar month than B |
| **Steps** | Trigger auto-assign booking |
| **Expected** | Coach A preferred. On equal load, assignment is random among ties. Admin can later override. |

### BK-1ON1-009 — Match me with a coach (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | Premium с credits; ≥1 merged slot across active coaches |
| **Steps** | Step 1 → **Match me with a coach** → pick slot → confirm |
| **Expected** | Merged slot calendar (no coach name pre-confirm). Confirm uses auto-assign (CL-2). Success shows assigned coach name. |

### BK-1ON1-010 — View profile Sheet (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | BK-1ON1-001 |
| **Steps** | **View profile** on a coach → **Book with [Name]** |
| **Expected** | Sheet shows photo + full bio. Booking continues to step 2 for that coach. |

### BK-1ON1-011 — Inline slot/coach conflict (OVR-064) — NEW

| | |
|---|---|
| **Preconditions** | Stale slot or deactivated coach at confirm |
| **Steps** | Confirm after slot taken or coach unavailable |
| **Expected** | Inline alert (not toast-only) with **Pick another time** or **Choose another coach**. Credits not permanently deducted. User can continue booking. |

---

## 8. Credits wallet (CL-1 / OVR-059 / G4 / G5)

### BK-CREDIT-001 — Premium signup grant +2 — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Fresh Premium with ledger `signup_grant` (+2). **Do not** use `sub-premium@test.com` / `bk-w2` (legacy accrual/holds/admin). Seed: `SEED_EMAIL=bk-credit-001@test.com SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed_single_premium_user.mjs` (password `qwerty123`). Or real Stripe Premium checkout. Admin credit adjust writes `adminAdjustment` — **not** valid for this case. |
| **Steps** | Admin → user detail (or user subscription/credits UI): inspect available credits + ledger after Premium entitlement starts |
| **Expected** | Balance includes **+2** `signup_grant` once; first session effectively free (cost 2). |

### BK-CREDIT-002 — Monthly accrual +1 on 1st UTC — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium with balance &lt; 6; `effective_user_tier = premium` (e.g. `bk-credit-001@test.com`). **Mid-month QA:** edge `subscription-lifecycle` always uses `now()` and skips unless UTC day = 1 — do **not** rely on cron/`x-cron-secret` alone. |
| **Steps** | Service role RPC: `SELECT public.billing_run_monthly_premium_credit_accrual('2026-09-01T00:00:00Z'::timestamptz);` (any 1st UTC; period key = `YYYY-MM`). Or wait for real 1st + invoke lifecycle with service-role Bearer. Then inspect ledger for the Premium user. |
| **Expected** | Ledger `monthly_accrual` **+1** (note/period for that month); balance +1. Re-run same `p_as_of` → duplicate/no double grant. |

### BK-CREDIT-003 — Accrual stops at cap 6 — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium with balance **6** (e.g. `bk-credit-001@test.com` via Admin grant after signup/monthly). Prior period(s) may already have `monthly_accrual`. |
| **Steps** | Mid-month: service role `SELECT public.billing_run_monthly_premium_credit_accrual('2026-10-01T00:00:00Z'::timestamptz);` (new `YYYY-MM` not yet granted for this user). Inspect that user's ledger + balance. |
| **Expected** | Balance stays **6**; **no** new `monthly_accrual` row for this user (job may report `capped` for them). Other Premium under cap may still receive +1. |

### BK-CREDIT-004 — Credits never apply to group — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium with credits; open group seat; counter = 0 |
| **Steps** | Join group session |
| **Expected** | Credit balance unchanged; only `groupSessionsUsedThisMonth` → 1. |

### BK-CREDIT-005 — Rollover across months — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium with unused credits mid-month (e.g. balance 3) |
| **Steps** | Cross month boundary without booking; run accrual if under cap |
| **Expected** | Prior credits remain; accrual adds only if under cap. |

---

## 9. Google Meet & Calendar (§4 / CL-3 / CL-5 / G8)

### BK-GMEET-001 — Event + Meet on 1:1 confirm

| | |
|---|---|
| **Preconditions** | Working Google integration; successful 1:1 book |
| **Steps** | После confirm открыть booking detail (Admin/user) и Google Calendar |
| **Expected** | Calendar event создан; **unique** Meet link; link связан с booking; date/time/duration/user/specialist корректны. Link в confirmation emails. |

### BK-GMEET-002 — Cancel syncs Calendar / Meet

| | |
|---|---|
| **Preconditions** | Confirmed booking с Meet link |
| **Steps** | User или Admin cancel booking |
| **Expected** | Booking = Canceled; Calendar event / Meet canceled or removed; platform stores canceled state; link не используется как active session. |

### BK-GMEET-003 — Event data persistence

| | |
|---|---|
| **Preconditions** | Confirmed booking |
| **Steps** | Reload Admin Bookings / user history |
| **Expected** | Meeting/event info остаётся доступна для reference (id/link/status). |

### BK-GMEET-004 — Unique Meet for group session (CL-5 / G8) — NEW

| | |
|---|---|
| **Preconditions** | Admin creates / finalizes group session; Google integration ok |
| **Steps** | Create group session → inspect Meet link + Calendar event |
| **Expected** | Unique Meet at creation. Service-account calendar owns event; group has **no** Calendar attendees (Meet via platform). Different group sessions → different Meet links. |

### BK-GMEET-005 — Reassign patches Calendar attendees (CL-3) — NEW

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 with Calendar event |
| **Steps** | Admin reassigns coach |
| **Expected** | Event attendees updated to member + new coach; previous coach removed from event. |

---

## 10. Email Notifications & Automations (§5 / CL-3 / CL-4 / CL-7 / CL-9)

### BK-EMAIL-001 — User confirmation contents

| | |
|---|---|
| **Preconditions** | Successful 1:1 book; user `profiles.timeZone` set (non-UTC) |
| **Steps** | Проверить email пользователя |
| **Expected** | Date/time in **user local TZ**; duration; Meet link; confirmation details; **coach name** (CL-9). |

### BK-EMAIL-002 — Specialist confirmation contents

| | |
|---|---|
| **Preconditions** | Same booking; specialist.timezone set ≠ user TZ |
| **Steps** | Проверить email assigned specialist |
| **Expected** | User name / relevant user info; date/time in **coach local TZ**; Meet link; coaching info as designed. |

### BK-EMAIL-003 — Pre-Coaching Brief immediately after booking

| | |
|---|---|
| **Preconditions** | Successful book; OVR-045 path (Kota's Read / brief) |
| **Steps** | Проверить specialist inbox сразу после booking |
| **Expected** | Pre-Coaching Brief доставлен (или queued visibly); содержит prep info. Fallback inbox / `assignedCoachEmail` per OVR-045 если применимо. |

### BK-EMAIL-004 — Reminder 24h before

| | |
|---|---|
| **Preconditions** | Booking scheduled ~25h out; reminder job runnable |
| **Steps** | Advance time / run reminder job |
| **Expected** | User + specialist получают 24h reminder (times in respective recipient TZ). |

### BK-EMAIL-005 — Reminder 1h before

| | |
|---|---|
| **Preconditions** | Booking ~1h out |
| **Steps** | Run reminder job |
| **Expected** | User + specialist получают 1h reminder. |

### BK-EMAIL-006 — No reminders after cancel

| | |
|---|---|
| **Preconditions** | Booking canceled before reminder windows |
| **Steps** | Run 24h, 1h, and end5m reminder jobs for that booking id |
| **Expected** | Reminder emails **не** отправляются. |

### BK-EMAIL-007 — No duplicate storm (smoke)

| | |
|---|---|
| **Preconditions** | Same booking; job run twice |
| **Steps** | Invoke reminder job twice for same window |
| **Expected** | Не более одного reminder per recipient per window (idempotent). |

### BK-EMAIL-008 — Reassignment notification bundle (CL-3) — NEW

| | |
|---|---|
| **Preconditions** | Confirmed 1:1; reassign to new coach |
| **Steps** | Complete reassign; check previous coach, new coach, user inboxes |
| **Expected** | Previous: removed notification. New: invitation + notification + Pre-Coaching Brief. User: coach updated. |

### BK-EMAIL-009 — Waitlist offer times in user TZ — NEW

| | |
|---|---|
| **Preconditions** | Waitlisted user with `profiles.timeZone` set; spot freed → offer |
| **Steps** | Inspect waitlist offer email |
| **Expected** | Session times shown in member’s local TZ (CL-4). |

### BK-MAIL-END5M — 5-minute end warning email (G3 / CL-7) — NEW

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 ending in ~3–8 minutes; `endWarning5mSentAt` null; SendGrid optional |
| **Steps** | Invoke `coach-booking-reminders` |
| **Expected** | User receives (or soft-skip stamps) one end-warning **email**; coach does **not**; stamp set; cancelled bookings skipped. No in-app/push required in this slice. |

---

## 11. Post-Session Coach Form (§6 / CL-7 / G9)

### BK-POST-001 — Submit notes without platform account — TESTED

| | |
|---|---|
| **Preconditions** | Confirmed/past session; valid token link `/coach-session/:token` |
| **Steps** | Открыть link logged-out; identify session; add notes; submit |
| **Expected** | Submit успешен без login специалиста. Notes связаны с booking; видны в user session history и Admin. |

### BK-POST-002 — Form submit does not gate Completed (CL-7) — TESTED

| | |
|---|---|
| **Preconditions** | Booking still `confirmed` (before end) or already `completed` by end sweeper; form not yet submitted |
| **Steps** | Submit post-session form with notes |
| **Expected** | Notes stored; `postSessionSubmittedAt` set; Admin shows **Form: Submitted**. Status is **not** set to Completed by submit alone (Completed comes from end-time sweeper). |

### BK-POST-003 — Unauthorized token / other session — TESTED

| | |
|---|---|
| **Preconditions** | Valid token A для booking A; booking B другого user |
| **Steps** | (a) invalid/expired token; (b) попытка открыть/изменить чужую сессию |
| **Expected** | Access denied; нет PII другого user. |

### BK-POST-004 — Empty notes validation — TESTED

| | |
|---|---|
| **Preconditions** | Valid post-session page |
| **Steps** | Submit без notes |
| **Expected** | Blocked; notes not stored; form remains Pending. |

### BK-POST-005 — Admin can open / copy post-session link — TESTED

| | |
|---|---|
| **Preconditions** | Admin Bookings expand panel |
| **Steps** | Открыть / скопировать post-session form link |
| **Expected** | Link работает; ведёт на ту же сессию. Form Pending vs Submitted visible for 1:1. |

### BK-POST-006 — Kota memory on form submit (G9) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Successful form submit for member with profile |
| **Steps** | Submit notes; inspect `profiles.onboardingData.chat_session_memory` and booking stamps |
| **Expected** | Record `human-coach:{bookingId}` appended (last-5 ring); `postSessionKotaSyncedAt` stamped. Does **not** regenerate Pre-Coaching Brief. |

### BK-STATUS-COMPLETE-END — Completed at scheduled end (CL-7) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 whose `scheduledAt + duration` is in the past; form not submitted |
| **Steps** | Prefer service role RPC: `SELECT public.complete_ended_coach_bookings();` (returns count updated). Or `POST /functions/v1/coach-booking-reminders` with **Bearer service role** (tmp/`x-cron-secret` alone often 401 if vault secret ≠ local guess). |
| **Expected** | Status → **completed**; `completedAt` set; form still **Pending** (`postSessionSubmittedAt` null). |

---

## 12. Cancellations & Credit Refunds (§7 / CL-1 / CL-4 / G5)

### BK-CANCEL-001 — User cancel ≥24h → full refund — TESTED

| | |
|---|---|
| **Preconditions** | Scheduled 1:1 &gt;24h away (**UTC**); credits redeemed; balance will stay ≤6 after +2 |
| **Steps** | User cancels from platform |
| **Expected** | Status **Canceled**; Meet/Calendar canceled; slot available again; **+2** credit refund; ledger/history отражает refund. Deadline display (if shown) in user local TZ. |

### BK-CANCEL-002 — User cancel &lt;24h → no refund — TESTED

| | |
|---|---|
| **Preconditions** | Scheduled 1:1 &lt;24h away (UTC) |
| **Steps** | User cancels |
| **Expected** | Status Canceled; slot freed; **no** credit refund; Meet canceled. |

### BK-CANCEL-003 — Freed slot rebookable — TESTED

| | |
|---|---|
| **Preconditions** | After BK-CANCEL-001 |
| **Steps** | Другой Premium бронирует тот же time slot |
| **Expected** | Booking succeeds; new assign / Meet / emails. |

### BK-CANCEL-004 — Admin manual credit add/remove/correct — TESTED

| | |
|---|---|
| **Preconditions** | Admin; target user |
| **Steps** | Via User Detail / Bookings exception flows: add credits, remove credits, correct/refund |
| **Expected** | Balance updates; каждая adjustment в transaction/history log. |

### BK-CANCEL-005 — Admin cancel / exceptional correction — TESTED

| | |
|---|---|
| **Preconditions** | Problematic booking |
| **Steps** | Admin cancel / reassign / credit adjust from Bookings expand panel |
| **Expected** | State consistent: status, credits, Meet, slot availability. |

### BK-CANCEL-006 — Refund clamped at credit cap (G5) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium balance **5** after booking cost already redeemed (or engineered so uncapped +2 would exceed 6); cancel ≥24h |
| **Steps** | Cancel booking that would refund +2 |
| **Expected** | Refund **truncated** so balance never exceeds **6** (e.g. +1 only if at 5). |

### BK-CANCEL-007 — 24h window uses UTC, display local — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Booking near 24h boundary; user TZ ≠ UTC |
| **Steps** | Cancel just inside / outside 24h measured in UTC; observe any UI deadline copy |
| **Expected** | Refund eligibility matches **UTC** calculation; any displayed deadline is in **user local TZ**. |

---

## 13. Group Coaching (§8 / CL-1 / CL-5 / CL-6)

### BK-GROUP-001 — Admin create group session — TESTED

| | |
|---|---|
| **Preconditions** | Admin |
| **Steps** | Create group session: title, description, date/time, duration, max capacity, recurring schedule if supported |
| **Expected** | Session в catalog; fields saved; visible to eligible users; unique Meet created (see BK-GMEET-004). |

### BK-GROUP-002 — Admin view participants / cancel session — TESTED

| | |
|---|---|
| **Preconditions** | Group session с ≥1 registration (and ideally waitlisted) |
| **Steps** | View participants; cancel entire session |
| **Expected** | Participant list accurate; enrollments cancelled; registered/offered users’ `groupSessionsUsedThisMonth` reset to **0**; **all enrolled** receive cancel email (CL-6). |

### BK-GROUP-003 — User join when seats available — TESTED

| | |
|---|---|
| **Preconditions** | Pro/Premium; capacity remaining; `groupSessionsUsedThisMonth = 0` |
| **Steps** | View session (title, description, date, time, capacity) → Join |
| **Expected** | Registered; counter → **1**; capacity decrements; session in user history; status **Scheduled**; credits unchanged. |

### BK-GROUP-004 — Monthly group cap (OVR-060) — TESTED

| | |
|---|---|
| **Preconditions** | User already used group this month (`groupSessionsUsedThisMonth = 1`) |
| **Steps** | Attempt join second group session same calendar month |
| **Expected** | Rejected with copy: `You've used your included group session for this month. Your next session is available on [date].`; capacity unchanged. |

### BK-GROUP-005 — Free cannot join group — TESTED

| | |
|---|---|
| **Preconditions** | Free user; open seats |
| **Steps** | Attempt join |
| **Expected** | Locked / rejected. |

### BK-GROUP-006 — Recurring schedule creates expected occurrences — TESTED

| | |
|---|---|
| **Preconditions** | Admin configures recurring group |
| **Steps** | Save recurring rule; inspect upcoming occurrences |
| **Expected** | Occurrences match schedule; each has own capacity/participants and unique Meet as designed. |

### BK-GROUP-007 — User cancel ≥24h resets monthly counter (CL-6) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Registered group; session &gt;24h away; counter = 1 |
| **Steps** | User cancels |
| **Expected** | Counter → **0**; spot opens; waitlist promoted if any; user may book another group this month. |

### BK-GROUP-008 — User cancel &lt;24h keeps counter at 1 (CL-6) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Registered group; session &lt;24h away; counter = 1 |
| **Steps** | User cancels |
| **Expected** | Counter **stays at 1**; spot still opens; waitlist still promoted; no further penalty beyond lost monthly seat. |

---

## 14. Group Waitlist (§9 / CL-8 / G6)

### BK-WAIT-001 — Full session → Join hidden, waitlist available — TESTED

| | |
|---|---|
| **Preconditions** | Capacity filled |
| **Steps** | User opens session |
| **Expected** | **Join Session** unavailable; **Join waitlist** available. Waitlist join does **not** set counter to 1. |

### BK-WAIT-002 — FIFO waitlist order — TESTED

| | |
|---|---|
| **Preconditions** | Full session; users W1 then W2 join waitlist |
| **Steps** | Record join order; one registrant cancels |
| **Expected** | Offer/notification goes to **W1 first** (FIFO), if W1 eligible (counter ≠ 1). |

### BK-WAIT-003 — Notify next waitlisted + claim within 2h — TESTED

| | |
|---|---|
| **Preconditions** | Spot freed; W1 offered; W1 counter = 0 |
| **Steps** | W1 receives notify (times in user TZ); claims spot via platform within **2 hours** |
| **Expected** | W1 becomes registered (**Scheduled**); waitlist updated; capacity correct; counter → 1 on claim. |

### BK-WAIT-004 — Claim window expiry (2h) — TESTED

| | |
|---|---|
| **Preconditions** | Offer to W1 with `claimExpiresAt` = now+**2h** |
| **Steps** | Let offer expire without claim (time travel / `group-coaching-waitlist` job) |
| **Expected** | Offer expires; next eligible (W2) notified; W1 cannot claim after expiry. |

### BK-WAIT-005 — Claim race: one spot — TESTED

| | |
|---|---|
| **Preconditions** | One freed seat; two clients try claim (or stale offer) |
| **Steps** | Concurrent claim attempts |
| **Expected** | Exactly one success; loser gets clear failure; no double registration. |

### BK-WAIT-006 — Status Waitlisted visible in Admin + user history — TESTED

| | |
|---|---|
| **Preconditions** | User on waitlist |
| **Steps** | Check user history + Admin Bookings filters |
| **Expected** | Status **Waitlisted**; filters by status work. |

### BK-WAIT-007 — Skip promote when candidate monthly gate used (G6) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Full session; waitlist W1 (counter = 1) then W2 (counter = 0); registrant cancels |
| **Steps** | Run promote / waitlist job |
| **Expected** | W1 waitlist row cancelled/skipped; offer goes to **W2**; W1 not left holding an unclaimable offer. |

---

## 15. Admin Booking Management (§10 / CL-2 / CL-3 / CL-7)

### BK-ADMIN-001 — Columns / fields present — TESTED

| | |
|---|---|
| **Preconditions** | Mix of 1:1 and group bookings |
| **Steps** | Open Admin Bookings list / expand |
| **Expected** | User name; session type; specialist; date/time; duration; status; **Form: Pending|Submitted** (1:1); credit/refund status; Meet link; notes/history; group participants. |

### BK-ADMIN-002 — Filters & search — TESTED

| | |
|---|---|
| **Preconditions** | Diverse bookings |
| **Steps** | Filter/search by date, user, specialist, session type, status |
| **Expected** | Results match criteria; empty state when no match. |

### BK-ADMIN-003 — Status label mapping — TESTED

| | |
|---|---|
| **Preconditions** | Rows with DB `confirmed`, completed, canceled, waitlisted |
| **Steps** | Inspect UI labels |
| **Expected** | `confirmed` → **Scheduled**; **Completed** after end-time sweeper (independent of form); Form Pending|Submitted separate; Canceled / Waitlisted. Auto-updates on cancel / end / waitlist events. |

### BK-ADMIN-004 — Exceptional case toolkit — TESTED

| | |
|---|---|
| **Preconditions** | Admin on Bookings expand |
| **Steps** | Cancel, reassign specialist, open credit adjust (User Detail), post-session link |
| **Expected** | Flows reachable and consistent with §§3,6,7 and CL-3 side effects. |

---

## 16. Monthly jobs (G4 / G10 / OVR-059 / OVR-060)

### BK-MONTHLY-001 — Premium credit + group counter on 1st UTC — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Premium with balance &lt; 6 and `groupSessionsUsedThisMonth = 1`; Pro/Premium with counter = 1. Mid-month: edge lifecycle/`x-cron-secret` alone will skip or 401. |
| **Steps** | Service role RPCs (any 1st UTC dates not yet applied): `SELECT public.billing_run_monthly_premium_credit_accrual('2026-11-01T00:00:00Z'::timestamptz);` then `SELECT public.reset_group_sessions_used_this_month('2026-09-01T00:00:00Z'::timestamptz);` (or real 1st + lifecycle with Bearer service role). |
| **Expected** | Premium under cap: +1 `monthly_accrual` for that period. Profiles with counter ≠ 0: `groupSessionsUsedThisMonth` → **0** (`resetCount` in RPC result). |

### BK-MONTHLY-002 — Waitlist expire/promote cadence — NEW — TESTED

| | |
|---|---|
| **Preconditions** | Session with `offered` claim + ≥1 `waitlisted` behind it. Mid-month: backdate `claimExpiresAt` via service role if window not expired yet. |
| **Steps** | Service role: expire offer (`claimExpiresAt = now() - 1 minute`), ensure next waitlisted exists, then `SELECT public.process_group_coaching_waitlist();` (or edge `group-coaching-waitlist` with Bearer service role — cron secret alone often 401). |
| **Expected** | Expired offer → **cancelled**; next eligible waitlisted → **offered** (new `claimExpiresAt`). |

---

## 17. Cross-cutting business rules pack (§ Key Business Rules 1–19)

### BK-RULE-001 — No double-book same slot — TESTED

| | |
|---|---|
| **Preconditions** | See BK-1ON1-004 |
| **Steps** | Concurrent book |
| **Expected** | Exactly one winner. |

### BK-RULE-002 — Availability re-check at confirm — TESTED

| | |
|---|---|
| **Preconditions** | UI shows stale available slot |
| **Steps** | Confirm after admin removed slot / other user booked |
| **Expected** | Confirm fails safely. |

### BK-RULE-003 — Deduct credits only on success — TESTED

| | |
|---|---|
| **Preconditions** | See BK-1ON1-007 |
| **Steps** | Failed confirm |
| **Expected** | No permanent deduction. |

### BK-RULE-004 — Canceled → no future reminders

| | |
|---|---|
| **Preconditions** | See BK-EMAIL-006 |
| **Steps** | Reminder jobs |
| **Expected** | No mail. |

### BK-RULE-005 — Meet/Calendar sync with status

| | |
|---|---|
| **Preconditions** | Confirm then cancel |
| **Steps** | Check Calendar |
| **Expected** | Create on confirm; cancel on cancel. |

### BK-RULE-006 — Specialists need no platform accounts — TESTED

| | |
|---|---|
| **Preconditions** | Specialist email-only |
| **Steps** | Full lifecycle: notify → brief → post-session form |
| **Expected** | No login required for specialist actions. |

### BK-RULE-007 — Coach names visible in user 1:1 picker (CL-9) — TESTED

| | |
|---|---|
| **Preconditions** | BK-1ON1-001 |
| **Steps** | Inspect UI |
| **Expected** | Coach names (and roster / book-again) visible at selection; name in history after book. |

### BK-RULE-008 — Group capacity enforced — TESTED

| | |
|---|---|
| **Preconditions** | Capacity N |
| **Steps** | N+1 join attempts |
| **Expected** | Only N registered; extras waitlist or rejected. |

### BK-RULE-009 — Waitlist notify on free seat — TESTED

| | |
|---|---|
| **Preconditions** | BK-WAIT-002/003 |
| **Steps** | Cancel registrant |
| **Expected** | Next eligible waitlisted notified. |

### BK-RULE-010 — Completed notes in history + admin — TESTED

| | |
|---|---|
| **Preconditions** | BK-POST-001/002 |
| **Steps** | User history + Admin |
| **Expected** | Notes visible to authorized admin and in user session history. |

### BK-RULE-011 — Unique Meet for 1:1 and group (CL-5) — NEW

| | |
|---|---|
| **Preconditions** | BK-GMEET-001 + BK-GMEET-004 |
| **Steps** | Compare Meet links across sessions |
| **Expected** | Each session has its own Meet link at creation. |

### BK-RULE-012 — Deactivate blocked with upcoming sessions (CL-10) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | BK-SPEC-003 |
| **Steps** | Attempt deactivate |
| **Expected** | Blocked with exact warning copy. |

### BK-RULE-013 — Waitlist claim window is 2h (CL-8) — NEW — TESTED

| | |
|---|---|
| **Preconditions** | BK-WAIT-003/004 |
| **Steps** | Claim / expire |
| **Expected** | Window = **2 hours** (not 24h). |

### BK-PACK-001 — Smoke E2E 1:1 (happy) — TESTED

| | |
|---|---|
| **Preconditions** | Admin specialist + slot; Premium credits; mail + Meet ok |
| **Steps** | Book (chosen coach) → emails/brief (coach name + TZ) → Admin sees Scheduled → cancel ≥24h → refund + Meet cancel → rebook |
| **Expected** | Full chain green. |

### BK-PACK-002 — Smoke E2E group + waitlist — TESTED

| | |
|---|---|
| **Preconditions** | Capacity 1; two eligible users (counter = 0) |
| **Steps** | U1 join → U2 waitlist → U1 cancel ≥24h → U2 claim within **2h** |
| **Expected** | U2 registered; U1 counter reset; statuses correct; no double seat. |

---

## 18. Known dependencies / blockers

| Dependency | Impact if missing |
|---|---|
| Google Calendar/Meet credentials | BK-GMEET-* / email Meet link = BLOCKED or mock-only |
| Email delivery (SendGrid / trap) | BK-EMAIL-* / BK-MAIL-END5M evidence via logs only |
| Reminder / waitlist / lifecycle cron | Time-based + monthly cases need manual invoke or clock control |
| Premium credit seed / Admin grant | 1:1 happy path blocked |
| Migrations `20260827140000`…`20260827210000` + edges listed above | CL/G cases fail against stale deploy |
| OVR-059 / OVR-060 | Do **not** test against Phase 2 Wix $97 / “included 1:1” / 24h waitlist claim |

**Product gaps:** CL-1…CL-10 and G1–G10 are **closed** in the management-system doc. Remaining work is **ops deploy + QA**, not missing product rules.

---

## 19. Traceability matrix (requirements → cases)

| Spec section | Case IDs |
|---|---|
| CL-1 Credits / group gate | BK-CREDIT-001…005, BK-1ON1-002/003/006/007, BK-CANCEL-001/002/006, BK-GROUP-003…005/007/008, BK-MONTHLY-001 |
| CL-2 Auto-assign | BK-1ON1-008 |
| CL-3 Reassignment | BK-1ON1-005, BK-GMEET-005, BK-EMAIL-008 |
| CL-4 Timezones | BK-SPEC-006, BK-UI-001, BK-EMAIL-001/002/004/009, BK-CANCEL-007 |
| CL-5 Meet 1:1 + group | BK-GMEET-001…004, BK-RULE-011 |
| CL-6 Group cancel counters | BK-GROUP-002/007/008, BK-WAIT-* |
| CL-7 Complete-at-end / end5m / form pending | BK-STATUS-COMPLETE-END, BK-MAIL-END5M, BK-POST-002/006 |
| CL-8 Waitlist 2h | BK-WAIT-003/004, BK-RULE-013, BK-PACK-002 |
| CL-9 Coach choice | BK-1ON1-001…001c, 009–011, BK-SCHED-008, BK-EMAIL-001, BK-RULE-007 |
| CL-10 Deactivate guard | BK-SPEC-003, BK-RULE-012 |
| G6 Waitlist skip used gate | BK-WAIT-007 |
| G7 Book-again fallback | BK-1ON1-001b |
| OVR-064 Two-step flow | BK-1ON1-001, 001a, 001b, 009, 010, 011 |
| G8 Group Calendar attendees | BK-GMEET-004 |
| G9 Kota sync | BK-POST-006 |
| G10 Monthly jobs | BK-MONTHLY-001/002, BK-CREDIT-002/003 |
| §1 Specialists | BK-SPEC-001…006, BK-RULE-006 |
| §2 Scheduling | BK-SCHED-001…008 |
| §3 One-on-One | BK-1ON1-001…011, BK-RULE-001…003,007 |
| §4 Google Meet | BK-GMEET-001…005, BK-RULE-005 |
| §5 Emails | BK-EMAIL-001…009, BK-MAIL-END5M, BK-RULE-004 |
| §6 Post-session | BK-POST-001…006, BK-STATUS-COMPLETE-END, BK-RULE-010 |
| §7 Cancel / refunds | BK-CANCEL-001…007 |
| §8 Group | BK-GROUP-001…008, BK-RULE-008 |
| §9 Waitlist | BK-WAIT-001…007, BK-RULE-009 |
| §10 Admin Bookings | BK-ADMIN-001…004 |
| Key Business Rules | BK-RULE-001…013, BK-PACK-001…002 |
| Access / UI | BK-ACCESS-*, BK-UI-* |

---

*Test plan for NCLDD-31 Internal Bookings Management System. Aligned to client clarifications CL-1…CL-10 and resolved gaps G1–G10 (2026-08-27).*
