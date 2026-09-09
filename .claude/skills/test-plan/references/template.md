# Test plan template (for `/test-list` + `/test`)

Copy this skeleton. Replace `{…}` placeholders. Keep section numbering consistent with existing plans in `docs/`.

---

```markdown
# План тестирования: {Feature title}

**Спека:** [`docs/{requirements}.md`](./{requirements}.md)
**Jira / tasks:** {optional links}
**Overrides:** {OVR-### list} — `docs/product-overrides.md`
**Код (ориентиры):**

| Область | UI / API |
|---|---|
| {Area} | `{route}`, `{Component}`, `{apiModule}` |

## How to run

- Manual / browser: `/test-list docs/{kebab}-test-plan.md` или `/test <ID>`
- Actor {Role}: {who} — {what they test}
- Seed / deploy: {migrations, scripts, edge deploy notes}

---

## 1. Цели и объём

### 1.1 Цели

{1–3 sentences: what "done" means for QA}

### 1.2 In scope / Out of scope

| In scope | Out of scope |
|---|---|
| … | … |

### 1.3 Приоритет источников

1. Явная инструкция в текущем чате
2. [`docs/product-overrides.md`](./product-overrides.md) — {OVR-###}
3. {requirements doc}
4. Bubble / Lovable / migration specs

### 1.4 Locked decisions — проверять как норму

| Тема | Expected |
|---|---|
| … | … |

---

## 2. Тестовое окружение

### 2.1 Компоненты

| Item | Value |
|---|---|
| Base URL | `http://localhost:3000` |
| … | … |

### 2.2 Тестовые акторы

| Actor | Пример | Для чего |
|---|---|---|
| Platform Admin | `admin-qa@test.com` | Admin CRUD |
| Premium user | `sub-premium@test.com` | Happy path |
| … | … | … |

Password для seed QA users: `qwerty123` (если применимо).

### 2.3 Минимальные данные для прогона

1. …
2. …

---

## 3. Рекомендуемый порядок прогона

| Фаза | Фокус | ~время | Сценарии |
|---|---|---|---|
| 0 | Access + UI | 15–30 мин | {PREFIX}-ACCESS-*, {PREFIX}-UI-* |
| 1 | … | … | … |

**Smoke (критичный путь):** {PREFIX}-ACCESS-002, {PREFIX}-…-001, {PREFIX}-E2E-001.

---

## 4. {First scenario group}

### {PREFIX}-ACCESS-001 — Non-admin denied

| | |
|---|---|
| **Preconditions** | Non-admin logged in (`sub-pro@test.com`) |
| **Steps** | Open `{protected route}` directly |
| **Expected** | Access denied (redirect / guard). Mutations blocked. |

### {PREFIX}-ACCESS-002 — Admin entry

| | |
|---|---|
| **Preconditions** | Platform Admin (`admin-qa@test.com`) |
| **Steps** | `/admin` → {section} |
| **Expected** | Section loads; list + primary actions visible. |

---

## N. End-to-end smoke

### {PREFIX}-E2E-001 — Critical journey

| | |
|---|---|
| **Preconditions** | {actors + seed state} |
| **Steps** | {ordered browser flow across screens} |
| **Expected** | {final observable state} |
```

---

## ID naming conventions

| Segment | Meaning | Examples |
|---|---|---|
| `{PREFIX}` | Feature code | `BK`, `REF`, `EAC-A`, `AIP` |
| `{AREA}` | Scenario group | `ACCESS`, `UI`, `SPEC`, `CRUD`, `ATTR`, `SUB`, `E2E`, `RULE` |
| `{NNN}` | Sequence within group | `001`, `002`, … |

Increment per group; never reuse an ID for a different scenario.

## What `/test-list` parses

**Runnable:** `### ID — Title` + following table until next `###` or `##`.

**Skipped:** intro tables, `##` section headers with child `###` items, headings containing `— TESTED`.

**On PASS:** `/test-list` appends ` — TESTED` to the heading — do not pre-mark new plans.

## What `/test` receives

For each item, `/test-list` passes roughly:

```text
{PREFIX}-ACCESS-001 — Non-admin denied
Preconditions: …
Steps: …
Expected: …
```

Write Steps/Expected so they stand alone without reading sibling scenarios.

## Anti-patterns

- ❌ `####` leaf scenarios — `/test-list` will not pick them up
- ❌ Bullet-only scenarios without `### ID` heading
- ❌ Vague Expected ("works correctly") — name UI text, URL, or API behavior
- ❌ Parent `##` section with its own Steps table **and** child `###` scenarios
- ❌ Mixing unit-test steps into browser scenarios without separate IDs
