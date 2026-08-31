# Coach selection — booking flow requirements

> Product update: manual coach choice as the primary path; rebook from session history; auto assignment as a secondary option.

---

## Первый booking

Основным сценарием должен стать **ручной выбор coach**.

1. Показать пользователю список **всех доступных coach**.
2. Для каждого coach должна быть доступна **карточка или профиль** с информацией, которая помогает сделать выбор.
3. Пользователь **выбирает coach** и затем **продолжает booking** с доступным временем выбранного coach.
4. Если выбранный coach или слот уже недоступен — показать **понятное сообщение** и предложить выбрать **другого coach** или **другое время**.

---

## Последующие booking

1. Если у пользователя уже были сессии с coach — показать быстрый вариант **«Rebook with previous coach»**.
2. Предыдущих coach брать из **истории завершённых или состоявшихся сессий** пользователя.
3. Пользователь может выбрать прошлого coach и перейти к его **доступным слотам** без повторного поиска.
4. Пользователь **всегда** может выбрать **«Choose another coach»** и открыть полный список доступных coach.
5. Если прошлый coach больше недоступен для booking — **сообщить об этом** и предложить другого coach.

---

## Auto assignment

1. Существующий random / auto assignment **не удалять**.
2. Оставить его как **дополнительную опцию**, например кнопку **«Match me with a coach»**.
3. Auto assignment **не должен быть главным сценарием**: основной booking flow начинается с ручного выбора coach.
4. При выборе auto assignment система использует **существующую логику** подбора доступного coach (lowest monthly load, then random — CL-2 / OVR-062).

---

## Definition of Done

- [x] При первом booking пользователь видит список и профили всех доступных coach.
- [x] Пользователь может вручную выбрать coach и забронировать доступный слот.
- [x] При повторном booking пользователь может выбрать «Rebook with previous coach» из истории сессий.
- [x] При повторном booking пользователь может выбрать другого coach через полный список.
- [x] Random / auto assignment сохранён как отдельная вторичная опция.
- [x] Недоступный coach или слот обрабатывается без тупикового состояния и с понятным следующим действием.
- [x] **Основным сценарием booking flow является ручной выбор coach.**

---

## Связанные документы

- `docs/NCLDD-31-internal-bookings-management-system.md` — CL-2, CL-9
- `docs/product-overrides.md` — OVR-061, OVR-062, **OVR-064**
- Реализация UI: `frontend/src/components/coach/OneOnOneBookingPanel.tsx`, `frontend/src/components/coach/booking/*`
- API / RPC: `frontend/src/lib/coach/coachBookingApi.ts`, `supabase/migrations/20260827150000_one_on_one_coach_choice.sql`, `supabase/migrations/20260827220000_coach_booking_selection_flow.sql`
