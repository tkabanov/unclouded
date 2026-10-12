# NCLDD-55 — Consent-based AI Insights: test report

**Date:** 2026-10-12 · **Build:** `main` @ `b78bf5d` · **Env:** local frontend (`localhost:3000`) against linked Supabase project (`szke…`), migrations `20261013120000/130000/140000` applied, `chat` edge v85 · **Spec:** YouTrack NCLDD-55, `docs/product-overrides.md` OVR-073 · **Plan:** `docs/NCLDD-55-test-plan.md`

## Summary

Consent dialog (text + voice), Settings switch, revoke, 👍/👎 feedback, consent-gated classification and the admin AI Insights tab pass, including k=5 hiding, exclusion of declined / outdated-consent users and pre-consent ratings, rounding, closed-bucket periods and the no-identifiers boundary. **One defect:** the session classifier adds catalog resources the coach never mentioned, so "Most mentioned resources" is unreliable.

**Retest (2026-10-12, `main` @ `7d406e6`, `chat` redeployed):** BUG-1, UX-1, UX-2 fixed and verified (BUG-1 incl. a live session on the deployed `chat`) — see [Retest](#retest-after-fixes).

## Work items for the agent

### BUG-1 (must fix) — Classifier invents "mentioned resources"

**DoD affected:** "statistics on mentioned public resources" must reflect what Kota actually recommended.

**Repro**
1. Catalog has one resource (`resource.title = 'test'`, id `336714be-…`).
2. Consenting user finishes a text session where Kota never mentions any resource (user message happened to contain the word "test").
3. Consenting user finishes a voice session (`session_finalize`, `sessionType: "voice"`) whose transcript contains no resource and no word "test".

**Expected:** `aiInsightSessionFact.resourceIds = '{}'` in both.
**Actual:** both rows have `resourceIds = {336714be-…}`.

**Root cause (likely):** `supabase/functions/chat/insights/sessionInsightsClassifier.ts` only validates that returned ids exist in the catalog (`parseSessionInsightsPayload`, ~L102–110); with a tiny catalog the model (temperature 0) picks the only id. Nothing checks that the resource appears in the coach's turns.

**Suggested fix**
- After parsing, keep a resource id only if its title (case-insensitive, normalized whitespace) occurs in an **assistant** turn of the transcript; drop it otherwise. Pass assistant-only text (or speaker-tagged transcript) into the check.
- Optionally tighten the prompt: "Return an id only if the COACH named that exact title; when unsure return []".
- Unit test in `frontend/src/lib/aiInsights/sessionInsightsClassifier.test.ts`: catalog `[{id, title: 'test'}]`, transcript without the title (and with "test" only in a user turn) → `resourceIds = []`; coach naming the title → id kept.

**Acceptance:** both repro sessions produce `resourceIds = '{}'`; a session where Kota names a catalog title produces that id.

### UX-1 (nice to have) — Selected feedback reason is invisible after reload
Reason chips only show right after clicking 👍/👎 (`showReasons` state in `frontend/src/components/chat/ChatMessageFeedback.tsx`). After reload the rating persists but the chosen reason can't be seen or changed without clearing the rating (clicking the active thumb clears it). Consider showing the selected reason(s) as a small label, or reopening chips on a secondary click.

### UX-2 (nice to have) — Future dates are selectable in the custom range
`/admin/ai-insights` → Custom range lets you pick days after today; a future-only range shows "no complete week … yet" plus "Sample: fewer than 5 people", which reads like a data problem. Disable dates ≥ today in the picker (`frontend/src/components/settings/admin/aiInsights/AdminAiInsightsTab.tsx`) or drop the sample sentence when the period is empty.

## What passed

**Automated (`frontend/`)**: lint 0 errors (32 pre-existing warnings) · unit tests 1108/1108 (incl. the 6 NCLDD-55 test files) · build pass · typecheck: no new errors (182 pre-existing Deno-import errors in `supabase/functions/**` picked up by `tsconfig.app.json`).

**SQL (linked DB, as postgres)**
- `supabase/tests/ai_insights_proof.sql` → ALL PASS (rollback).
- `supabase/tests/ai_insights_qa_seed.sql` + `ai_insights_qa_smoke.sql` → ALL PASS (also run once as a single rolled-back transaction). ASSERT enforcement verified on the instance (deliberate `ASSERT false` fails). Covered: fact trigger drops writes without consent; admin period = whole closed weeks ending before today; 1-day shift → identical numbers; sample 6 people/12 sessions → 5/10; near-k items hidden (topic/request/reason with 4 consenting people + 1 declined / outdated-version / pre-consent source); only catalog resource ids in the payload, no emails/text/user or conversation ids; > 366 days / inverted → errors; today-only → suppressed; revoke deletes facts, is audited, sample falls below k; future consent version rejected; non-admin → 42501; users have no SELECT on facts.

**First-use consent (C-1…C-5)** — `sub-pro@test.com`
- `/chat` → New conversation: dialog "Help improve Kota?", two buttons, no close button, Escape and outside click do nothing, no `chat` request (opener) before an answer.
- Simulated network failure on save → toast "Couldn't save your choice…", dialog stays, AI not opened, nothing written.
- "Don't allow" → chat opens, opener arrives; DB `false`, version 1, one `first_use` event.
- Text and voice afterwards: no dialog again. Consent reset to NULL → `/coaching/voice` shows the dialog with the panel unmounted; "Allow anonymized analysis" → panel opens, DB `true`, `first_use` event.
- Mobile width (375 px): dialog fits, buttons stacked.

**Settings → Profile (S-1…S-3)** — "AI conversation analysis" card; on → toast + `settings` event; off → confirm dialog, "Keep it on" changes nothing, "Turn off" → toast "…records were deleted", user facts 0, `settings` event.

**Classification (P-1…P-5)**
- Declined user finishes a text session → archive written, `session_finalize` logged, **no** fact, **no** `insights_classify`.
- Consenting user, text session → one fact (`text`, keys only from the taxonomy, e.g. `workload_time / burnout_energy / work_life_balance`, `set_boundaries`, `burnout_risk / overwhelm`), `insights_classify` with `mode = other`.
- Voice session (`session_finalize` with `sessionType: "voice"` from the page; no microphone) → fact `voice`, `insights_classify` `other`. Repeated finalize → still one fact, one classifier call.

**Feedback (F-1…F-6)** — 👍 → reasons helpful advice / felt understood / clear next step; reason saved; 👎 → reasons switch to the 👎 list, row `-1 / too_long`; rating persists after reload; clicking the active rating deletes the row; no controls on user messages or replies still streaming; voice conversation reply rated → row `sessionType = voice`.

**Admin AI Insights (A-1…A-13)** — `admin-qa@test.com`, seeded data
- Non-admin `/admin/ai-insights` → redirected to the user's home (`/employer`).
- Last 30 days → "Period: 2026-09-07 → 2026-10-11 (UTC, whole weeks). Sample: about 5 people, 10 sessions (text 5, voice 5)"; topics Work stress / Burnout (team_conflict, career_growth hidden); weekly trend 09-28 / 10-05; top request types as generalized phrasings (manage_up hidden); concern "Feeling overwhelmed"; resource "test"; crisis lines 5 sessions; feedback ≈40 % helpful, 👍/👎 5/10, 15 rated replies from 5 people, reasons Helpful advice / Too generic (not_relevant, too_long hidden). All values match the seed after rounding (16 rated → 15, 6 up → 5, 10 down → 10, share 6/16 → 0.40), confirming the declined user and the pre-consent rating are excluded.
- Last 7 days → week 2026-10-05 → 10-11, voice "fewer than 5 people".
- No links, uuids, emails or message text on the page; raw RPC response contains only the catalog resource id.
- Future-only custom range → "no complete week … yet", feedback "Fewer than 5 people rated … no rating is shown" (no invented score).
- 2026-06-01 → 10-11 → monthly bucket, clipped to 2026-09-30 (open month excluded). API: > 366 days "Period is too long.", inverted "Invalid period.". Period options: Last 7 days / Last 30 days / Custom range (no "Today").

**Regression** — `/admin/insights` (articles) unchanged; AI Usage still has Period + Plan filters; no new console errors on the AI Insights page.

## Retest after fixes

**Build:** `main` @ `7d406e6` · `chat` edge function redeployed · local frontend `localhost:3000`.

**BUG-1 — pass**
- `parseSessionInsightsPayload` keeps a resource id only if its catalog title (case-insensitive, whitespace-normalized) occurs in a `Kota:` turn; `User:` turns never count. Prompt tightened ("exact title the COACH named; when unsure return []"). `AI_INSIGHTS_CLASSIFIER_VERSION` 1 → 2; consent version unchanged.
- New unit tests: title absent → `[]`; title only in a `User:` turn → `[]`; `Kota:` turn names the title → id kept; unknown id → dropped.
- Live check: `admin-qa@test.com` with consent on, text session `cd5e5bb5-dbf9-4928-a853-7fba101c8da0` (deadline stress + commitment; Kota named no resource; catalog still has `test`) → fact `text`, topics `work_stress / workload_time`, `classifierVersion = 2`, **`resourceIds = {}`**.
- OVR-073 updated (resource rule + known limitation: paraphrases are missed, very short titles can match by coincidence).

**UX-1 — pass (browser).** 👎 + "Too generic" on a Kota reply → after reload the label "Too generic" shows next to the active thumb; clicking it reopens the reason chips; clicking the active thumb still clears the rating and the label (row removed).

**UX-2 — pass (browser), one case not reproducible.** Custom range: today (2026-10-12) and later are disabled, 2026-10-11 is selectable. Range 10-08 → 10-11 → server widens to 2026-10-05 → 10-11, normal Period + Sample text. The "empty period → only the 'no complete … yet' sentence" branch could not be reached in the UI once future days are disabled (server widens to a closed week); verified by code review only.

**Automated:** lint 0 errors (32 pre-existing warnings) · unit tests 1112/1112 · build pass. SQL `ai_insights_proof.sql` ALL PASS, `ai_insights_qa_seed.sql` + `ai_insights_qa_smoke.sql` ALL PASS, `ai_insights_qa_cleanup.sql` run.

## Not tested
- Real microphone voice flow: the in-app browser can't play TTS and the voice panel keeps "Thinking…" until playback ends (`VoiceSessionPanel.tsx` ~L140, pre-existing). Voice opener was verified in DB; voice reply feedback was tested through `/chat?conversation=<voice id>`.
- Consent version bump re-prompt (C-6): not done on the shared DB; covered by `ai_insights_proof.sql` and `AiInsightsConsentGate.test.tsx`.
- Retention cron (13 months) and account-deletion cascade.
- Dark theme: the app has no `prefers-color-scheme` dark mode.
- Consent copy is still a DRAFT pending product/legal approval (OVR-073).

## Observations (not NCLDD-55)
- Admin console at 375 px: the sidebar takes ~45 % of the width and pages are squeezed into a narrow column (same on AI Usage).
- Opening `/coaching/voice` creates an empty voice conversation even if the consent dialog is left unanswered.

## Environment state after testing
- QA seed removed (`ai_insights_qa_cleanup.sql`): no `qa55-*` users, facts, feedback.
- `sub-pro@test.com` and `admin-qa@test.com`: consent reset to NULL, their consent events, facts and feedback deleted (DB matches pre-test: 1 pre-existing consenting user, 1 event, 0 facts, 0 feedback).
- Leftover conversations: `sub-pro@test.com` text `1a7a59e8-ec09-4175-b728-97a0715cee7f`, `976fb9b1-4cc8-4d81-a2f8-0dc830f44b6b`, voice `b0461669-ed13-4f82-8a5a-4adc80a7f858`; `admin-qa@test.com` empty voice `15036663-1276-4444-86d4-bea80da31fdf`.
- After the retest: `admin-qa@test.com` consent reset to NULL, its consent events and facts deleted (0/0), test 👎 rating cleared (0 feedback). Leftover conversation `cd5e5bb5-dbf9-4928-a853-7fba101c8da0` (text, finalized).
