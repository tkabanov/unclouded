# План тестирования: Coach selection — booking flow

**Спека:** [`docs/coach-booking-coach-selection-requirements.md`](./coach-booking-coach-selection-requirements.md)  
**Связанные:** [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md) (CL-2, CL-9); [`docs/NCLDD-31-internal-bookings-test-plan.md`](./NCLDD-31-internal-bookings-test-plan.md) (credits, admin, email — BK-*)  
**Overrides:** **OVR-027** (Premium-only 1:1), **OVR-059** (credits cost 2), **OVR-061** (coach roster + book again), **OVR-064** (two-step flow, rebook history, Match me, Sheet profile, inline conflicts), **OVR-062** (load-based auto-assign for Match me), **OVR-063** (slots UI = device-local TZ) — `docs/product-overrides.md`  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Entry | Dashboard → `BookCoachCard` → `OneOnOneBookingPanel` |
| Step 1 — coach choice | `CoachSelectionStep`, `CoachRosterCard`, `PreviousCoachCard` |
| Step 2 — slot choice | `SlotSelectionStep`, `BookingUnavailableAlert` |
| Profile | `CoachProfileSheet` (Sheet) |
| API / RPC | `coachBookingApi.ts` — `listActiveCoachesForBooking`, `listMyPreviousOneOnOneCoaches`, `listBookableOneOnOneSlots`, `listBookableOneOnOneSlotsAnyCoach`, `confirmOneOnOneBooking` |
| Migrations | `20260827150000_one_on_one_coach_choice.sql`, `20260827220000_coach_booking_selection_flow.sql` |

## How to run

- Manual / browser: `/test-list docs/coach-booking-coach-selection-test-plan.md` или `/test <ID>`
- Actor Premium: `sub-premium@test.com` (или чистый seed) — основной happy path
- Actor Pro / Free: `sub-pro@test.com`, `sub-free@test.com` — tier negatives
- Admin: `admin-qa@test.com` — seed specialists, availability, completed bookings для rebook history
- Seed / deploy: migrations `20260827150000`, `20260827220000`; ≥2 active specialists с availability; для rebook — ≥1 completed или past-occurred 1:1 у Premium user
- Credits / refund / email / admin reassign: см. BK-* в NCLDD-31 test plan (не дублировать здесь)

---

## 1. Цели и объём

### 1.1 Цели

Проверить **двухшаговый** 1:1 booking flow (OVR-064): ручной выбор coach как основной путь, rebook из истории сессий, полный roster, профиль coach (Sheet), вторичный **Match me with a coach** (CL-2 auto-assign), обработку недоступного coach/slot без тупиков. Подтвердить, что первый booking начинается со списка coach (без календаря на step 1) и что step 2 показывает слоты только выбранного coach (или anonymized merged slots для auto-match).

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Step 1 coach selection UI (roster, rebook, Match me) | Admin Specialists / Scheduling CRUD (BK-SPEC-*, BK-SCHED-*) |
| Step 2 slot picker per coach / auto-match merged | Credits wallet mechanics (BK-CREDIT-*), cap/accrual |
| Coach profile Sheet | Confirmation email content / TZ (BK-EMAIL-*) |
| Rebook from completed or past-occurred sessions | Admin reassign side effects (BK-1ON1-005) |
| Inline conflict alerts + recovery CTAs | Group coaching booking |
| Tier gate: Premium bookable, Pro/Free locked | Post-session form, reminders, Meet creation |
| `p_specialist_id` vs `null` on confirm | Load-test auto-assign tie-break randomness |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-064**, OVR-061, OVR-062, OVR-027, OVR-059, OVR-063  
3. [`docs/coach-booking-coach-selection-requirements.md`](./coach-booking-coach-selection-requirements.md)  
4. [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md) (CL-2, CL-9)  
5. Bubble / Lovable / migration specs

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| Primary path (OVR-064) | **Step 1:** choose coach → **Step 2:** pick slot. No calendar on step 1. No coach pre-selected for first-time users. |
| First-time roster | All **active** bookable coaches: name, photo, ~2-line bio, **View profile**, **Select coach**. |
| Rebook history | From **completed** or **confirmed + scheduledAt &lt; now** sessions; distinct coaches, **most recent first**. Section title: **Rebook with previous coach**. |
| Unavailable previous coach | Inline: `{Name} isn't available right now.` (inactive) or `{Name} has no open times in the next two weeks.` (no slots). **Rebook** CTA hidden. **Choose another coach** always available. |
| Browse all | **Choose another coach** opens full roster (**Choose a coach**). User can always pick a different coach. |
| Match me (secondary) | Ghost button **Match me with a coach** on step 1; disabled if roster empty. Step 2: merged anonymized slots; copy *We'll match you with an available coach for this time.* Confirm with `specialistId: null` → CL-2 (lowest monthly load, then random). |
| Profile Sheet | **View profile** → Sheet with photo, full bio, **Book with {Name}** → step 2 for that coach. |
| Conflicts | Inline `role="alert"` (not toast-only): **Choose another coach** (`specialist_unavailable`) or **Pick another time** (`slot_unavailable` / `slot_in_past`). Credits not permanently lost. |
| Slots TZ (OVR-063) | Times shown in **device-local** timezone; lookahead **14 days**. |
| 1:1 entitlement (OVR-027) | Only **Premium** with sufficient credits sees bookable coach selection. |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| User entry | Dashboard → **Human coaching** card → **Book a 1:1 session** |
| Admin setup | `/admin` → Specialists, Scheduling (availability per coach) |
| Slot window | 14-day lookahead (`SLOT_LOOKAHEAD_DAYS`) |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Premium (returning) | `sub-premium@test.com` | Rebook section, full flow |
| Premium (first-time) | fresh Premium seed без past 1:1 | Full roster only, no rebook |
| Premium (credits) | `bk-credit-001@test.com` | Clean signup grant; seed: `SEED_EMAIL=bk-credit-001@test.com node scripts/seed_single_premium_user.mjs` |
| Pro user (individual) | `csc-pro@test.com` | 1:1 locked — seed: `SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed_csc_coach_pro_user.mjs` (password `qwerty123`). **Не** использовать `sub-pro@test.com` (enterprise Premium). Interim: `sub-pro-run@test.com` |
| Free user | `sub-free@test.com` | 1:1 locked |
| Platform Admin | `admin-qa@test.com` | Specialists, slots, mark sessions completed / backdate |
| Second Premium | отдельный Premium user | Race: slot taken at confirm (CSC-CONFLICT-002) |

Password для seed QA users: `qwerty123`.

### 2.3 Минимальные данные для прогона

1. ≥2 **active** specialists (Coach A, Coach B) с distinct name, photo, bio и availability в ближайшие 14 дней.  
2. ≥1 specialist **inactive** (для CSC-REBOOK-005) или coach без free slots (CSC-REBOOK-006).  
3. Premium user **без** past 1:1 — для first-time roster (CSC-FIRST-*).  
4. Premium user с ≥1 **completed** 1:1 с Coach A; опционально второй past coach B — для rebook (CSC-REBOOK-*).  
5. Premium с **≥2 credits** (OVR-059) для confirm happy paths.  
6. Для auto-match load test (CSC-AUTO-002): два coach с разной monthly session load.

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + UI inventory | 15–20 мин | CSC-ACCESS-*, CSC-UI-* |
| 1 | First-time manual selection | 25–35 мин | CSC-FIRST-* |
| 2 | Returning user rebook | 30–40 мин | CSC-REBOOK-* |
| 3 | Profile Sheet | 10–15 мин | CSC-PROFILE-* |
| 4 | Match me (auto-assign) | 20–30 мин | CSC-AUTO-* |
| 5 | Slot step + conflicts | 30–40 мин | CSC-SLOT-*, CSC-CONFLICT-* |
| 6 | Business rules + E2E smoke | 25–35 мин | CSC-RULE-*, CSC-E2E-* |

**Полный ручной прогон:** ~2.5–3.5 часа.  
**Smoke (критичный путь):** CSC-ACCESS-003, CSC-FIRST-001, CSC-FIRST-003, CSC-REBOOK-003, CSC-PROFILE-001, CSC-AUTO-001, CSC-CONFLICT-001, CSC-E2E-001.

---

## 4. Access & UI inventory

### CSC-ACCESS-001 — Free: 1:1 coach selection недоступен — TESTED

| | |
|---|---|
| **Preconditions** | Free user (`sub-free@test.com`) |
| **Steps** | Dashboard → Human coaching → секция **Book a 1:1 session** |
| **Expected** | Нет step 1 roster / coach list. Кнопка **Book a 1:1 session** с badge **Premium** или helper text о необходимости Premium. Клик → upgrade dialog. Coach selection flow не открывается. |

### CSC-ACCESS-002 — Pro: 1:1 locked, group доступен — TESTED

| | |
|---|---|
| **Preconditions** | Individual Pro user (`csc-pro@test.com` or seeded `sub-pro-run@test.com`) |
| **Steps** | Dashboard → Human coaching |
| **Expected** | Group coaching panel доступен (OVR-060). 1:1 panel locked — нет coach roster, нет Match me. Upgrade prompt при попытке book 1:1. |

### CSC-ACCESS-003 — Premium: coach selection entry открыт — TESTED

| | |
|---|---|
| **Preconditions** | Premium с ≥2 credits; ≥1 active specialist с slots |
| **Steps** | Dashboard → Human coaching → **Book a 1:1 session** |
| **Expected** | Step 1 загружается: roster и/или rebook section; **Match me with a coach** виден (если roster не пуст). Нет Premium lock. |

### CSC-UI-001 — Human coaching card — entry point — TESTED

| | |
|---|---|
| **Preconditions** | Premium |
| **Steps** | Открыть Dashboard; найти card **Human coaching** |
| **Expected** | Card title **Human coaching**; внутри **Book a 1:1 session** с helper text о credits; ниже group section. Coach selection встроен в card (не отдельная страница). |

### CSC-UI-002 — Step 1: нет календаря, только выбор coach — TESTED

| | |
|---|---|
| **Preconditions** | Premium first-time (no past 1:1); ≥2 active coaches |
| **Steps** | Открыть 1:1 booking на step 1 |
| **Expected** | **Нет** Calendar / time picker на step 1. Видна секция **Choose a coach** со списком карточек. Каждая карточка: avatar, name, bio (line-clamp ~2), **View profile**, **Select coach**. |

### CSC-UI-003 — Match me — вторичная опция, не primary CTA — TESTED

| | |
|---|---|
| **Preconditions** | Premium; roster не пуст |
| **Steps** | Inspect step 1 layout |
| **Expected** | **Match me with a coach** — ghost/full-width secondary button **под** roster/rebook sections. Нет auto-assign как default/pre-selected path. Primary actions — **Select coach** / **Rebook with {Name}**. |

---

## 5. First-time booking — manual coach selection

### CSC-FIRST-001 — Full roster для пользователя без истории — TESTED

| | |
|---|---|
| **Preconditions** | Premium без completed/past-occurred 1:1; ≥2 active specialists |
| **Steps** | Open 1:1 booking |
| **Expected** | Сразу секция **Choose a coach** (full roster). **Нет** секции **Rebook with previous coach**. Все active coaches в списке. |

### CSC-FIRST-002 — Coach card content — TESTED

| | |
|---|---|
| **Preconditions** | Specialist с name, imageUrl, bio (≥2 строки) |
| **Steps** | Inspect coach card на step 1 |
| **Expected** | Avatar (или placeholder), **name** жирным, bio truncated ~2 lines (`line-clamp-2`). Кнопки **View profile** (outline) и **Select coach** (primary). |

### CSC-FIRST-003 — Select coach → step 2 slots только этого coach — TESTED

| | |
|---|---|
| **Preconditions** | Coach A и Coach B с slots на разные дни |
| **Steps** | Step 1 → **Select coach** на Coach A |
| **Expected** | Step 2: заголовок **{Coach A name}**; subtitle *Choose an available time (your local timezone)*. Calendar/slots reflect **only Coach A** availability (не слоты Coach B). **Back** visible. |

### CSC-FIRST-004 — Back с step 2 на step 1 — TESTED

| | |
|---|---|
| **Preconditions** | CSC-FIRST-003 in progress |
| **Steps** | Step 2 → **Back** |
| **Expected** | Возврат на step 1 coach selection. Roster/rebook state preserved. Selected slot cleared. Можно выбрать другого coach. |

### CSC-FIRST-005 — Пустой roster — TESTED

| | |
|---|---|
| **Preconditions** | Нет active specialists **или** ни у кого нет slots в 14-day window; Premium |
| **Steps** | Open 1:1 booking |
| **Expected** | Message: *No coaches are available to book right now.* **Match me with a coach** disabled. Нет dead-end crash. |

---

## 6. Returning user — Rebook with previous coach

### CSC-REBOOK-001 — Rebook section при наличии истории — TESTED

| | |
|---|---|
| **Preconditions** | Premium с ≥1 completed 1:1 с Coach A |
| **Steps** | Open 1:1 booking |
| **Expected** | Секция **Rebook with previous coach** **выше** full roster (roster скрыт по умолчанию). Coach A в списке с **Last session · {date}**. |

### CSC-REBOOK-002 — Несколько past coaches — порядок по recency — TESTED

| | |
|---|---|
| **Preconditions** | Premium с completed 1:1 с Coach A (newer) и Coach B (older) |
| **Steps** | Open rebook section |
| **Expected** | Coach A **первый**, Coach B второй (ORDER BY lastSessionAt DESC). Оба distinct. |

### CSC-REBOOK-003 — Rebook with available coach — TESTED

| | |
|---|---|
| **Preconditions** | Past coach A active + has slots |
| **Steps** | **Rebook with {Coach A}** |
| **Expected** | Step 2 opens for Coach A only. Slots load. **Confirm session** enabled after slot pick. |

### CSC-REBOOK-004 — Choose another coach → full roster — TESTED

| | |
|---|---|
| **Preconditions** | CSC-REBOOK-001 |
| **Steps** | Step 1 → **Choose another coach** |
| **Expected** | Rebook section скрыт; показана секция **Choose a coach** со всеми active coaches. Можно **Select coach** на любого. |

### CSC-REBOOK-005 — Previous coach inactive — TESTED

| | |
|---|---|
| **Preconditions** | Premium past session с Coach A; Admin deactivated Coach A |
| **Steps** | Open 1:1 booking |
| **Expected** | Coach A в rebook list с muted styling. Message: `{Coach A} isn't available right now.` **Rebook with {Coach A}** **отсутствует**. **View profile** и **Choose another coach** работают. |

### CSC-REBOOK-006 — Previous coach без open slots — TESTED

| | |
|---|---|
| **Preconditions** | Past coach A active но без availability в 14-day window; другие coaches имеют slots |
| **Steps** | Open 1:1 booking |
| **Expected** | Message: `{Coach A} has no open times in the next two weeks.` **Rebook** CTA hidden. **Choose another coach** → full roster с доступными coaches. |

### CSC-REBOOK-007 — Past occurred confirmed session учитывается — TESTED

| | |
|---|---|
| **Preconditions** | Premium с confirmed 1:1 где `scheduledAt` в прошлом, status ещё `confirmed` (не completed) |
| **Steps** | Open 1:1 booking |
| **Expected** | Coach появляется в **Rebook with previous coach** (RPC: confirmed + scheduledAt &lt; now). |

### CSC-REBOOK-008 — Upcoming confirmed session НЕ в rebook list — TESTED

| | |
|---|---|
| **Preconditions** | Premium с upcoming confirmed 1:1 (scheduledAt в будущем) |
| **Steps** | Open 1:1 booking; inspect rebook section |
| **Expected** | Coach из **upcoming** booking **не** listed в rebook. Upcoming виден в **Your 1:1 sessions** history ниже panel. |

---

## 7. Coach profile Sheet

### CSC-PROFILE-001 — View profile из roster — TESTED

| | |
|---|---|
| **Preconditions** | First-time Premium на step 1 |
| **Steps** | **View profile** на coach card |
| **Expected** | Sheet opens справа: photo, **{Name}**, subtitle *Coach profile*, **full bio** (whitespace-pre-wrap, не truncated). Footer: **Book with {Name}**. |

### CSC-PROFILE-002 — Book with {Name} из Sheet — TESTED

| | |
|---|---|
| **Preconditions** | CSC-PROFILE-001; Sheet open |
| **Steps** | **Book with {Name}** |
| **Expected** | Sheet closes. Step 2 opens для выбранного coach. Slots загружаются. |

### CSC-PROFILE-003 — View profile из rebook card — TESTED

| | |
|---|---|
| **Preconditions** | Returning Premium; rebook section visible |
| **Steps** | **View profile** на previous coach card |
| **Expected** | Same Sheet behavior. **Book with {Name}** → step 2 для that coach (если available). |

### CSC-PROFILE-004 — Coach без bio — TESTED

| | |
|---|---|
| **Preconditions** | Specialist с пустым bio |
| **Steps** | **View profile** |
| **Expected** | Sheet shows *No profile description yet.* **Book with {Name}** still works. |

---

## 8. Match me with a coach (auto-assign)

### CSC-AUTO-001 — Match me → anonymized slot calendar — TESTED

| | |
|---|---|
| **Preconditions** | Premium; ≥1 merged slot across coaches |
| **Steps** | Step 1 → **Match me with a coach** |
| **Expected** | Step 2: title **Pick a time**; copy *We'll match you with an available coach for this time.* **Нет** coach name в заголовке. Calendar shows merged availability. |

### CSC-AUTO-002 — Confirm auto-match assigns coach (CL-2) — TESTED

| | |
|---|---|
| **Preconditions** | Coach A lower monthly load than Coach B; slot available for both |
| **Steps** | Match me → pick slot → **Confirm session** |
| **Expected** | Booking succeeds. Toast includes assigned coach name. History shows coach (prefer A per CL-2). Network/RPC: `confirm_one_on_one_booking` with `p_specialist_id: null`. |

### CSC-AUTO-003 — Match me disabled при пустом roster — TESTED

| | |
|---|---|
| **Preconditions** | CSC-FIRST-005 (empty roster) |
| **Steps** | Inspect **Match me with a coach** button |
| **Expected** | Button **disabled**. |

### CSC-AUTO-004 — Back from auto-match returns to step 1 — TESTED

| | |
|---|---|
| **Preconditions** | CSC-AUTO-001 in progress |
| **Steps** | Step 2 → **Back** |
| **Expected** | Step 1 coach selection. `bookingMode` reset to manual. Можно выбрать coach manually. |

---

## 9. Slot selection step

### CSC-SLOT-001 — Slot times в device-local TZ — TESTED

| | |
|---|---|
| **Preconditions** | Premium; browser TZ ≠ UTC; coach slots seeded в UTC |
| **Steps** | Select coach → inspect slot button labels (e.g. `HH:mm · 30m`) |
| **Expected** | Times rendered в **локальном** timezone браузера (OVR-063). Subtitle confirms *your local timezone*. |

### CSC-SLOT-002 — Calendar highlights только дни со slots (14-day window) — TESTED

| | |
|---|---|
| **Preconditions** | Coach slots only on specific future dates within 14 days |
| **Steps** | Step 2 calendar: try click past dates, dates &gt;14 days, dates without slots |
| **Expected** | Past, beyond window, and no-slot days **disabled**. Only days with slots selectable. |

### CSC-SLOT-003 — Нет slots на выбранный день — TESTED

| | |
|---|---|
| **Preconditions** | Coach has slots on day X but not day Y (both in window) |
| **Steps** | Select day Y on calendar |
| **Expected** | Message: *No open times on this day. Pick another highlighted date or go back to choose another coach.* |

### CSC-SLOT-004 — Confirm disabled until slot selected — TESTED

| | |
|---|---|
| **Preconditions** | Step 2 loaded with slots |
| **Steps** | Do not select slot; inspect **Confirm session** |
| **Expected** | Button **disabled**. After slot click → enabled (if credits sufficient). |

---

## 10. Conflicts & recovery

### CSC-CONFLICT-001 — Coach unavailable at confirm — TESTED

| | |
|---|---|
| **Preconditions** | User on step 2 with selected coach; Admin deactivates coach **или** coach removed before confirm |
| **Steps** | **Confirm session** |
| **Expected** | Inline alert (`role="alert"`): message e.g. *That coach is no longer available.* Button **Choose another coach**. **Не** toast-only dead-end. Credits not permanently deducted. |

### CSC-CONFLICT-002 — Slot taken at confirm — TESTED

| | |
|---|---|
| **Preconditions** | Two Premium users; один free slot |
| **Steps** | User A confirms first. User B confirms same slot (stale UI). |
| **Expected** | User B: inline alert *That time was just taken.* (or server message). Button **Pick another time**. Slots reload. Credits safe. |

### CSC-CONFLICT-003 — Choose another coach action → full roster — TESTED

| | |
|---|---|
| **Preconditions** | CSC-CONFLICT-001 triggered |
| **Steps** | Click **Choose another coach** on alert |
| **Expected** | Return to step 1. **Choose a coach** full roster shown (`showFullRoster=true`). Alert cleared. Can pick another coach. |

### CSC-CONFLICT-004 — Pick another time action — TESTED

| | |
|---|---|
| **Preconditions** | CSC-CONFLICT-002 triggered |
| **Steps** | Click **Pick another time** |
| **Expected** | Stay on step 2 same coach. Selected slot cleared. Slots refreshed. Can pick different time. |

---

## 11. Business rules

### CSC-RULE-001 — Manual select passes specialist_id — TESTED

| | |
|---|---|
| **Preconditions** | Premium; DevTools network open |
| **Steps** | Select Coach A manually → slot → **Confirm session** |
| **Expected** | RPC `confirm_one_on_one_booking` includes `p_specialist_id` = Coach A UUID. Assigned coach = A. |

### CSC-RULE-002 — Rebook path passes specialist_id — TESTED

| | |
|---|---|
| **Preconditions** | Returning user rebooks Coach A |
| **Steps** | Rebook → confirm |
| **Expected** | `p_specialist_id` = Coach A. `bookingMode` rebook internally; same RPC shape as manual. |

### CSC-RULE-003 — Primary flow ≠ auto-match — TESTED

| | |
|---|---|
| **Preconditions** | Fresh Premium first visit |
| **Steps** | Open 1:1 booking without clicking Match me |
| **Expected** | Default view = coach roster (manual path). Auto-match **не** pre-selected; **не** skips coach step. |

---

## 12. End-to-end smoke

### CSC-E2E-001 — First-time: manual select → book — TESTED

| | |
|---|---|
| **Preconditions** | Premium first-time; ≥2 credits; Coach A with slot &gt;24h |
| **Steps** | Dashboard → 1:1 → **Select coach** (A) → slot → **Confirm session** |
| **Expected** | Success toast *Session booked with {Coach A}*. **Your 1:1 sessions** shows new booking with coach name. Credits −2. Re-open flow: rebook section shows Coach A. |

### CSC-E2E-002 — Returning: rebook → book — TESTED

| | |
|---|---|
| **Preconditions** | Premium с past session Coach A; A has slots; ≥2 credits |
| **Steps** | **Rebook with {Coach A}** → slot → confirm |
| **Expected** | Booking confirmed with Coach A. No need to browse full roster. |

### CSC-E2E-003 — Match me → book → assigned coach visible — TESTED

| | |
|---|---|
| **Preconditions** | Premium; merged slots; ≥2 credits |
| **Steps** | **Match me with a coach** → slot → confirm |
| **Expected** | Toast shows assigned coach name. History lists coach. Step 1 did not require manual pick. |

---

## 13. Cross-reference map (NCLDD-31)

| Тема в этом плане | Связанные BK-* (NCLDD-31) |
|---|---|
| Credits deduct / insufficient | BK-CREDIT-*, BK-1ON1-002/003/007 |
| Confirmation email coach name | BK-1ON1-001c, BK-EMAIL-001 |
| Auto-assign load (CL-2) | BK-1ON1-008 |
| Admin reassign | BK-1ON1-005 |
| Deactivate guard | BK-SPEC-003 |
