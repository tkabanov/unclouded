# План тестирования: Mobile App Wrapper (в нативной обёртке)

**Спека:** [`docs/mobile-app-wrapper-implementation-plan.md`](./mobile-app-wrapper-implementation-plan.md) (`MOB-00`…`MOB-14`)
**Overrides:** `OVR-066` (Capacitor wrapper, no native purchase flow) — [`docs/product-overrides.md`](./product-overrides.md)
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| Native-проект | `mobile/capacitor.config.ts`, `mobile/android/`, `mobile/ios/` |
| Viewport / safe area | `frontend/index.html`, `frontend/public/manifest.webmanifest`, `frontend/tailwind.config.ts`, app shell/topbar/composer |
| Platform detection | `frontend/src/lib/platform/nativeApp.ts`, `useNativePlatform.ts` |
| External link routing | `frontend/src/lib/platform/openExternalUrl.ts`, `frontend/src/lib/coach/coachBookingApi.ts`, `frontend/src/components/share/ClassificationShareCard.tsx` |
| Native billing gating | `frontend/src/lib/subscription/subscriptionActions.ts`, `subscriptionCopy.ts` (`NATIVE_MANAGE_PLAN_ON_WEB_MESSAGE`), `/subscription` page |
| File save/share | `frontend/src/lib/platform/saveOrShareBlob.ts`, `frontend/src/lib/reassessment/pdf/downloadPupPdf.ts`, `ClassificationShareCard.tsx` |
| Deep link routing | `frontend/src/lib/platform/deepLinkRouting.ts` (`resolveDeepLink`), `frontend/src/lib/auth/recoverySession.ts`, `/reset_pw` |
| Auth session storage | `frontend/src/integrations/supabase/client.ts`, `frontend/src/lib/platform/nativeSessionStorage.ts` |
| Push | `supabase/functions/register-push-subscription/`, `mobile/` push plugin wiring (`MOB-08`…`MOB-10`) |

## How to run

- `/test-list docs/mobile-app-wrapper-test-plan.md` или `/test <ID>`
- Actor: QA / dev — все сценарии одноактёрные (no admin role needed), кроме auth-сценариев (обычный signed-in user)
- Сборка: из `mobile/` — `npm run sync` (`cap sync`), затем `npx cap run android` / `npx cap open android` (Android Studio) или `npx cap run ios` / `npx cap open ios` (Xcode). `server.url` в `capacitor.config.ts` указывает на прод-origin (`uncloud360.vercel.app`) — отдельный dev-деплой не нужен, WebView грузит боевой фронт
- Debug WebView: Android — `chrome://inspect/#devices` в Chrome desktop (эмулятор/устройство с USB debugging); iOS — Safari → Develop → `<Simulator/Device name>` (Safari Web Inspector). Нативные логи — `adb logcat` (Android) / Xcode Console или `Console.app` (iOS)
- Seed / deploy: миграции/edge-функции не требуются

---

## 1. Цели и объём

### 1.1 Цели

Проверить поведение внутри **реальной Capacitor-обёртки** (эмулятор/симулятор или физическое устройство), а не в браузере: реальный WebView (`server.url` → прод-origin), реальный `window.Capacitor` bridge без моков, реальные нативные плагины (`Browser`, `Filesystem`, `Share`, `PushNotifications`, `Preferences`), нативный offline-экран, аппаратную back-кнопку (Android) и deep link / universal link диспетчинг ОС.

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| Реальный запуск на Android emulator (API 26+) и iOS simulator (iOS 15+), либо на физическом устройстве | Store submission, подпись релизных сборок, App Store/Play review (`MOB-13`) |
| WebView viewport / safe area / клавиатура на реальном устройстве-классе (не эмуляция размера окна в браузере) | Синтетическая эмуляция viewport в десктоп-браузере |
| `isNativeApp()` реальная native-ветка (настоящий `window.Capacitor.isNativePlatform() === true`, без console-мока) | Инъекция `window.Capacitor` мока — не нужна, bridge присутствует нативно |
| Billing CTA скрытие в native (`MOB-06`) на реальной сборке | Apple IAP / Google Play Billing (не реализовано, вне скоупа) |
| External link routing через реальный `Browser` plugin (SFSafariViewController / Chrome Custom Tabs) (`MOB-04`) | — |
| File save/share через реальный `Filesystem.writeFile` + системный Share sheet (`MOB-07`) | — |
| Deep link / universal link диспетчинг через ОС (`adb shell am start`, `xcrun simctl openurl`) (`MOB-12`) | — |
| Нативный offline-экран (`errorPath: offline.html`) при потере сети | — |
| Android hardware back button | — |
| Push-доставка на эмулятор/устройство (`MOB-08`…`MOB-11`) — best-effort, см. §2.4 об ограничениях симулятора | Полная FCM E2E-инфраструктура (cron jobs, fan-out corner cases) — это `MOB-11` unit-тесты |
| Auth session storage: нативный адаптер (`Preferences`/Keychain) не ломает веб-путь (`MOB-05`) | — |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате
2. [`docs/product-overrides.md`](./product-overrides.md) — `OVR-066`
3. `docs/mobile-app-wrapper-implementation-plan.md` (`MOB-00` locked decisions)
4. Bubble §10 / US-700…US-704 (superseded по `OVR-066`)

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| Monetization в native | Никакого purchase CTA/ссылки; текст `"Manage your plan on unclouded.app"` — plain text, не ссылка |
| `/subscription` в native | Остаётся доступен read-only (статус плана, дата продления) |
| Web content source | `server.url` → прод-origin, с нативным offline-экраном при потере сети |
| External flows (Stripe portal, Meet/Calendar, LinkedIn share) | Никогда не открываются внутри WebView — уходят через `Browser` plugin (SFSafariViewController / Custom Tabs) |
| Deep link `/reset_pw` | Токен во fragment/query сохраняется без потерь при routing через ОС → WebView |
| `allowNavigation` | Только `uncloud360.vercel.app` + supabase host; сторонние/платёжные хосты не должны грузиться внутри WebView |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Android target | Emulator API 26+ с Google Play services image (для push), либо физическое устройство Android 8+ |
| iOS target | Simulator iOS 15+ (push через APNs на симуляторе не работает — см. 2.4), либо физическое устройство iOS 15+ |
| Build | `cd mobile && npm run sync`, затем `npx cap open android` / `npx cap open ios` → Run из Android Studio/Xcode на выбранном emulator/simulator/device |
| WebView content | Реальный `server.url` (прод-origin) — правки во фронтенде видны сразу после деплоя веб-приложения, пересборка `mobile/` не нужна для веб-кода |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Free/Pro user | `sub-pro@test.com` | Billing gating, external links, file save/share |
| Signed-out | — | Deep link `/reset_pw` без активной сессии |

Password для seed QA users: `qwerty123`.

### 2.3 Минимальные данные для прогона

1. Существующий отчёт/классификация с доступным PDF/share-card экспортом для тестового пользователя.
2. Пароль-ресет письмо не нужно реально отправлять — deep link на `/reset_pw` диспетчится напрямую через ОС с синтетическими параметрами.

### 2.4 Известные ограничения окружения

- **iOS Simulator не получает реальные push** (APNs требует физического железа) — `MOB-PUSH-*` на симуляторе ограничены проверкой регистрации токена и UI-состояния "подписан/не подписан"; реальную доставку проверять на физическом iPhone.
- **Android Emulator с Google Play image** пуш получает нормально, если Play services авторизованы (нужен Google-аккаунт в эмуляторе).
- Hot reload веб-кода не требует пересборки `mobile/`; изменения в `capacitor.config.ts`, нативных плагинах или ресурсах — требуют `npm run sync` + пересборку в Android Studio/Xcode.

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Сборка и запуск на emulator/simulator | 10–15 мин | setup |
| 1 | Viewport / safe area / клавиатура / back button | 15–20 мин | `MOB-UI-*` |
| 2 | Platform detection (реальный bridge) | 5 мин | `MOB-PLAT-*` |
| 3 | Billing gating native | 10 мин | `MOB-BILL-*` |
| 4 | External link routing (реальный Browser plugin) | 10 мин | `MOB-EXT-*` |
| 5 | File save/share (реальный Filesystem + Share sheet) | 10 мин | `MOB-FILE-*` |
| 6 | Deep link routing через ОС | 10 мин | `MOB-DEEP-*` |
| 7 | Offline-экран | 5 мин | `MOB-OFF-*` |
| 8 | Push (best-effort) | 10 мин | `MOB-PUSH-*` |
| 9 | Auth session storage regression | 5 мин | `MOB-AUTH-*` |
| 10 | E2E smoke | 10 мин | `MOB-E2E-001` |

**Smoke (критичный путь):** `MOB-UI-001`, `MOB-PLAT-001`, `MOB-BILL-001`, `MOB-EXT-001`, `MOB-DEEP-001`, `MOB-OFF-001`, `MOB-E2E-001`.

---

## 4. Viewport, safe area, installability, back button (`MOB-01`, `MOB-03`)

### MOB-UI-001 — Ключевые экраны без горизонтального скролла и без контента под safe area

| | |
|---|---|
| **Preconditions** | Signed in как `sub-pro@test.com`; приложение запущено на Android emulator (notch/gesture-nav skin, напр. Pixel) и на iOS simulator (модель с notch/Dynamic Island, напр. iPhone 15) |
| **Steps** | Открыть по очереди: онбординг-визард, chat/coaching session, check-in, path session, dashboard, `/subscription`, coach booking |
| **Expected** | На каждом экране нет горизонтального скролла страницы; топбар не залезает под статус-бар/notch, композер/нижняя навигация не залезает под home-indicator/gesture-бар |

### MOB-UI-002 — Android hardware back button

| | |
|---|---|
| **Preconditions** | Android emulator, приложение открыто, есть история навигации (перешли на 2+ экрана вглубь) |
| **Steps** | Нажать аппаратную/software back-кнопку эмулятора несколько раз подряд |
| **Expected** | Back идёт по SPA-истории (не закрывает приложение сразу); на корневом экране back сворачивает/закрывает приложение, а не показывает пустой WebView или креш |

### MOB-UI-003 — Chat composer остаётся видимым при открытой клавиатуре

| | |
|---|---|
| **Preconditions** | Запущено на устройстве/эмуляторе, chat/coaching экран открыт |
| **Steps** | Тапнуть в текстовое поле композера — вызвать системную клавиатуру |
| **Expected** | Композер остаётся видимым над клавиатурой и не выталкивается за пределы экрана; после закрытия клавиатуры layout возвращается без "прыжка"/остаточного пустого пространства |

### MOB-UI-004 — Splash screen и app icon корректны

| | |
|---|---|
| **Preconditions** | Свежий запуск приложения (cold start) |
| **Steps** | Наблюдать splash screen при старте; посмотреть иконку приложения на home screen/app drawer |
| **Expected** | Splash screen показывается недолго (не зависает), без белого мигания поверх; иконка приложения не generic-заглушка |

### MOB-UI-005 — Инпуты ≥16px, тап-таргеты ≥44pt в визарде

| | |
|---|---|
| **Preconditions** | Онбординг-визард открыт на устройстве |
| **Steps** | Через Safari Web Inspector / Chrome remote debugging — computed `font-size` на видимых text input/textarea; computed размеры кнопок next/back |
| **Expected** | Ни один текстовый инпут не меньше 16px (iOS иначе авто-зумит поле при фокусе — проверить визуально, что зума не происходит); nav-кнопки не меньше 44×44 |

### MOB-UI-006 — Широкие таблицы не ломают layout (Dashboard/admin/results)

| | |
|---|---|
| **Preconditions** | Signed in, запущено на устройстве |
| **Steps** | Открыть Dashboard и любой results-экран с таблицей/грид-виджетом |
| **Expected** | Широкий контент скроллится внутри собственного `overflow-x-auto`-контейнера, страница целиком — без горизонтального скролла |

---

## 5. Определение платформы (`MOB-02`)

### MOB-PLAT-001 — Реальный native bridge → `isNativeApp() === true`

| | |
|---|---|
| **Preconditions** | Приложение запущено в Capacitor-обёртке (не в обычном мобильном браузере) |
| **Steps** | Через remote debugging выполнить в консоли WebView `window.Capacitor.isNativePlatform()` и `window.Capacitor.getPlatform()` |
| **Expected** | `isNativePlatform()` возвращает `true`, `getPlatform()` — `"ios"` или `"android"` в зависимости от сборки; UI отражает native-ветку (billing gating, см. `MOB-BILL-001`) |

### MOB-PLAT-002 — User-Agent несёт маркер приложения

| | |
|---|---|
| **Preconditions** | То же окружение |
| **Steps** | В консоли WebView прочитать `navigator.userAgent` |
| **Expected** | Содержит `UncloudedApp/<version> (ios)` или `(android)` — совпадает с `appendUserAgent` из `capacitor.config.ts` |

### MOB-PLAT-003 — Analytics события несут `app_platform`

| | |
|---|---|
| **Preconditions** | Обычная сессия внутри приложения |
| **Steps** | Через remote debugging → Network — фильтр по PostHog/analytics endpoint после любого события (например, навигация) |
| **Expected** | Payload содержит `app_platform: "ios"` или `"android"` (не `"web"`) |

### MOB-PLAT-004 — Web-регрессия: обычный мобильный браузер по-прежнему `web`

| | |
|---|---|
| **Preconditions** | Тот же прод-origin, открытый в обычном мобильном браузере (не в Capacitor-обёртке) |
| **Steps** | Открыть приложение в Safari/Chrome на телефоне или в mobile-эмуляции десктоп-браузера |
| **Expected** | Billing CTA видны как обычно (см. `MOB-BILL-005`), `app_platform: "web"` в аналитике — native-ветки не активируются вне обёртки |

---

## 6. Native billing gating (`MOB-06`)

### MOB-BILL-001 — Native: никакого purchase CTA, только read-only статус

| | |
|---|---|
| **Preconditions** | Signed in `sub-pro@test.com` внутри Capacitor-обёртки |
| **Steps** | Открыть `/subscription` |
| **Expected** | Нет кнопки/ссылки на Stripe checkout или апгрейд; виден текст `"Manage your plan on unclouded.app"` как **plain text**, не кликабельный (тап по нему ничего не открывает); статус плана и дата продления по-прежнему отображаются |

### MOB-BILL-002 — Тап по "Manage your plan..." не триггерит навигацию

| | |
|---|---|
| **Preconditions** | То же |
| **Steps** | Тапнуть непосредственно по тексту `"Manage your plan on unclouded.app"` |
| **Expected** | Ничего не открывается — ни внутри WebView, ни через `Browser` plugin |

### MOB-BILL-003 — Locked feature gate не превращается в purchase CTA

| | |
|---|---|
| **Preconditions** | Free-tier аккаунт внутри Capacitor-обёртки |
| **Steps** | Открыть экран/модуль, закрытый тарифом (locked feature) |
| **Expected** | Отображается gate-сообщение о недоступности функции, без ссылки на оформление подписки |

### MOB-BILL-004 — Enterprise self-serve billing по-прежнему пуст

| | |
|---|---|
| **Preconditions** | Enterprise-аккаунт (если доступен в seed), внутри Capacitor-обёртки |
| **Steps** | Открыть `/subscription` для enterprise-пользователя |
| **Expected** | Нет self-serve billing действий (уже было так до `MOB-06`) |

### MOB-BILL-005 — Web (обычный браузер): purchase CTA видны как обычно (regression)

| | |
|---|---|
| **Preconditions** | Signed in `sub-pro@test.com`, обычный мобильный/десктоп браузер (не обёртка) |
| **Steps** | Открыть `/subscription` |
| **Expected** | Доступны обычные действия апгрейда/чекаута — без регрессий от нативных изменений |

---

## 7. External link routing (`MOB-04`)

### MOB-EXT-001 — Внешняя ссылка открывается через системный Browser, не внутри WebView

| | |
|---|---|
| **Preconditions** | Внутри Capacitor-обёртки, signed in |
| **Steps** | Тапнуть на ссылку календаря/Meet или LinkedIn share в `ClassificationShareCard` |
| **Expected** | Открывается SFSafariViewController (iOS) / Chrome Custom Tab (Android) поверх приложения — не полноэкранная навигация внутри самого WebView-приложения; закрытие возвращает в прежнее состояние SPA (без потери состояния/reload) |

### MOB-EXT-002 — Coach booking hold откатывается, если открытие внешней ссылки не удалось

| | |
|---|---|
| **Preconditions** | Booking flow дошёл до шага открытия внешней ссылки; смоделировать сбой — например, отключить сеть непосредственно перед тапом |
| **Steps** | Инициировать coach booking flow до шага открытия внешней ссылки в условиях сбоя |
| **Expected** | Booking hold откатывается (не остаётся "зависшим"), пользователю видна ошибка, а не silent no-op |

### MOB-EXT-003 — Stripe portal редирект уходит тем же путём, что остальные внешние ссылки

| | |
|---|---|
| **Preconditions** | Signed in, доступ к billing portal действию |
| **Steps** | Инициировать открытие Stripe portal |
| **Expected** | Открывается через тот же `Browser` plugin путь (SFSafariViewController/Custom Tab), не через прямую WebView-навигацию — платёжный хост не входит в `allowNavigation`, так что прямая навигация должна была бы упасть в `offline.html`/ошибку, если бы обход `openExternalUrl` произошёл |

### MOB-EXT-004 — `allowNavigation` не пропускает сторонние хосты внутрь WebView

| | |
|---|---|
| **Preconditions** | Внутри Capacitor-обёртки |
| **Steps** | Через remote debugging попытаться напрямую перейти (`window.location.href = ...`) на хост вне списка `allowNavigation` (например, домен Stripe) |
| **Expected** | Навигация не проходит внутри WebView (блокируется/уходит в системный браузер) — WebView не рендерит сторонний домен как часть приложения |

---

## 8. File save/share (`MOB-07`)

### MOB-FILE-001 — Скачивание PDF отчёта вызывает Filesystem.write → системный Share sheet

| | |
|---|---|
| **Preconditions** | Signed in, доступен PUP/reassessment PDF, внутри Capacitor-обёртки |
| **Steps** | Нажать "Download PDF" |
| **Expected** | Появляется системный Share sheet (iOS) / Share intent chooser (Android) с корректным именем файла; файл реально записан (через `Filesystem.writeFile`) — не создаётся `<a download>` |

### MOB-FILE-002 — Share-card изображение сохраняется/шарится тем же путём

| | |
|---|---|
| **Preconditions** | Открыт `ClassificationShareCard` внутри Capacitor-обёртки |
| **Steps** | Нажать на действие сохранения/шаринга картинки |
| **Expected** | Тот же системный Share sheet, без ошибок в WebView-консоли (remote debugging) |

### MOB-FILE-003 — Ошибка записи на диск показывает видимую ошибку

| | |
|---|---|
| **Preconditions** | Место на устройстве/эмуляторе исчерпано, либо права на запись отозваны (если можно смоделировать через настройки эмулятора); иначе — читать код обработки ошибки и подтвердить путь ревью, отметив как ограничение окружения |
| **Steps** | Повторить "Download PDF" в условиях сбоя записи |
| **Expected** | Пользователь видит error toast/сообщение; нет "тихого" зависания без обратной связи |

### MOB-FILE-004 — Web regression: скачивание PDF в обычном браузере не изменилось

| | |
|---|---|
| **Preconditions** | Обычный мобильный/десктоп браузер, не обёртка |
| **Steps** | Нажать "Download PDF" |
| **Expected** | Прежнее поведение — object URL, скачивание файла, освобождение URL после; без Share sheet |

---

## 9. Deep link routing (`MOB-12`)

### MOB-DEEP-001 — Внутренний путь резолвится как internal SPA-навигация

| | |
|---|---|
| **Preconditions** | Приложение запущено (может быть в фоне) |
| **Steps** | Android: `adb shell am start -a android.intent.action.VIEW -d "https://uncloud360.vercel.app/dashboard" <package>`. iOS: `xcrun simctl openurl booted "https://uncloud360.vercel.app/dashboard"` |
| **Expected** | Приложение выходит на передний план и открывает `/dashboard` внутри своего SPA-роутера, без полного WebView reload на внешний браузер |

### MOB-DEEP-002 — `/reset_pw` с токеном сохраняет payload при routing через ОС

| | |
|---|---|
| **Preconditions** | Signed-out |
| **Steps** | Тем же способом (`adb shell am start` / `xcrun simctl openurl`) открыть `https://uncloud360.vercel.app/reset_pw#access_token=test&type=recovery` (или актуальный query-контракт `recoverySession.ts`) |
| **Expected** | Токен во fragment/query не теряется и не потребляется дважды; открывается экран восстановления пароля, а не generic 404/redirect |

### MOB-DEEP-003 — Foreign-origin URL не приводит к внутренней SPA-навигации

| | |
|---|---|
| **Preconditions** | — |
| **Steps** | Инициировать открытие ссылки на домен вне приложения (например, из `MOB-EXT-001`) через deep-link/tap внутри приложения |
| **Expected** | Внешний URL уходит через `Browser` plugin (см. §7), не приводит к SPA-роутингу внутри приложения |

### MOB-DEEP-004 — Malformed deep link не роняет приложение

| | |
|---|---|
| **Preconditions** | — |
| **Steps** | `adb shell am start -a android.intent.action.VIEW -d "https://uncloud360.vercel.app/%%%broken"` (или эквивалент на iOS с заведомо битым URL) |
| **Expected** | Нет краша приложения, нет необработанного исключения в WebView-консоли; в худшем случае — фоллбек на дефолтный экран |

---

## 10. Offline-экран (`MOB-00` web content source lock)

### MOB-OFF-001 — Потеря сети показывает нативный offline-экран

| | |
|---|---|
| **Preconditions** | Приложение открыто и уже загрузило прод-контент |
| **Steps** | Включить Airplane mode на эмуляторе/устройстве (или отключить Wi-Fi + мобильные данные), затем попытаться перейти на новый экран/сделать pull-to-refresh |
| **Expected** | Показывается `errorPath: offline.html` — понятный offline-экран, не белый экран/generic browser error page |

### MOB-OFF-002 — Восстановление сети возвращает приложение к рабочему состоянию

| | |
|---|---|
| **Preconditions** | Продолжение `MOB-OFF-001`, offline-экран показан |
| **Steps** | Выключить Airplane mode, вернуть сеть |
| **Expected** | Приложение восстанавливает соединение и позволяет продолжить работу (реload или автоматический возврат к прод-origin) без ручного переустановки |

---

## 11. Push notifications (best-effort, `MOB-08`…`MOB-10`)

### MOB-PUSH-001 — Регистрация push-токена при первом запуске/разрешении

| | |
|---|---|
| **Preconditions** | Signed in, разрешения на push ещё не выданы |
| **Steps** | Пройти flow запроса разрешения на push-уведомления (если есть in-app prompt) и разрешить |
| **Expected** | Устройство/эмулятор регистрирует push-токен; через remote debugging/Network видно, что токен отправлен в `register-push-subscription` без ошибок |

### MOB-PUSH-002 — Реальная доставка на устройстве (см. ограничения §2.4)

| | |
|---|---|
| **Preconditions** | Физическое устройство (или Android emulator с Play services) с зарегистрированным токеном |
| **Steps** | Триггернуть один из существующих типов уведомлений (например, milestone alert) через штатный флоу приложения |
| **Expected** | Уведомление приходит в системный notification tray; тап по нему открывает приложение на ожидаемом deep-link экране. **iOS simulator:** пропустить фактическую доставку, зафиксировать как ограничение среды |

---

## 12. Auth session storage (`MOB-05`)

### MOB-AUTH-001 — Нативное хранилище сессии переживает перезапуск приложения

| | |
|---|---|
| **Preconditions** | Signed in внутри Capacitor-обёртки |
| **Steps** | Полностью закрыть приложение (force-stop/swipe из recents), открыть заново |
| **Expected** | Сессия сохраняется (пользователь остаётся signed in) через нативный адаптер (`Preferences`/Keychain), не только через web `localStorage` |

### MOB-AUTH-002 — Разлогин очищает нативное хранилище

| | |
|---|---|
| **Preconditions** | Signed in, продолжение `MOB-AUTH-001` |
| **Steps** | Разлогиниться, затем полностью закрыть и заново открыть приложение |
| **Expected** | Приложение открывается на экране логина — сессия не восстанавливается из нативного хранилища |

### MOB-AUTH-003 — Web regression: обычный браузер не затронут

| | |
|---|---|
| **Preconditions** | Обычный мобильный/десктоп браузер, не обёртка |
| **Steps** | Логин, перезагрузка страницы, разлогин |
| **Expected** | Поведение как раньше — сессия сохраняется между reload через стандартный web storage; после разлогина токена в `localStorage` не остаётся |

---

## 13. End-to-end smoke

### MOB-E2E-001 — Полный проход в реальной обёртке: без покупки, с внешними ссылками и файлом

| | |
|---|---|
| **Preconditions** | Signed in `sub-pro@test.com`, запущено на Android emulator или iOS simulator/устройство |
| **Steps** | 1) Открыть Dashboard — нет horizontal scroll, safe-area ок, back button работает. 2) Открыть `/subscription` — нет purchase CTA, виден plain-text "Manage your plan on unclouded.app". 3) Тапнуть внешнюю ссылку (календарь/share) — открывается системный Browser (SFSafariViewController/Custom Tab), не WebView-навигация. 4) Скачать PDF отчёта — появляется системный Share sheet. 5) Через `adb shell am start` / `xcrun simctl openurl` открыть `/reset_pw` с токеном — токен сохранён, экран восстановления открывается |
| **Expected** | Все пять шагов проходят без ошибок в WebView-консоли (remote debugging) и без единого purchase-CTA, WebView-навигации на сторонний хост или `<a download>`-скачивания |

---

## Открытые вопросы / известные ограничения

- Push на iOS simulator не доставляется реально (нужен физический iPhone) — см. §2.4 и `MOB-PUSH-002`.
- Финальное подтверждение App Store/Google Play review-рисков, подписи релизных сборок и store submission — вне этого плана, см. `MOB-13`.
- Если `useNativePlatform()` кеширует значение на mount и не подхватывает bridge своевременно на очень медленном старте — фиксировать как находку, если поведение расходится с ожидаемым в `MOB-PLAT-*`/`MOB-BILL-*`.
