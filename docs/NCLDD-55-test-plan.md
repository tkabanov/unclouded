# NCLDD-55 — Consent-based AI Insights and privacy controls: test plan

**Spec:** YouTrack NCLDD-55 · `docs/product-overrides.md` OVR-073 (takes precedence)
**Scope:** first-use consent dialog (text + voice), Settings → Profile switch, 👍/👎 on Kota replies,
session classification at finalize, revoke/retention, admin `/admin/ai-insights`.

Key rules under test (from OVR-073):

- Both consent answers open AI. The AI panel (and its opener) mounts only after an answer.
- Consent is stored per user + terms version; asked again when `AI_INSIGHTS_CONSENT_VERSION` is bumped.
- Only finalized sessions of users with current consent are classified; closed taxonomy only, no text.
- Revoke deletes the user's Insights facts at once; aggregates are computed on read.
- k = 5 distinct people for every number shown to admins; below k → hidden.
- Admin periods are normalized to whole closed weeks/months before today; all counts rounded to 5.
- Feedback counts only when given after the current consent.
- Admins never see messages, transcripts, audio, names, ids or links to conversations.
- Feedback metrics come only from explicit 👍/👎; no sentiment-based ratings.

---

## 0. Preconditions

1. Migrations `20261013120000`, `20261013130000`, `20261013140000` applied (after PM review), then `chat` deployed, then frontend.
2. `supabase/tests/ai_insights_proof.sql` run as postgres → `ai insights proof: ALL PASS`.
3. Accounts: **ADM** (admin), **U1..U6** (normal users), **UN** (normal user who declines).
4. SQL access to read `aiInsightSessionFact`, `aiMessageFeedback`, `aiInsightsConsentEvent`, `profiles`.

```sql
-- consent state
select id, "aiInsightsConsent", "aiInsightsConsentVersion", "aiInsightsConsentUpdatedAt"
from public.profiles where email in ('<u1>', '<un>');

-- facts per user (no text columns exist)
select "userId", "sessionType", "sessionDate", topics, "requestTypes", "concernThemes", "resourceIds"
from public."aiInsightSessionFact" order by "createdAt" desc limit 20;
```

## 1. First-use consent

| ID | Steps | Expected |
|---|---|---|
| C-1 | New user U1 → `/chat` | Dialog "Help improve Kota?" with two equal buttons; no X; Escape/outside click do nothing; Kota does **not** send its opener yet. |
| C-2 | C-1 → "Don't allow" | Dialog closes, chat opens, Kota's opener arrives. `aiInsightsConsent = false`, version 1, event `first_use`. |
| C-3 | New user U2 → `/coaching/voice` → "Allow anonymized analysis" | Voice session opens and works. `aiInsightsConsent = true`. |
| C-4 | U1 opens voice, U2 opens text chat | No dialog again (choice is shared by text and voice). |
| C-5 | Simulate network failure on save | Toast error, dialog stays, AI panel does not open. |
| C-6 | (Dev) bump `AI_INSIGHTS_CONSENT_VERSION` to 2 | Users with version 1 are asked again on next AI use. |

## 2. Settings → Profile

| ID | Steps | Expected |
|---|---|---|
| S-1 | U1 → Settings → Profile | "AI conversation analysis" card, switch off. |
| S-2 | Turn on | Toast; `aiInsightsConsent = true`, event `settings`. Next finished session gets a fact row. |
| S-3 | Turn off | Confirmation dialog; "Keep it on" changes nothing; "Turn off" → toast, all U1 facts deleted. |
| S-4 | Direct `update profiles set "aiInsightsConsent" = true` with the user's JWT | Value unchanged (covered by proof §1). |

## 3. Classification (text + voice)

| ID | Steps | Expected |
|---|---|---|
| P-1 | Consenting user finishes a text session (End session → commitment) | One `aiInsightSessionFact` row, `sessionType = text`, only taxonomy keys / catalog resource ids. |
| P-2 | Same for a voice session | Row with `sessionType = voice`. |
| P-3 | UN (declined) finishes a session | No fact row; no `insights_classify` ledger event. |
| P-4 | Session never finished | No fact row (documented limitation). |
| P-5 | `aiUsageEvent` after P-1 | Event `source = insights_classify`, `mode = other`; user's text/voice limit unchanged. |
| P-6 | Coach mentions a catalog resource by title | Its id appears in `resourceIds`; a made-up id never does. |

## 4. Feedback 👍/👎

| ID | Steps | Expected |
|---|---|---|
| F-1 | Click 👍 on a Kota reply (text) | Icon filled; reason chips (helpful advice / felt understood / clear next step) appear. Row in `aiMessageFeedback`. |
| F-2 | Pick a reason, then click 👎 | Rating switches to −1, reasons reset to 👎 list. |
| F-3 | Click the active rating again | Rating cleared (row deleted). |
| F-4 | Reload the conversation | Ratings persist. |
| F-5 | Voice session transcript | Same controls on Kota replies. |
| F-6 | User replies, optimistic/pending messages | No controls on user messages or unsaved replies. |

## 5. Admin AI Insights

| ID | Steps | Expected |
|---|---|---|
| A-1 | Non-admin opens `/admin/ai-insights` | Redirect to `/dashboard`; RPC returns 42501 (proof §3). |
| A-2 | ADM, period with < 5 consenting people | "About this data" says fewer than 5 people; no topics/requests/resources; feedback says not enough data. |
| A-3 | ≥ 5 consenting people with facts | Topics, trend, top-20 request types (generalized phrasings), concerns, resources, crisis-line count; sample = people / sessions / text / voice. |
| A-4 | A topic used by only 4 people | Not listed ("hidden" note shown). |
| A-5 | UN's sessions | Never counted (compare SQL counts with consent filter). |
| A-6 | U-revoked (S-3) | Disappears from all numbers on reload. |
| A-7 | Inspect the network response | No user ids, names, emails, conversation ids or message text. No links to chats anywhere on the page. |
| A-8 | Feedback with ≥ 5 raters | Helpful share, 👍/👎, rated replies, reasons (each ≥ 5 people). No ratings → block states none were collected, no invented score. |
| A-9 | Period > 366 days / custom inverted | Error "Period is too long." / "Invalid period." |
| A-11 | Pick 7 days, then custom range ending yesterday | Effective period shown as whole weeks; numbers identical; no "Today" option. |
| A-12 | Compare two ranges that differ by one day | Same numbers (no single-day delta). All counts are multiples of 5. |
| A-13 | User rates replies while declined, then opts in | Those earlier ratings never appear in feedback numbers. |
| A-10 | Existing `/admin/insights` (articles) | Unchanged. |

## 6. Regression

- Free 7-sessions limit and NCLDD-52 AI limits still block/allow as before.
- AI Usage → Overview still shows the plan filter.
- Chat/voice work for users created before the migration (they get the dialog once).
