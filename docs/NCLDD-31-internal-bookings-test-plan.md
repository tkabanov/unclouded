# План тестирования: NCLDD-31 — Internal Bookings Management System

**Спека:** [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md)  
**Jira:** [NCLDD-31](https://rapiddevelopers.atlassian.net/browse/NCLDD-31)  
**Overrides:** OVR-027 / **OVR-059** (Premium 1:1 credits: cost 2, signup +2, monthly +1 on 1st UTC, cap 6), **OVR-060** (`groupSessionsUsedThisMonth`), OVR-045 (Pre-Coaching Brief), **OVR-061** (coach choice), **OVR-062** (reassign / deactivate), **OVR-063** (TZ / Meet / Complete-at-end / waitlist 2h) — `docs/product-overrides.md`  
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Specialists CRUD | `/admin` → Specialists, `AdminSpecialistsTab`, `adminSpecialistsApi` |
| Scheduling / availability | `/admin` → Scheduling, `AdminSchedulingTab` |
| Admin bookings | `/admin` → Bookings, `AdminBookingsTab`, `adminBookingsApi` |
| Group catalog (admin) | Bookings / group panel, `AdminGroupCatalogPanel`, `adminGroupSessionsApi` |
| User 1:1 booking | Dashboard / coaching booking UI, `OneOnOneBookingPanel`, `coachBookingApi` |
| User group booking | Group coaching UI, `groupCoachingApi` |
| Post-session form | `/coach-session/:token`, `CoachPostSessionPage`, `coach-post-session` edge |
| Credits | OVR-059 ledger / hold→redeem; Admin user detail credit adjust |
| Google Meet / Calendar | finalize-coach-booking / finalize-group-sessions; reassign Calendar PATCH |
| Emails | confirmation, Pre-Coaching Brief, 24h / 1h / end5m reminders; waitlist offer; cancel/reassign |

## How to run

- Manual / browser: `/test-list docs/NCLDD-31-internal-bookings-test-plan.md` или `/test <ID>`
- Actor Admin: Platform Admin (`isAdmin`) — Specialists / Scheduling / Bookings
- Actor User: Premium (1:1 + group), Pro (group only), Free (negatives)
- Email / Meet checks: тестовый inbox специалиста + user; Google Calendar тестового аккаунта интеграции
- Time-based: reminders / waitlist **2h** claim / Complete-at-end — clock skew, scheduled jobs, или ручной invoke cron / edge

### Deploy before QA

Apply migrations `20260827140000` … `20260827210000`, then deploy edges: `coach-booking-reminders`, `coach-post-session`, `reassign-coach-booking`, `cancel-group-coaching-session`, `group-coaching-waitlist`, `subscription-lifecycle`, `finalize-group-sessions`.

---

## 1. Цели и объём

### 1.1 Цели

Проверить внутреннюю систему бронирования one-on-one и group coaching: admin-управление специалистами и слотами, пользовательский booking **с выбором коуча** (CL-9), кредиты (OVR-059), Google Meet/Calendar sync, email-автоматизации (вкл. end5m), post-session form без аккаунта специалиста (Completed **не** от формы), отмены/refunds, group capacity + monthly gate (OVR-060) + waitlist (FIFO, **2h** claim), admin booking management и статусы.

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Admin Specialists / Scheduling / Bookings | Внешний Wix / legacy scheduler parity |
| User 1:1 coach roster + book-again (CL-9) | Coach Workspace Phase 3 (полноценный login специалиста) |
| Credits hold/redeem/refund (OVR-059) | Stripe checkout / subscription billing (кроме entitlement gate) |
| Google Calendar event + Meet create/cancel/reassign | Нагрузочное тестирование Meet API quota |
| Confirmation, Pre-Coaching Brief, 24h/1h/end5m reminders | Полный content QA тона Kota's Read (см. AI prompt test plan) |
| Post-session form по token; Kota memory on submit | Специалист как platform user / SSO |
| Group sessions, capacity, waitlist, 2h claim race | Платные group add-ons ($97) — снято OVR-028 |
| Admin filters, reassign (CL-3), credit adjust, form pending | Mobile native apps; group Complete-at-end / group end5m |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-059…063**, OVR-045  
3. [`docs/NCLDD-31-internal-bookings-management-system.md`](./NCLDD-31-internal-bookings-management-system.md)  
4. Bubble / Lovable / migration specs

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| Standard slot | **30 minutes** (duration configurable в admin scheduling) |
| 1:1 credits (OVR-059) | Cost **2**; signup **+2** once; monthly **+1** on 1st UTC; **cap 6**; cancel ≥24h refund **clamped** to cap |
| Specialist identity (user 1:1) | Coach **visible and selectable**; book-again for last coach; name in confirm email + history (CL-9) |
| Specialist accounts | Специалистам **не** нужны platform login |
| Cancel ≥24h before | Full credit refund (capped) |
| Cancel &lt;24h before | No credit refund |
| Waitlist claim window | **2 hours** after promotion (CL-8) |
| Group monthly gate (OVR-060) | `groupSessionsUsedThisMonth` 0/1; blocked copy with next-available date; cancel ≥24h resets; admin cancel resets + notifies |
| Status UI labels | `confirmed` → **Scheduled**; **Completed** at scheduled **end** (not form submit); Form Pending\|Submitted separate; Canceled / Waitlisted |
| Deactivate coach (CL-10) | Blocked while upcoming sessions; exact warning copy |
| TZ (CL-4) | Slots device-local; emails in recipient TZ; 24h rule UTC |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| Admin | `/admin` → Specialists, Scheduling, Bookings |
| User booking | Dashboard Human coaching / booking panel |
| Post-session | `/coach-session/{token}` (link из email / Admin Bookings) |
| Edge / jobs | booking confirm, Meet create/cancel, mailers, reminders, waitlist offer, `coach-post-session` |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Platform Admin | Admin seed / `isAdmin` | CRUD specialists, availability, bookings, credits |
| Premium user | `sub-premium@test.com` | 1:1 + group; credits |
| Pro user | `sub-pro@test.com` | Group only; 1:1 locked |
| Free user | `sub-free@test.com` | Negatives: нет 1:1 / group entitlement |
| Second Premium | отдельный Premium | Race: двойной booking одного слота; waitlist claim race |
| Specialist (email only) | `coach-qa-{n}@test.com` | Inbox: confirm, brief, reminders, post-session link |

Password для seed QA users: `qwerty123` (если применимо).

### 2.3 Минимальные данные для прогона

1. ≥2 **active** specialists с разными email и bio; ≥1 **inactive**.  
2. Availability: несколько дат/слотов 30 min; хотя бы один overlapping attempt; слоты в окнах &gt;24h и &lt;24h от now.  
3. Premium с ≥2 session credits (или Admin manual grant).  
4. ≥1 upcoming group session с capacity **2** (для fill → waitlist).  
5. Доступ к тестовому Google Calendar / Meet интеграционному аккаунту.  
6. Возможность читать письма user + specialist (или mail trap / logs).

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + Admin UI inventory | 20–30 мин | BK-ACCESS-*, BK-UI-* |
| 1 | Specialists CRUD | 30–45 мин | BK-SPEC-* |
| 2 | Scheduling & availability | 45–60 мин | BK-SCHED-* |
| 3 | 1:1 user booking + credits + assign | 60–90 мин | BK-1ON1-*, BK-RULE-001–003 |
| 4 | Google Meet / Calendar | 30–45 мин | BK-GMEET-* |
| 5 | Emails + reminders (time travel / jobs) | 45–90 мин | BK-EMAIL-* |
| 6 | Cancel + refund rules + slot release | 45–60 мин | BK-CANCEL-* |
| 7 | Post-session form + Completed | 30–45 мин | BK-POST-* |
| 8 | Group + waitlist + claim race | 60–90 мин | BK-GROUP-*, BK-WAIT-* |
| 9 | Admin Bookings filters / statuses / exceptions | 30–45 мин | BK-ADMIN-* |
| 10 | Business rules smoke pack | 20–30 мин | BK-RULE-*, BK-PACK-* |

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
| **Expected** | Roster / slots by coach (CL-9); credits balance виден или понятен до confirm. |

### BK-UI-002 — Pro: 1:1 locked, group available — TESTED

| | |
|---|---|
| **Preconditions** | Pro user |
| **Steps** | Открыть coaching booking |
| **Expected** | 1:1 недоступен (upgrade / locked). Group sessions видны в рамках OVR-060. |

---

## 5. Admin — Specialist Management (§1)

### BK-SPEC-001 — Create specialist (happy path) — TESTED

| | |
|---|---|
| **Preconditions** | Admin; уникальный email |
| **Steps** | Add specialist: name, email, profile image, bio/description, availability status = active. Save. |
| **Expected** | Специалист в списке active; поля сохранены. Нет требования создать platform account / password. |

### BK-SPEC-002 — Edit specialist fields — TESTED

| | |
|---|---|
| **Preconditions** | Существующий specialist |
| **Steps** | Изменить name, email, image, bio, status. Save. |
| **Expected** | Detail/list отражают новые значения. |

### BK-SPEC-003 — Deactivate specialist — TESTED

| | |
|---|---|
| **Preconditions** | Active specialist **with upcoming confirmed bookings** |
| **Steps** | Attempt deactivate / mark inactive |
| **Expected** | **Blocked** with warning: `This coach has [X] upcoming sessions. Please reassign or cancel them before deactivating.` (CL-10). After bookings cleared/reassigned, deactivate succeeds; inactive coach not offered for new books. |

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
| **Steps** | (a) пустое name; (b) invalid email; (c) duplicate email если запрещено |
| **Expected** | Save blocked; clear errors; запись не создаётся / не портится. |

---

## 6. Admin — Scheduling & Availability (§2)

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

---

## 7. User Flow — One-on-One Booking (§3) + Key Rules 1–3, 7

### BK-1ON1-001 — Coach roster + book-again (CL-9) — TESTED

| | |
|---|---|
| **Preconditions** | ≥2 active specialists с free slots; Premium с credits; optional prior 1:1 with coach A |
| **Steps** | Открыть 1:1 booking; осмотреть roster / slots |
| **Expected** | Coaches **visible** (name, photo, short bio). Returning user: **Book again with [Coach]** + that coach’s slots prominent. First-time: full roster. Browse-all always available. |

### BK-1ON1-002 — Happy path book + credit deduct + assign — TESTED

| | |
|---|---|
| **Preconditions** | Premium ≥2 credits; free slot &gt;24h; coach selected |
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

### BK-1ON1-005 — Admin reassign specialist — TESTED

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 booking |
| **Steps** | Admin Bookings → reassign specialist |
| **Expected** | Assigned specialist updated; Google Calendar attendees patched; previous coach notified (removed); new coach invited + Pre-Coaching Brief resent; user notified of coach change (CL-3). |

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

---

## 8. Google Meet & Calendar (§4) + Rule 5

### BK-GMEET-001 — Event + Meet on confirm

| | |
|---|---|
| **Preconditions** | Working Google integration; successful 1:1 book |
| **Steps** | После confirm открыть booking detail (Admin/user) и Google Calendar |
| **Expected** | Calendar event создан; Meet link сгенерирован; link связан с booking; date/time/duration/user/specialist корректны. Link в confirmation emails. |

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

---

## 9. Email Notifications & Automations (§5) + Rule 4

### BK-EMAIL-001 — User confirmation contents

| | |
|---|---|
| **Preconditions** | Successful 1:1 book |
| **Steps** | Проверить email пользователя |
| **Expected** | Date, time, duration, Meet link, confirmation details. |

### BK-EMAIL-002 — Specialist confirmation contents

| | |
|---|---|
| **Preconditions** | Same booking |
| **Steps** | Проверить email assigned specialist |
| **Expected** | User name / relevant user info, date/time, Meet link, coaching info as designed. |

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
| **Expected** | User + specialist получают 24h reminder. |

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
| **Steps** | Run 24h и 1h reminder jobs for that booking id |
| **Expected** | Reminder emails **не** отправляются. |

### BK-EMAIL-007 — No duplicate storm (smoke)

| | |
|---|---|
| **Preconditions** | Same booking; job run twice |
| **Steps** | Invoke reminder job twice for same window |
| **Expected** | Не более одного reminder per recipient per window (idempotent). |

---

## 10. Post-Session Coach Form (§6) + Rule 6, 10

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

### BK-POST-006 — Kota memory on form submit (G9) — NEW

| | |
|---|---|
| **Preconditions** | Successful form submit for member with profile |
| **Steps** | Submit notes; inspect `profiles.onboardingData.chat_session_memory` and booking stamps |
| **Expected** | Record `human-coach:{bookingId}` appended; `postSessionKotaSyncedAt` stamped. |

### BK-STATUS-COMPLETE-END — Completed at scheduled end (CL-7) — NEW

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 whose `scheduledAt + duration` is in the past; form not submitted |
| **Steps** | Invoke `coach-booking-reminders` / `complete_ended_coach_bookings` |
| **Expected** | Status → **completed**; `completedAt` set; form still **Pending**. |

### BK-MAIL-END5M — 5-minute end warning email (G3) — NEW

| | |
|---|---|
| **Preconditions** | Confirmed 1:1 ending in ~3–8 minutes; `endWarning5mSentAt` null; SendGrid optional |
| **Steps** | Invoke `coach-booking-reminders` |
| **Expected** | User receives (or soft-skip stamps) one end-warning email; coach does not; stamp set; cancelled bookings skipped. |

---

## 11. Cancellations & Credit Refunds (§7)

### BK-CANCEL-001 — User cancel ≥24h → full refund — TESTED

| | |
|---|---|
| **Preconditions** | Scheduled 1:1 &gt;24h away; credits redeemed |
| **Steps** | User cancels from platform |
| **Expected** | Status **Canceled**; Meet/Calendar canceled; slot available again; **full** session credit refund; ledger/history отражает refund. |

### BK-CANCEL-002 — User cancel &lt;24h → no refund — TESTED

| | |
|---|---|
| **Preconditions** | Scheduled 1:1 &lt;24h away |
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

---

## 12. Group Coaching (§8) + Rule 8

### BK-GROUP-001 — Admin create group session — TESTED

| | |
|---|---|
| **Preconditions** | Admin |
| **Steps** | Create group session: title, description, date/time, duration, max capacity, recurring schedule if supported |
| **Expected** | Session в catalog; fields saved; visible to eligible users. |

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
| **Expected** | Registered; counter → **1**; capacity decrements; session in user history; status **Scheduled**. |

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
| **Expected** | Occurrences match schedule; each has own capacity/participants as designed. |

---

## 13. Group Waitlist (§9) + Rule 9

### BK-WAIT-001 — Full session → Join hidden, waitlist available — TESTED

| | |
|---|---|
| **Preconditions** | Capacity filled |
| **Steps** | User opens session |
| **Expected** | **Join Session** unavailable; **Join waitlist** available. |

### BK-WAIT-002 — FIFO waitlist order — TESTED

| | |
|---|---|
| **Preconditions** | Full session; users W1 then W2 join waitlist |
| **Steps** | Record join order; one registrant cancels |
| **Expected** | Offer/notification goes to **W1 first** (FIFO). |

### BK-WAIT-003 — Notify next waitlisted + claim within 2h — TESTED

| | |
|---|---|
| **Preconditions** | Spot freed; W1 offered |
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

---

## 14. Admin Booking Management (§10)

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
| **Expected** | Flows reachable and consistent with §§3,6,7. |

---

## 15. Cross-cutting business rules pack (§ Key Business Rules)

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
| **Expected** | Next waitlisted notified. |

### BK-RULE-010 — Completed notes in history + admin — TESTED

| | |
|---|---|
| **Preconditions** | BK-POST-001/002 |
| **Steps** | User history + Admin |
| **Expected** | Notes visible to authorized admin and in user session history. |

### BK-PACK-001 — Smoke E2E 1:1 (happy) — TESTED

| | |
|---|---|
| **Preconditions** | Admin specialist + slot; Premium credits; mail + Meet ok |
| **Steps** | Book → emails/brief → Admin sees Scheduled → cancel ≥24h → refund + Meet cancel → rebook |
| **Expected** | Full chain green. |

### BK-PACK-002 — Smoke E2E group + waitlist — TESTED

| | |
|---|---|
| **Preconditions** | Capacity 1; two eligible users |
| **Steps** | U1 join → U2 waitlist → U1 cancel → U2 claim within 24h |
| **Expected** | U2 registered; statuses correct; no double seat. |

---

## 16. Known dependencies / blockers

| Dependency | Impact if missing |
|---|---|
| Google Calendar/Meet credentials | BK-GMEET-* / email Meet link = BLOCKED or mock-only |
| Email delivery (SendGrid / trap) | BK-EMAIL-* evidence via logs only |
| Reminder / waitlist cron | Time-based cases need manual invoke or clock control |
| Premium credit seed / Admin grant | 1:1 happy path blocked |
| OVR-027 / OVR-028 | Credit amounts and group monthly cap — do not test against Phase 2 Wix $97 / “included 1:1” |

---

## 17. Traceability matrix (requirements → cases)

| Spec section | Case IDs |
|---|---|
| §1 Specialists | BK-SPEC-001…005, BK-RULE-006 |
| §2 Scheduling | BK-SCHED-001…007 |
| §3 One-on-One | BK-1ON1-001…007, BK-RULE-001…003,007 |
| §4 Google Meet | BK-GMEET-001…003, BK-RULE-005 |
| §5 Emails | BK-EMAIL-001…007, BK-RULE-004 |
| §6 Post-session | BK-POST-001…005, BK-RULE-010 |
| §7 Cancel / refunds | BK-CANCEL-001…005 |
| §8 Group | BK-GROUP-001…006, BK-RULE-008 |
| §9 Waitlist | BK-WAIT-001…006, BK-RULE-009 |
| §10 Admin Bookings | BK-ADMIN-001…004 |
| Key Business Rules | BK-RULE-001…010, BK-PACK-001…002 |
| Access / UI | BK-ACCESS-*, BK-UI-* |

---

*Test plan for NCLDD-31 Internal Bookings Management System. Source requirements updated 2026-08-25.*
