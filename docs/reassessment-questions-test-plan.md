# План тестирования: Reassessment Reflection Questions (Part 2)

**Источник (logic + Section 3 wording):** [`docs/Uncloud360_Reassessment_Questions.docx.md`](./Uncloud360_Reassessment_Questions.docx.md)  
**Authority для path-specific Q4 текстов:** [`docs/new_paths_content/Uncloud360_Canonical_Path_Library.md`](./new_paths_content/Uncloud360_Canonical_Path_Library.md) § Path-Specific Reassessment Questions  
**Дата:** 2026-08-06  
**Область:** четыре optional unscored reflection questions на 90-day reassessment; path-adaptive Question 4; persist → AI context + PDF.

> **Part 1** (User Profile Fields) в заголовке исходного spec упомянут, но в приложенном `.md` отсутствует — **вне scope** этого плана. Profile / About You — см. OVR-008 и settings QA.

---

## 1. Цели и объём

### 1.1 Цели

Проверить, что reassessment reflections соответствуют Part 2 spec + product overrides:

- После scored instrument показываются **ровно 4** optional reflections (не scored)
- **Q1–Q3** всегда — текст Section 3 из Reassessment Questions doc
- **Q4 default** (нет completed paths) — Section 3 default wording
- **Q4 path-adaptive:** если `completed_paths_count >= 1` → заменить **только Question 4** текстом для **most recently completed** path
- Path-specific текст = Canonical / `pathSession.reassessmentReflectionQuestion` (**не** устаревший Section 4 name list из Reassessment Questions doc — OVR-039)
- Ответы optional: пустые поля не блокируют complete
- Persist в `assessment_result` + `profiles.reassessmentReflections` / `onboardingData`
- Labels в UI results + PuP PDF используют adaptive prompt для Q4 (`pathAdaptiveQ`)
- Adaptive Q4 answer **не** пишется в `next_focus_text` (только default Q4)

### 1.2 Вне scope

- Scored instrument (Stability / Performance / Alignment / Orientation) — см. OVR-006; здесь только что reflections идут **после** scored steps
- Tier gate / 90-day due / Premium on-demand — [`docs/individual-subscription-test-plan.md`](./individual-subscription-test-plan.md)
- Path library catalog / enrollment — [`docs/path-library-test-plan.md`](./path-library-test-plan.md) (пересечение: PL-REA-*)
- Success Plan session content — [`docs/success-plans-test-plan.md`](./success-plans-test-plan.md) SP-SES-004 (отдельный Q4 catalog для SP)
- Full PDF narrative quality / Stripe billing

### 1.3 Приоритет источников

1. Явная инструкция в текущей задаче  
2. [`docs/product-overrides.md`](./product-overrides.md) — **OVR-039**, OVR-006, OVR-007, OVR-037  
3. Reassessment Questions Part 2 §§3–4 **logic** + Section 3 **wording**  
4. Canonical Path Library (Q4 text + path names)  
5. Phase2 / Bubble / Lovable reflection copy  

| Override | Implication for QA |
|----------|-------------------|
| **OVR-039** | Adaptive replaces **Q4** (slot index 3 / `reflection_q4`), not Q1. Q4 path texts = Canonical static strings on final session. Section 4 numbering/names в Reassessment Questions doc — **устарели**; не fail-ить продукт за mismatch с тем списком. |
| **OVR-006** | Scored steps = live onboarding (5+5+5+Orientation); reflections отдельно. |
| **OVR-007** | PDF: AI + jspdf; reflections section показывает question label + answer; adaptive Q4 label = `pathAdaptiveQ`. |
| **OVR-037** | Runtime path/session seed из Canonical batches — источник `reassessmentReflectionQuestion`. |

---

## 2. Каноническая логика (expected)

```
IF user has ≥1 pathEnrollment with status = completed
  THEN Q4 = reassessmentReflectionQuestion from most recently completed path
       (order: pathEnrollment.updatedAt DESC; question from highest-index session that has non-empty field)
  ELSE Q4 = Section 3 default
Q1, Q2, Q3 = Section 3 always
All four = optional, unscored
```

### 2.1 Standard Section 3 copy (exact)

| Slot | Field | Question text |
|------|-------|---------------|
| Q1 | `reflection_q1` | Looking back at the past 90 days, what has shifted most in how you show up — even if the change is small? |
| Q2 | `reflection_q2` | What has been the hardest part of this period, and what does that tell you about what you most need right now? |
| Q3 | `reflection_q3` | What are you most ready to let go of, change, or move past as you head into the next 90 days? |
| Q4 default | `reflection_q4` | If you could name one thing that would make the next 90 days meaningfully different from the last 90, what would it be? |

### 2.2 Path-specific Q4 authority

Ожидаемый текст для path #N — таблица в Canonical § Path-Specific Reassessment Questions (имена **Getting Through Hard Seasons**, **Burnout Recovery**, … — не «Stress Regulation Foundations» как #1 из устаревшего Section 4).

Spot-check минимум (совпадает с PL-REA-002):

| Tier sample | Canonical # | Path name |
|-------------|-------------|-----------|
| Free | 1 | Getting Through Hard Seasons |
| Free | 14 | Foundations of a Balanced Life |
| Pro | 18 | Leading Under Pressure |
| Premium | 52 | Sleep Mastery |

Полный DB audit 1–55 — REA-DB-002.

---

## 3. Тестовое окружение

### 3.1 Компоненты

| Компонент | Назначение |
|-----------|------------|
| `ReassessmentFlow` / `ReassessmentReflections` | UI steps + reflection form |
| `fetchPathAdaptiveReflectionQuestion` | Adaptive Q4 lookup |
| `completeReassessment` | Persist + `next_focus_text` rule |
| `assessment_result` columns | `reflectionQ1–4`, `pathAdaptiveQ`, `pathAdaptiveAnswer` |
| `generate-pup-pdf` + client PDF download | Report labels |
| Dashboard / ResultsComparison / ReassessmentResultsReview | Post-complete display |
| `path` / `pathSession.reassessmentReflectionQuestion` | Catalog Q4 seed |

### 3.2 Тестовые пользователи

| Email (пример) | Tier | Preconditions |
|----------------|------|---------------|
| `sub-pro@test.com` | Pro | Reassessment due (или seed `nextReassessmentDate` / backdate); ≥0 completed paths по кейсу |
| `sub-premium@test.com` | Premium | On-demand / due; Premium path completed для Q4 #52 |
| `sub-free@test.com` | Free | Только если Free может открыть reassessment в текущем entitlement (иначе Pro fixture) |

Password seed: `qwerty123` (см. individual subscription seeds).

### 3.3 Минимальный dataset

1. User **A**: 0 completed paths → default Q4.  
2. User **B**: 1 completed Free path (#1) → adaptive Q4 for #1.  
3. User **C**: ≥2 completed paths с разным `updatedAt` → Q4 = **most recent** only.  
4. User **D**: completed Premium #52 → Sleep Mastery Q4.  
5. User **E**: completed path **без** `reassessmentReflectionQuestion` на sessions → fallback к default Q4 (graceful).  
6. DB: все 55 library paths имеют non-empty Q4 на final session (Canonical).

---

## 4. ID-схема кейсов

| Префикс | Область |
|---------|---------|
| REA-STD-* | Standard Q1–Q4 wording / optional / unscored |
| REA-ADP-* | Adaptive Q4 selection logic |
| REA-DB-* | Seed / Canonical catalog integrity |
| REA-PER-* | Persist, next_focus, AI context |
| REA-PDF-* | PDF + results UI labels |
| REA-NEG-* | Edge / fallback / regression vs old slot |
| REA-SMK-* | Smoke / regression pack |

Пересечение с path library: **PL-REA-001 / PL-REA-002** — узкий subset; этот план — полный Part 2.

---

## 5. Standard reflections (Section 3)

### REA-STD-001 — Четыре optional reflections после scored steps — TESTED

| | |
|---|---|
| **Preconditions** | Pro/Premium user; reassessment accessible. |
| **Steps** | Start reassessment → пройти scored instrument → шаг Progress reflection. |
| **Expected** | Ровно 4 text fields; copy UI говорит что reflections **not scored**; можно Continue/Submit с пустыми полями. |

### REA-STD-002 — Exact Section 3 wording (Q1–Q4 default) — TESTED

| | |
|---|---|
| **Preconditions** | User **без** completed paths (или adaptive lookup returns null). |
| **Steps** | Открыть reflection step; сверить тексты Q1–Q4. |
| **Expected** | Exact match таблице §2.1 (включая em dash / punctuation). Нет legacy Phase2 / Lovable wording. |

### REA-STD-003 — Answers optional — partial fill — TESTED

| | |
|---|---|
| **Steps** | Заполнить только Q1 и Q3; оставить Q2/Q4 пустыми; complete reassessment. |
| **Expected** | Complete succeeds; stored: Q1/Q3 non-null; Q2/Q4 null/empty; results UI/PDF показывают только answered. |

### REA-STD-004 — Full fill persists all four — TESTED

| | |
|---|---|
| **Steps** | Заполнить Q1–Q4 уникальными маркерами (`REA-STD-004-q1` …); complete. |
| **Expected** | `profiles.reassessmentReflections` / `assessment_result.reflectionQ1–4` содержат маркеры; results review показывает те же answers. |

### REA-STD-005 — Reflections do not affect scores / classification — TESTED

| | |
|---|---|
| **Steps** | Два прогона с одинаковыми scored answers, разными reflections. |
| **Expected** | Scores / classification / trajectory одинаковые; отличаются только reflection columns. |

---

## 6. Adaptive Question 4 logic

### REA-ADP-001 — Zero completed paths → default Q4 — TESTED

| | |
|---|---|
| **Preconditions** | User with no `pathEnrollment` status=completed. |
| **Steps** | Reflection step. |
| **Expected** | Q4 = Section 3 default. Q1–Q3 unchanged. `pathAdaptiveQ` не сохранён (null). |

### REA-ADP-002 — One completed path → path-specific Q4 on slot 4 — TESTED

| | |
|---|---|
| **Preconditions** | Completed Canonical #1 Getting Through Hard Seasons; reassessment due. |
| **Steps** | Reflection step; проверить порядок слотов. |
| **Expected** | Q1–Q3 = Section 3. **Q4** (4-й слот / `reflection_q4`) = Canonical #1 text. Adaptive **не** на Q1 (regression vs pre–OVR-039). |

### REA-ADP-003 — Most recently completed wins — TESTED

| | |
|---|---|
| **Preconditions** | Completed path A earlier, path B later (`updatedAt` B > A). |
| **Steps** | Reflection step. |
| **Expected** | Q4 = Canonical question for path **B** only; no mention of path A in Q4 prompt. |

### REA-ADP-004 — In-progress enrollment ignored — TESTED

| | |
|---|---|
| **Preconditions** | One completed path + one in-progress (not completed). |
| **Steps** | Reflection step. |
| **Expected** | Q4 from **completed** path only; in-progress path name not in Q4. |

### REA-ADP-005 — Completing a newer path changes next reassessment Q4 — TESTED

| | |
|---|---|
| **Preconditions** | User had completed path A; then completes path B; triggers (or re-opens) reassessment before/after due as entitlement allows. |
| **Steps** | Reflection step after B completed. |
| **Expected** | Q4 switches to path B Canonical text. |

### REA-ADP-006 — Success Plan completed → SP-specific Q4 — TESTED

| | |
|---|---|
| **Preconditions** | Most recent completed = Success Plan (e.g. New Manager); see SP-SES-004. |
| **Steps** | Reflection step. |
| **Expected** | Q4 = that SP’s `reassessmentReflectionQuestion` (not a library-55 Canonical row, not default). Cross-ref success-plans plan. |

### REA-ADP-007 — Path name inside question matches Canonical path.name — TESTED

| | |
|---|---|
| **Steps** | Для sample paths из §2.2: UI Q4 содержит exact Canonical path name. |
| **Expected** | Нет legacy Section 4 names (e.g. Q4 для #1 **не** «Stress Regulation Foundations»). |

---

## 7. DB / catalog integrity

### REA-DB-001 — Final session has reassessmentReflectionQuestion for all 55 — TESTED

| | |
|---|---|
| **Steps** | SQL/Admin: для каждого library path (exclude success_plan) взять session с max `index`; проверить non-empty `reassessmentReflectionQuestion`. |
| **Expected** | **54/55** non-empty on Canonical authored paths. Stub **Clarity & Priority Reset** (OVR-037, `sessionsCount: 0`) has no session → Q4 N/A. «The Unsent Letter» is outside Canonical 55 (legacy extra). |
| **Fix** | PL-REA-003 `20260806120000_fix_canonical_reassessment_q4_by_name.sql` — Q4 by `path.name`. |

### REA-DB-002 — Text exact Canonical for spot matrix + audit sample — TESTED

| | |
|---|---|
| **Steps** | Сверить DB Q4 vs Canonical table for #1, #14, #18, #52; optionally full 1–55. |
| **Expected** | Exact Canonical string (allow typography: en-dash vs hyphen только если так в Canonical source). **Не** сверять с Reassessment Questions Section 4 name list. Match by **path name**, not Canonical # → `path-{n}` UUID. |
| **Note** | Prior id-shift bugs (#51–#55) in PL-REA-002; broader number/name swap fixed in PL-REA-003 — re-verify after migrations. |

### REA-DB-003 — No duplicate / swapped Q4 across paths — TESTED

| | |
|---|---|
| **Steps** | Group by `reassessmentReflectionQuestion`; find paths whose Q4 mentions a **different** path name than `path.name`. |
| **Expected** | 0 mismatches («You completed the X path» where X ≠ path.name). Allow Canonical #43 wording «Optimization Protocol» for path «The Optimization Protocol». |

### REA-DB-004 — Lookup uses most recent completed enrollment (API) — TESTED

| | |
|---|---|
| **Steps** | Call / observe `fetchPathAdaptiveReflectionQuestion` (network or unit) for user C from §3.3. |
| **Expected** | Returns `pathId` / question of most recent completed; `sessionId` of session that held the question. |

---

## 8. Persist / AI context / next focus

### REA-PER-001 — assessment_result stores reflections + adaptive columns — TESTED

| | |
|---|---|
| **Preconditions** | Adaptive Q4 case; fill all four answers. |
| **Steps** | Complete; read latest `assessment_result` for user. |
| **Expected** | `reflectionQ1–4` set; `pathAdaptiveQ` = adaptive prompt; `pathAdaptiveAnswer` = Q4 answer; `isInitial = false`. |

### REA-PER-002 — profiles.reassessmentReflections updated — TESTED

| | |
|---|---|
| **Steps** | After complete, read `profiles.reassessmentReflections`. |
| **Expected** | Same answers as submitted (`reflection_q1`…`reflection_q4`). |

### REA-PER-003 — Default Q4 → next_focus_text; adaptive Q4 → null next_focus — TESTED

| | |
|---|---|
| **Steps** | (a) No completed paths: answer Q4 «Focus marker». (b) Adaptive path: answer Q4 «Path reflection marker». |
| **Expected** | (a) `onboardingData.next_focus_text` = Focus marker. (b) `next_focus_text` = null; `path_adaptive_q` / `path_adaptive_answer` set. |

### REA-PER-004 — AI context receives reflections (smoke) — TESTED

| | |
|---|---|
| **Steps** | After reassessment with distinctive reflection text, open AI chat / trigger context assembly (or inspect edge prompt if accessible). |
| **Expected** | Reflection content (or reassessment_reflections / path_adaptive fields) available to AI context path used post-reassessment. Smoke only — не оценивать prose quality. |

---

## 9. Results UI + PDF

### REA-PDF-001 — Results review labels use adaptive Q4 prompt — TESTED

| | |
|---|---|
| **Preconditions** | Completed reassessment with path-adaptive Q4. |
| **Steps** | Open reassessment results / comparison reflections section. |
| **Expected** | Q4 question label = path-specific text (not default Section 3). Answers match. |

### REA-PDF-002 — Progress / client PDF reflections section — TESTED

| | |
|---|---|
| **Steps** | Download reassessment progress PDF (client jspdf path). |
| **Expected** | Reflections section: Q1–Q3 standard labels; Q4 label = `pathAdaptiveQ` when set; only non-empty answers included. |

### REA-PDF-003 — PuP 360 PDF (generate-pup-pdf) adaptive Q4 — TESTED

| | |
|---|---|
| **Preconditions** | Premium (or tier that gets diagnostic PDF); reassessment with adaptive Q4 + answers. |
| **Steps** | Generate / download PuP PDF. |
| **Expected** | Reflections block uses path-adaptive question string for Q4 field; answers present. OVR-007. |

### REA-PDF-004 — Empty reflections omitted from PDF — TESTED

| | |
|---|---|
| **Steps** | Complete with all reflections blank; download PDF. |
| **Expected** | No empty reflection blocks / no blank Q1–Q4 placeholders required. |

---

## 10. Negative / regression

### REA-NEG-001 — Adaptive must not replace Q1 (OVR-039 regression) — TESTED

| | |
|---|---|
| **Preconditions** | User with ≥1 completed path. |
| **Steps** | Reflection UI. |
| **Expected** | Q1 text = Section 3 Q1 always. Path-specific text only on Q4. |

### REA-NEG-002 — Missing session Q4 falls back to default — TESTED

| | |
|---|---|
| **Preconditions** | Completed path whose sessions have null/empty `reassessmentReflectionQuestion` (seed fixture or temp). |
| **Steps** | Reflection step. |
| **Expected** | Default Section 3 Q4; no crash; console may warn lookup failed / null — UI still usable. |

### REA-NEG-003 — Lookup failure does not block reassessment — TESTED

| | |
|---|---|
| **Steps** | Simulate schema/network failure on pathEnrollment/pathSession (or observe logged warn); continue flow. |
| **Expected** | Reflections still show (default bank); complete still works. |

### REA-NEG-004 — Do not fail against outdated Section 4 name list — TESTED

| | |
|---|---|
| **Steps** | Compare UI/DB Q4 for Canonical #1 vs Reassessment Questions doc Section 4 row #1. |
| **Expected** | Product uses **Getting Through Hard Seasons** Canonical text. Mismatch with doc Section 4 «Stress Regulation Foundations» is **PASS** under OVR-039, not a defect. |

### REA-NEG-005 — Legacy reflection field aliases still readable if present — TESTED

| | |
|---|---|
| **Steps** | If old profile has `whats_different` / `still_hard` / etc., open results that use `readReflectionAnswer`. |
| **Expected** | Legacy aliases map to q1–q4; no blank UI when only legacy keys exist. |

---

## 11. Smoke / regression pack

Минимальный прогон после изменений reflections / OVR-039 / Q4 seed migrations:

| ID | Case | Pass criteria |
|----|------|---------------|
| REA-SMK-001 | No paths → default Q4 | Exact Section 3 Q4 |
| REA-SMK-002 | Completed #1 → adaptive on **Q4** | Canonical #1 on slot 4; Q1 standard |
| REA-SMK-003 | Most-recent of two paths | Newer path Q4 only |
| REA-SMK-004 | Persist + results labels | `pathAdaptiveQ` + answers visible |
| REA-SMK-005 | DB spot #1 / #14 / #18 / #52 | Exact Canonical (PL-REA-002) |

---

## 12. Связь с другими планами

| Другой план | Что не дублировать |
|-------------|-------------------|
| `path-library-test-plan.md` PL-REA-* | Catalog Q4 sample — здесь глубже logic/UI/PDF |
| `success-plans-test-plan.md` SP-SES-004 | SP Q4 content |
| `individual-subscription-test-plan.md` | Who can open reassessment / upsell |
| Unit: `reassessment.reflections.test.ts` | Slot index + Section 3 strings — дополняет, не заменяет E2E |

---

## 13. Порядок выполнения (рекомендуемый)

1. **REA-DB-001 / REA-DB-002 / REA-DB-003** (дешёвый SQL audit — ловит seed swap рано)  
2. **REA-STD-002** + **REA-ADP-001 / 002** (copy + slot)  
3. **REA-ADP-003** (most recent)  
4. **REA-PER-001 / 003** (persist + next_focus)  
5. **REA-PDF-001 / 003** (labels)  
6. **REA-NEG-001 / 004** (OVR-039 regressions)  
7. Полный smoke §11  

---

## 14. Definition of done

- [ ] Section 3 Q1–Q4 default exact in UI  
- [ ] Adaptive replaces **only Q4** when ≥1 completed path  
- [ ] Most recently completed path drives Q4  
- [ ] Q4 texts for library 55 = Canonical (spot matrix + no name-swap)  
- [ ] Optional unscored; empty OK  
- [ ] Persist + PDF/results use `pathAdaptiveQ` for adaptive slot  
- [ ] Default Q4 → `next_focus_text`; adaptive → no next_focus from Q4  
- [ ] No failures filed against outdated Reassessment Questions Section 4 path numbering/names (OVR-039)  
