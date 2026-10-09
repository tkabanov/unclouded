# NCLDD-52 — AI Usage dashboard and usage limits: test plan

**Spec:** YouTrack NCLDD-52 · `docs/product-overrides.md` OVR-072 (takes precedence over the client mock)
**Scope:** `/admin/ai-usage` (Overview / Limits / Users), `aiUsageEvent` ledger, plan/user limits, Restore,
audit log, server-side enforcement in `chat` (text + voice STT/TTS), client limit UX.

Key rules under test (from OVR-072):

- Basic = Free (`free / pro / premium`, label "Basic (Free)").
- Cost is an **estimate** (tokens / audio seconds / TTS chars × `aiModelPricing`); missing price → "no price set", $0.
- Mode: `text`, `voice`, `other` (`other` = unlinked generations; visible, never limited).
- Limit resolution: user override (Custom / Unlimited) for that mode → else plan × mode limit → else no limit.
- Month = UTC calendar month. Restore = spend baseline for current month; history, plan and other mode untouched.
- Enforcement before each AI reply (text turn / session open → HTTP 402 `ai_monthly_limit_reached`; voice STT/TTS).
  Close / close-ack / finalize / background calls are never blocked. Fails open on infra errors.
- Free 7-sessions/month limit (`consume_chat_session`) still works independently.

---

## 0. Preconditions

1. Migrations `20261008120000`, `20261008130000`, `20261008140000` applied **before** deploying `chat` and `generate-*`.
2. `aiModelPricing` has rows for the models in use (chat model, whisper, tts). Note one model intentionally without a price for case O-9 (or use an existing one if present).
3. Test accounts: **ADM** (admin), **U-FREE**, **U-PRO**, **U-PREM** (normal users, one per plan), **U-X** (spare, for isolation checks).
4. SQL access (SQL editor / `execute_sql`) to read `aiUsageEvent`, `aiLimitAuditLog`, `aiUserLimitRestore`.
5. Tiny limits make exhaustion fast: e.g. text $0.01, voice $0.01. Remember the current reply may overshoot slightly.

Reference queries (reuse in many cases):

```sql
-- spend per user / mode for the current UTC month
select "userId", mode, count(*), sum("costUsd")
from public."aiUsageEvent"
where "monthKey" = to_char(timezone('utc', now()), 'YYYY-MM')
group by 1, 2 order by 1, 2;

-- latest audit entries
select * from public."aiLimitAuditLog" order by "createdAt" desc limit 20;
```

---

## 1. Automated tests

### 1.1 Existing — must stay green

| Suite | Covers |
|---|---|
| `frontend/src/lib/settings/admin/adminAiUsage.test.ts` | nav registration, `resolvePeriod` (presets, custom, reversed dates), formatting (Xm Ys, USD, % change), `parseLimitAmount`, overview mapping, limit source labels, audit descriptions |
| `frontend/src/lib/admin/aiUsage.test.ts` | `computeCostUsd` (tokens, cached, whisper, TTS, unknown model, effective price date), `normalizeUsage`, `resolveConversationMode`, `checkAiBudget` (`other` skipped, blocks only on `allowed=false`, fails open), `recordAiUsage` (row shape, invalid conversation id, never throws) |
| `frontend/src/lib/chat/chatAiReplyStub.test.ts` | 402 `ai_monthly_limit_reached` → limit error (not the OpenAI quota message); other 402 keeps the generic message |
| `supabase/tests/ai_usage_limits_proof.sql` | non-admin rejection on every admin RPC and closed tables; plan limits, validation, no-change, audit actor; budget check (plan, custom, unlimited, isolation); Restore; read RPC shapes |

Run:

```bash
npm --prefix frontend run test
```

```bash
npm --prefix frontend run lint && npm --prefix frontend run build
```

`ai_usage_limits_proof.sql` — run as postgres in the SQL editor after the migrations; expect `ai usage limits proof: ALL PASS` (ends in ROLLBACK).

### 1.2 Gaps — added 2026-10-08

A-1…A-7 live in section 6 of `supabase/tests/ai_usage_limits_proof.sql`. A-8 extracted the chat budget
decision into `supabase/functions/chat/aiBudgetGate.ts` (tested in `frontend/src/lib/chat/aiBudgetGate.test.ts`).
A-9 → `frontend/src/lib/chat/voiceBudgetGate.test.ts`; A-10 → `frontend/src/lib/chat/chatAiLimit.test.ts`
(helpers + voice API error mapping; the composer / mic blocking itself stays in manual E-1 / E-5);
A-11 → `frontend/src/components/settings/admin/aiUsage/AiUsageLimits.test.tsx`.
A-12 is **not done**: the repo has no Playwright runner or seeded admin / user test accounts — covered manually by N-1…N-2, P-2, U-4, R-1, AU-1.

| # | Where | Test |
|---|---|---|
| A-1 | proof SQL | **Month boundary:** event with `monthKey` of the previous month does not count toward current spend; Restore baseline from a previous month does not apply. |
| A-2 | proof SQL | **Mode isolation for Restore and overrides:** Restore/override on `text` leaves `voice` used/remaining unchanged (and vice versa). |
| A-3 | proof SQL | `mode = 'other'` events count in overview totals but never in `check_ai_budget` for text/voice. |
| A-4 | proof SQL | Override `Custom → Plan default` deletes the override and the plan limit applies again; audit row written. |
| A-5 | proof SQL | Plan limit `null` (not set) → `check_ai_budget` allows regardless of spend. Limit `0` → blocks at first call. |
| A-6 | proof SQL | `admin_ai_usage_overview` with plan filter + date range: totals equal a direct `sum()` over `aiUsageEvent` for the same filter (incl. inclusive end date). |
| A-7 | proof SQL | Plan change mid-month: `planTierAtEvent` snapshot keeps old events under the old plan in Overview; the limit check uses the **current** plan. |
| A-8 | edge unit (`chat`) | Text turn / session open with `allowed=false` → 402 `{ code: "ai_monthly_limit_reached", mode }`, no OpenAI call; `session_close`, `close_ack`, `finalize` with `allowed=false` → still served and recorded. |
| A-9 | edge unit (voice) | STT and TTS handlers return the limit error when voice is exhausted; text exhaustion does not affect voice. |
| A-10 | frontend unit | `chatSessionLimit`: limit error disables composer / mic with the copy "You've reached this month's AI {text\|voice} limit. It resets on the 1st (UTC)."; Free 7-session message is still distinct. |
| A-11 | frontend unit | `AiUserLimitDialog` / `AiUsageLimitsPanel`: invalid value blocks Save; failed RPC shows an error and keeps the old value (no optimistic "saved"); "no change" toast when nothing changed. |
| A-12 | e2e (Playwright, optional) | Admin happy path: open AI Usage → set plan limit → open user → Custom → Restore → audit shows 3 rows. Non-admin opening `/admin/ai-usage` is redirected. |

---

## 2. Manual test cases

Legend: **Exp** = expected result. Record actual results and screenshots in `docs/NCLDD-52-test-report.md`.

### 2.1 Access and navigation

| # | Steps | Exp |
|---|---|---|
| N-1 | ADM → Admin console → More | **AI Usage** item right after AI Settings; opens `/admin/ai-usage` with tabs Overview / Limits / Users. |
| N-2 | U-FREE opens `/admin/ai-usage` directly | No access (redirect / denied); no data flashes. |
| N-3 | U-FREE in browser console calls each RPC: `admin_ai_usage_overview`, `admin_ai_usage_users`, `admin_ai_plan_limits`, `admin_set_ai_plan_limit`, `admin_set_ai_user_limit`, `admin_restore_ai_user_limit`, `admin_ai_user_limit_detail`, `admin_ai_limit_audit` | All rejected. Nothing changes in DB. |
| N-4 | U-FREE: `select` from `aiUsageEvent`, `aiPlanLimit`, `aiUserLimitOverride`, `aiUserLimitRestore`, `aiLimitAuditLog` via REST | Empty / denied (RLS closed). |
| N-5 | Reload page on each tab | Selected tab persists; no console errors. |

### 2.2 Data capture (ledger)

| # | Steps | Exp |
|---|---|---|
| L-1 | U-PRO: new text conversation, 2 messages, end session | Rows in `aiUsageEvent`: `chat_turn`, `title`, `session_close`/`close_ack`/`finalize`, `memory_extract`/`arc_summary` as applicable — all `mode=text`, `planTierAtEvent=pro`, correct `conversationId`, `costUsd > 0`. |
| L-2 | U-PRO: voice session, speak 2 turns, end | `stt` (audioSeconds > 0), `tts` (ttsChars > 0), `chat_turn` — all `mode=voice`; close/finalize also `voice`. |
| L-3 | Quick check-in | Events `mode=text`. |
| L-4 | Trigger daily insights / journal reflection / PDF / Kota's Read / admin prompt test | Events `mode=other`, `conversationId` null. |
| L-5 | Compare `costUsd` of one `chat_turn` with tokens × `aiModelPricing` manually | Matches (6 decimals). |
| L-6 | Client sends a fake `sessionType=voice` for a text conversation (devtools) | Event mode follows stored `chatConversation.sessionType` (text). |

### 2.3 Overview tab

Fix a test period with known data (L-1…L-4) and compare every number with SQL.

| # | Steps | Exp |
|---|---|---|
| O-1 | Period **Today**, All plans | AI sessions and Active users match SQL (distinct conversations / users with events today, UTC). |
| O-2 | Total cost and avg cost/session | Total = `sum(costUsd)`; avg = total / sessions. Labelled **estimated**. |
| O-3 | Sessions & cost chart | Points per day match SQL; empty days shown as 0, not missing. |
| O-4 | Voice vs text split | Matches `mode` breakdown; `other` shown separately (not mixed into text). |
| O-5 | By plan (Basic (Free) / Pro / Premium) | Sessions and cost per plan by `planTierAtEvent`. |
| O-6 | Top users by cost | Name, sessions, amount; order desc; only this list identifies users. |
| O-7 | Avg duration text / voice | Format `Xm Ys`; plausible vs real session length (approx: start → finalize / last AI call). |
| O-8 | By model / provider | One row per model with cost and cost per session; sums equal total. |
| O-9 | Model without a price row | Shows "no price set", cost $0, does not break totals. |
| O-10 | Switch Last 7 days / Last 30 days | All cards and charts update together; % change vs prior period; no baseline shown when prior = 0. |
| O-11 | Custom range: start = end = a past date | Includes that whole day (inclusive end). |
| O-12 | Custom range reversed (end < start) | Dates swapped, data correct. |
| O-13 | Plan filter Pro | Every card/chart shows only Pro; switching back to All restores totals. |
| O-14 | Period with no data | Zeros / empty states, no NaN, no crash. |
| O-15 | Not in the build (OVR-072) | No Completion rate, User rating, "$600 budget", "% of active members". |
| O-16 | Simulate RPC failure (offline in devtools) | Error state shown; old numbers not presented as fresh. |

### 2.4 Limits tab (plan limits)

| # | Steps | Exp |
|---|---|---|
| P-1 | Open Limits on a clean DB | All 6 fields (3 plans × text/voice) empty = "not set". No default values. |
| P-2 | Set Basic text $10, Basic voice $5, Save | Saved, values shown after reload. Audit: 2 rows (plan, mode, `null → 10`, `null → 5`, ADM, time). |
| P-3 | Set Pro / Premium separately for text and voice | Each pair stored independently. |
| P-4 | Invalid input: `-1`, `abc`, `1.234`, `100000.01` | Save blocked, inline error. Nothing written. |
| P-5 | Boundary: `0`, `0.01`, `100000` | Accepted. |
| P-6 | Save without changes | "No change", no audit row. |
| P-7 | Clear a value (empty) and Save | Back to "not set"; audit `10 → null`. |
| P-8 | Save fails (offline) | Error toast; field does not show the value as applied; reload shows old value. |
| P-9 | Double-click Save | One change, one audit row. |

### 2.5 Users tab and user limit dialog

| # | Steps | Exp |
|---|---|---|
| U-1 | Open Users | Name, plan, sessions, month cost, text/voice limit, used, remaining, status (under / exceeded). |
| U-2 | Compare U-PRO row with SQL for the current UTC month | Sessions and used match; remaining = limit − used. |
| U-3 | User with no limit set | Limit "not set"/"no limit", remaining not shown as negative. |
| U-4 | Open U-PRO → text → **Custom** $0.02 | Dialog shows source "Custom" (vs "Plan default"); Users row updates; audit `user, text, plan → 0.02`. Voice unchanged. |
| U-5 | U-PRO → voice → **Unlimited** | Voice shows Unlimited; usage still counted; text keeps custom. Audit row. |
| U-6 | U-PRO → text → **Plan default** | Plan limit applies again, source label "Plan". Audit row. |
| U-7 | Other Pro users after U-4…U-6 | Still on plan limits (isolation). |
| U-8 | Invalid custom value | Same validation as P-4. |
| U-9 | Search / sort / paging (if present) | Works for large user lists. |

### 2.6 Enforcement (end-to-end)

Set U-FREE plan limits text $0.01, voice $0.01 (or a custom on the user).

| # | Steps | Exp |
|---|---|---|
| E-1 | U-FREE chats in text until spend ≥ limit | Next send → message "You've reached this month's AI text limit. It resets on the 1st (UTC)."; composer blocked; network: 402 `ai_monthly_limit_reached`, `mode: text`. Last reply may overshoot slightly. |
| E-2 | Admin Users tab for U-FREE | Status **exceeded** for text, remaining 0. |
| E-3 | U-FREE ends the session after E-1 | Close / finalize still work (not blocked); events recorded. |
| E-4 | U-FREE starts a **voice** session | Works — text exhaustion does not block voice. |
| E-5 | Exhaust voice | Mic blocked with the voice copy; STT/TTS return the limit error; session can still be ended. |
| E-6 | Open a new text conversation while text exhausted | Session open blocked with the same message. |
| E-7 | Background generations (insights, journal, PDF) for exhausted user | Still work (`other`, never limited). |
| E-8 | Free 7-session limit | Still enforced separately; its message differs from the AI-spend message. |
| E-9 | Unlimited (U-5) on exhausted mode | User can chat again immediately; spend keeps growing in Users/Overview. |
| E-10 | Custom limit higher than spent | User unblocked without Restore. |
| E-11 | Plan limit `0` | First AI reply in that mode blocked. |
| E-12 | Limit not set | No monetary blocking regardless of spend. |
| E-13 | Raise plan limit while user is blocked | Next send works (no client caching of the block beyond the session). |

### 2.7 Restore

| # | Steps | Exp |
|---|---|---|
| R-1 | U-FREE exhausted on text → Admin → Restore **text** | Confirm dialog; used = 0, remaining = full limit, status "under". Audit row (user, text, restore, ADM, time). |
| R-2 | U-FREE sends a text message | Works again. |
| R-3 | After R-1 check voice | Voice used/remaining unchanged. |
| R-4 | Check plan limits and other Free users | Unchanged. |
| R-5 | `aiUsageEvent` and Overview totals | History intact; month cost in Overview still includes pre-Restore spend. |
| R-6 | Restore voice separately | Same as R-1…R-5 for voice. |
| R-7 | Restore twice in a row | Second restore resets baseline to current spend; audit shows both; no error. |
| R-8 | Restore fails (offline) | Error; no "restored" toast; values unchanged after reload. |
| R-9 | Restore when user is not exhausted | Allowed; used resets to 0 (document actual behavior). |

### 2.8 Audit log

| # | Steps | Exp |
|---|---|---|
| AU-1 | After P-, U-, R- sections open the audit log | Every plan change, override (Custom / Unlimited / Plan default) and Restore listed: user or plan, mode, old → new, time, admin. |
| AU-2 | "No change" saves and failed saves | Not in the log. |
| AU-3 | Actor | Matches the logged-in admin (try with a second admin if available). |

### 2.9 Month boundary and time zone

| # | Steps | Exp |
|---|---|---|
| M-1 | SQL: insert / shift an event to last month (`monthKey` and `createdAt`) for U-FREE | Not counted in current used / remaining; visible in Overview for a range covering last month. |
| M-2 | Test around 00:00 UTC on the 1st (or shift data) | Month spend resets; Restore baselines from the previous month ignored. |
| M-3 | Admin browser in a non-UTC time zone (e.g. UTC+3) | Today / custom ranges follow UTC as documented; no off-by-one day. |

### 2.10 Regression

| # | Check |
|---|---|
| RG-1 | Normal text and voice chat for a user with no limits: no extra latency, no errors. |
| RG-2 | Session close / finalize / memory extraction still work. |
| RG-3 | OVR-070 / OVR-071 prompts (global prompt, Platform rules) unaffected. |
| RG-4 | Other admin tabs and AdminSidebar navigation work. |
| RG-5 | Fail-open: temporarily break `check_ai_budget` (e.g. revoke execute in a test DB) → chat still replies; error logged. |

---

## 3. Exit criteria

- All automated suites in 1.1 green; A-1…A-11 added and green (A-12 optional).
- All manual cases pass or have an accepted deviation recorded in OVR-072.
- Overview numbers match SQL for the test period (O-1…O-8).
- Non-admin cannot read or change anything (N-2…N-4).
- Open question to confirm with the client: limit-reached copy (OVR-072 marks it as "to be confirmed").
