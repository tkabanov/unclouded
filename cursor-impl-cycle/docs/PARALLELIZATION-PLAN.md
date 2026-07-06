# План распараллеливания cursor-impl-cycle

Статус: **черновик к реализации**. Цель — ускорить `decompose` (сейчас идёт строго последовательно по 13 модулям) и подготовить параллельный `implement` по графу зависимостей.

---

## 1. Текущая архитектура (как есть)

Фреймворк — **последовательный конечный автомат, управляемый stop-hook'ом**:

- После каждого хода агента срабатывает `hooks/stop.mjs`.
- Хук читает единый `state/cycle.json`, по **одному указателю** (`current_module_id` / `current_item_id` + глобальный `gate_stage`) вычисляет ровно **одну** следующую задачу, пишет один `state/last-brief.json` и возвращает один `followup_message`.
- Оркестратор запускает **один** Task-субагент на эту задачу.
- На каждую цель идёт цепочка: `write → script gate → review → triage → advance` (`lib/gates.mjs`).

Итог: на один модуль decompose — минимум 3 прохода субагента (write, review, triage) + ходы хука между ними. На 13 модулей это ~40–50 последовательных запусков, каждый с «холодным» чтением крупных IR-срезов.

**Узкое место — единственный указатель состояния, а не реальные данные.**

### Ключевые наблюдения

- **Decompose независим по модулям.** Каждый `write-decompose` читает только свою запись из `module-map.json`, свои `ir/slices/*`, `styles.json` и read-only Supabase. Межмодульных зависимостей нет. → **embarrassingly parallel**.
- **Implement имеет настоящий DAG.** В выводах decompose у элементов уже есть `depends_on[]` с межмодульными рёбрами (например, `JOBS-01` → `SHELL-04`, `ENUM-01-provider-page-path-route-registry`). Item ids must match `state/item-registry.json`; module-level deps use `MOD-*`. → параллелим по слоям DAG.
- **Implement пишет в общий `provider-app/`.** Параллельные писатели в одном рабочем дереве = гонки на диске. → нужна изоляция (git worktree) или дизъюнктные файлы.

---

## 2. Целевая архитектура: волновой планировщик (wave scheduler)

Макро-фазы остаются последовательными (`scope → decompose → implement`), но **внутри** decompose и implement работа идёт волнами параллельных задач.

### 2.1. Модель состояния (`state/cycle.json`)

Переходим от одного указателя к **состоянию на каждую цель**:

```jsonc
{
  "active": true,
  "phase": "decompose",
  "modules": [
    {
      "id": "MOD-...",
      "decompose_passes": false,
      "decompose_gate": "write",        // NEW: per-module ("write"|"review"|"triage")
      "decompose_iteration": 0,          // NEW: per-module
      "items": [
        {
          "id": "...-01-...",
          "implement_passes": false,
          "implement_gate": "write",     // NEW: per-item
          "implement_iteration": 0,       // NEW: per-item
          "coverage_pct": 0,
          "depends_on": ["..."]          // NEW: загружается из decompose-вывода
        }
      ]
    }
  ],
  "iteration": 27
}
```

**Миграция:** действующий цикл уже в фазе decompose (6 модулей пройдено, 7 в очереди). Планировщик инициализирует недостающие поля лениво (`ensureParallelState`): для текущего указателя берёт старый `gate_stage`, для остальных — `"write"`. Ручная правка состояния не требуется, ничего не ломаем.

### 2.2. Волновая семантика (почему так безопасно)

1. Хук на тике формирует **волну** до `max_parallel` задач и отдаёт один `followup_message`.
2. Оркестратор запускает все N задач **одним сообщением как параллельные Task-субагенты**, дожидается завершения **всех**, затем завершает ход.
3. Хук срабатывает только когда волна целиком готова — он видит все артефакты, продвигает/оценивает каждую цель и формирует следующую волну.

Преимущество: хуку **не нужно отслеживать "в полёте"** — он просто проверяет наличие артефактов. Если субагент не создал артефакт, цель остаётся в статусе `needs-*` и переотправляется в следующей волне (с защитой по счётчику итераций).

### 2.3. Логика тика планировщика (`lib/scheduler.mjs`)

На каждом тике:

1. `ensureParallelState(cycle)` — миграция + обогащение `depends_on` из decompose-файлов.
2. Глобальные проверки (`max_iterations_total`, наличие IR `inventory`).
3. Для текущей фазы вычислить множество «готовых» целей:
   - **decompose**: все модули с `!decompose_passes`.
   - **implement**: все элементы с `!implement_passes`, у которых все `depends_on` уже `implement_passes` (готовы по DAG).
4. Для каждой готовой цели прогнать `evaluateTarget` — он по существующим артефактам продвигает гейт цели максимально далеко и возвращает терминал:
   - `needs-write` / `needs-review` / `needs-triage` → нужна отправка субагента,
   - `passed` → цель закрыта,
   - `paused` → исчерпан лимит итераций по цели.
5. Если все цели фазы `passed` → перейти к следующей фазе (decompose→implement) или `complete`.
6. Иначе собрать цели `needs-*`, ограничить до `max_parallel`, построить брифы, отдать **батч-followup**.
7. Если отправлять нечего, но не всё закрыто (всё оставшееся `paused`/заблокировано) → `pause` с диагностикой.

Гейт-семантика на цель (тот же конвейер, что и сейчас, но per-target):

```
write:  нет вывода → needs-write
        есть вывод → script gate: pass → gate=review; fail → needs-write (rewrite, iter++)
review: нет review-файла → needs-review
        есть → review gate: pass → gate=triage (или passed, если triage off); fail → gate=write (rewrite, iter++)
triage: нет triage-файла → needs-triage
        есть → triage gate: pass → passed; fail → gate=write (rewrite, iter++)
```

### 2.4. Параллельный decompose (Фаза 1 — безопасно, главный выигрыш)

- Выводы — раздельные файлы `output/decompose/<module>.json`; review/triage — read-only, раздельные отчёты. **Гонок на диске нет.**
- Полностью параллельно в одном рабочем дереве. `decompose.max = 4`.
- Ожидаемый эффект: время decompose падает примерно в **4 раза** (с «суммы 13 модулей» до «глубина волны × число волн»).

### 2.5. Параллельный implement (Фаза 2 — по DAG, поэтапно)

Готовность элемента = все `depends_on` имеют `implement_passes` (DAG уже закодирован в decompose). Внутри готового слоя элементы идут волнами.

Запись в общий `provider-app/` — главный источник риска (гонки на диске, конфликты). Поэтому **запись** распараллеливается поэтапно через три стратегии (`implement.write_strategy`):

- **C — `serial` (стартовая, выбрана).** В одной волне максимум **1 writer** (пишет в основное дерево, без worktree/merge), а **review/triage многих элементов идут параллельно** (read-only, раздельные отчёты, до `review_triage_max`). Review+triage — это ~2/3 ходов на элемент, поэтому ускорение ощутимое при нулевом риске слияния.
- **B — `disjoint-files` (следующий шаг).** В decompose добавляется `target_files[]`; планировщик ставит в одну волну только элементы с **непересекающимися** файлами → параллельная запись в одно дерево **без merge** (конфликтов физически нет).
- **A — `worktree` (опция для тяжёлых случаев).** Каждый writer — в своём git worktree (`best-of-n-runner`) + ветка; после волны оркестратор последовательно сливает ветки, конфликты чинит фикс-субагент. Максимальный параллелизм, но платит сложностью merge.

Во всех вариантах review/triage параллельны и read-only в основном дереве; rewrite-петля при провале review/triage — per-item с лимитом `max_iterations_per_item`.

**Жизненный цикл элемента по волнам:**

```
Волна N    : writer(ы) → (merge при A) → элемент(ы) в gate=review
Волна N+1  : reviewers (read-only, параллельно) → gate=triage
Волна N+2  : triagers (read-only, параллельно) → implement_passes
провал review/triage → gate=write → переписывание в следующей волне
```

---

## 3. Конфигурация (`config/project.json`)

Новый блок:

```jsonc
"parallel": {
  "enabled": true,
  "decompose": { "max": 4 },
  "implement": {
    "write_strategy": "serial",   // "serial" (C, старт) | "disjoint-files" (B) | "worktree" (A)
    "review_triage_max": 4
  }
}
```

- `parallel.enabled = false` → старый последовательный путь (для обратной совместимости и тестов).
- `scope` всегда обрабатывается последовательно (один артефакт) — планировщик включается только для `decompose` и `implement`.
- `write_strategy` управляет распараллеливанием записи implement; review/triage всегда параллельны (до `review_triage_max`).

---

## 4. Изменения по файлам

| Файл | Изменение |
|------|-----------|
| `config/project.json` | + блок `parallel` |
| `lib/gates.mjs` | `runScriptGate(...)` принимает явный `targetId` (fallback на cycle) |
| `lib/brief.mjs` | + `buildBriefFor({paths, project, role, phase, targetId, moduleId})` (пишет `state/briefs/<phase>-<role>-<id>.json`); + `buildWaveFollowup(...)`; общий `commonInputs()` |
| `lib/scheduler.mjs` | **новый** — `ensureParallelState`, `evaluateDecompose`, `evaluateImplement`, `planWave`, DAG-готовность, кап по `max_parallel`; для implement — кап writers по `write_strategy` (serial = 1) |
| `hooks/stop.mjs` | ветка `runSchedulerTick` при `parallel.enabled`, иначе legacy; `last-brief.json` → манифест волны |
| `prompts/orchestrator.md` | протокол волны: запустить N параллельных Task в одном сообщении, дождаться всех; для `write_strategy=worktree` — worktree + merge-шаг |
| `.cursor/skills/.../SKILL.md` | краткое описание волнового режима |
| `scripts/test-scheduler.mjs` | **новый** — тест параллельного режима (decompose-волна, DAG-готовность implement) |
| `scripts/test-stop-hook.mjs` | форсить legacy-режим (`parallel.enabled=false`), чтобы старый тест оставался зелёным |
| `scripts/test-all.mjs` | добавить запуск нового теста |

---

## 5. Формат батч-followup и `last-brief.json`

`state/last-brief.json` (манифест волны):

```jsonc
{
  "wave": true,
  "phase": "decompose",
  "max_parallel": 4,
  "generated_at": "…",
  "dispatches": [
    { "role": "write", "target_id": "MOD-X", "brief_path": "…", "template": "…", "outputs": ["…"], "subagent_type": "generalPurpose", "readonly": false, "reason": "…" }
  ]
}
```

Сообщение оркестратору (компактное, без инлайна полных шаблонов):
- «Запусти все N задач одним сообщением как параллельные Task-субагенты, дождись всех, затем заверши ход.»
- Только для `write_strategy=worktree`: инструкция по `best-of-n-runner` + последовательный merge-шаг + фикс-субагент при конфликте.
- Для каждой задачи: role, target, subagent_type, readonly, `brief_path`, `template`, `outputs`, `reason`.
- Общие констрейнты один раз: читать `prompts/implementation-constraints.md` (+ `ui-fidelity-rubric.md` для decompose/implement).

---

## 6. Модель контекста и исполнения

Важный вопрос: **«всё работает в одном контекстном окне Cursor?»** Ответ — частично, и это сделано осознанно.

### Два уровня контекста

1. **Оркестратор = одно главное окно чата.** Stop-hook-петля живёт в одной беседе: хук возвращает `followup_message`, который продолжает ту же сессию. Координация крутится в одном окне, и оно растёт по ходу прогона.
2. **Task-субагенты = отдельные изолированные окна.** Чтение IR-срезов, запись кода, ревью идут **внутри** субагента. В окно оркестратора попадает только короткий бриф-манифест + финальное summary субагента.

### Почему параллельность снижает давление на главное окно

Узкое место главного окна — **число ходов оркестратора**, а не объём работы (она изолирована в субагентах).

- Последовательно: ~13 модулей × 3 стадии ≈ **40+ ходов** decompose.
- Волнами (`max_parallel=4`): ~**3–4 волны** → в разы меньше ходов и записей в главном окне.

То есть распараллеливание *улучшает* ситуацию с контекстом оркестратора.

### Возобновляемость = настоящая защита от переполнения окна

Полный прогон (decompose + ~100 элементов implement) может упереться в лимит главного окна — но это верно и для текущего последовательного дизайна. Решение уже заложено: **всё состояние на диске, а не в контексте** (`cycle.json` с per-target гейтами, `output/decompose/*`, `output/reports/*`, `output/coverage/*`, `state/briefs/*`).

Поэтому петля **полностью возобновляема**: при разросшемся окне открываем **новый чат** → хук читает `cycle.json` и продолжает с того же места. Волна атомарна на диске, новый чат подхватывает следующую волну. Это разрывает связь «весь объём работы ↔ ёмкость одного окна».

**Итог:** петля — в одном окне, но лёгкая; тяжёлое — в отдельных окнах субагентов; полный прогон не обязан помещаться в одно окно благодаря дисковому чекпойнту.

---

## 7. Риски и смягчение

| Риск | Смягчение |
|------|-----------|
| Rate limits / стоимость растут с параллелизмом | настраиваемый `max_parallel` (старт = 4) |
| Один followup за ход | волновая модель: оркестратор сам запускает N фоновых/параллельных Task в одном ходе |
| Гонки на диске в implement | поэтапный `write_strategy`: старт `serial` (1 writer, без merge); далее `disjoint-files`; `worktree`+merge — опция |
| Сложность авто-merge worktree | отложена: включается только при `write_strategy=worktree`; merge делает оркестратор, конфликты → фикс-субагент; валидируем отдельно |
| Поломка действующего цикла | ленивая миграция состояния; legacy-путь за флагом; новые тесты + сохранение старых |
| Зависший субагент в волне | артефакт не появился → цель снова `needs-*`, переотправка с лимитом итераций по цели |

---

## 8. Порядок реализации

**Этап 1 — decompose-волна + implement стратегия C (`serial`):**

1. `config/project.json` — блок `parallel` (`implement.write_strategy = "serial"`).
2. `lib/gates.mjs` — `targetId` в `runScriptGate`.
3. `lib/brief.mjs` — `buildBriefFor` + `buildWaveFollowup` + `commonInputs`.
4. `lib/scheduler.mjs` — планировщик (decompose-волна; implement DAG с капом writers=1, параллельные review/triage).
5. `hooks/stop.mjs` — ветка `runSchedulerTick`, манифест волны.
6. `prompts/orchestrator.md` + `SKILL.md` — протокол волны.
7. `scripts/test-scheduler.mjs` + правки `test-stop-hook.mjs` + `test-all.mjs`; прогнать `npm test`.

**Этап 2 — implement стратегия B (`disjoint-files`) — ГОТОВО:** `target_files[]` добавлен в схему decompose и промпт; планировщик (`selectDisjointWriters`) группирует элементы с непересекающимися файлами в одну волну (без merge); элементы без объявленных `target_files` считаются «неизвестным следом» и ставятся в одиночку.

**Этап 3 — implement стратегия A (`worktree`) — ГОТОВО (логика):** при `write_strategy=worktree` планировщик берёт до `implement.max` писателей; followup даёт инструкцию по worktree + последовательному merge + фикс-субагенту на конфликт. Реальный merge на буилдящемся `provider-app/` валидируется на первом прогоне.

### Статус реализации

- **Этап 1 (decompose-волна + implement `serial`)** — реализован, тесты `test-scheduler.mjs` зелёные, проверен dry-run на реальном цикле (волна x4).
- **Этап 2 (`disjoint-files`)** — реализован, покрыт тестом непересекающегося выбора писателей.
- **Этап 3 (`worktree`)** — логика диспетчеризации и инструкции готовы; включается `write_strategy: "worktree"`.

Переключение стратегии записи — через `config/project.json` → `parallel.implement.write_strategy` (`serial` | `disjoint-files` | `worktree`), без изменения кода.

**Стратегия выката:** сначала только decompose-волна (низкий риск, главный выигрыш) на `write_strategy: "serial"`; убедившись на реальном прогоне — переключить на `disjoint-files` (после того как новые decompose-выводы получат `target_files`), при необходимости — `worktree`.
