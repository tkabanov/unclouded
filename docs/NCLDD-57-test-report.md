# NCLDD-57 — Test report: Voice Conversation mode

**Status: automated evidence complete; manual device QA not run yet.** Manual steps are in
`docs/NCLDD-57-test-plan.md`; fill the "Manual" column below as they are run.

## Automated evidence (2026-10-15)

- Vitest: full suite green (1521+ tests). NCLDD-57 suites: prompt extraction (byte-identical
  snapshots), pure realtime lib (105 tests, 98.8% branch coverage), controller + hook (52), edge
  handlers with an in-memory Supabase fake (70+), Conversation UI / toggle / page modes, history +
  finalize + crisis, AI Usage realtime panel/card.
- SQL proofs (run on the production database inside a transaction, rolled back):
  `realtime_voice_session_proof.sql` (T-025), `realtime_voice_feedback_proof.sql`,
  `realtime_voice_admin_reads_proof.sql` — **ALL PASS**.
- Deployed: `chat`, `realtime-voice`; post-deploy smoke: unauthenticated POST → 401, authenticated
  heartbeat with an unknown session → 404 `session_not_found`.
- Reviews: security, web-security, architecture, fidelity per slice (findings fixed) and a final pass
  on the combined diff `6cba868..HEAD` (2026-10-15): all four **GO**. Fixed in T-033: unknown/partial
  sessions no longer show "$0.00" in the cost breakdown; "Your transcript is saved." copy replaced
  (not guaranteed after a drop); keepalive token refreshed on each heartbeat; a heartbeat marks a
  `connecting` session connected (a modified client can't hide a call as "not connected"); generated
  `types.ts` includes `admin_ai_realtime_sessions`; DEPLOY.md lists all four migrations; client/server
  parity test for voices and end reasons; en-US date in the sessions tab (OVR-075).
  Residuals recorded (limitations §7, OVR-076): OpenAI echoes the full prompt to the browser in
  `session.created` (product decision); budget sees only reported usage.
- Browser preview (signed-in user, Chrome pane, mic blocked): pre-start screen, mic-denied error,
  dark theme (forced `.dark`), 375 px mobile width, Voice messages unchanged (resumed the existing
  unfinished voice conversation, no new conversation or AI call).

## DoD → evidence

| # | Definition of Done (NCLDD-57) | Automated / code evidence | Manual (test plan §) |
|---|---|---|---|
| 1 | Toggle Voice messages \| Conversation; voice messages still work | `VoiceSession.test.tsx`, `VoiceModeToggle.test.tsx`; preview smoke | §1 — not run |
| 2 | All plans can start Conversation | `REALTIME_CONVERSATION_MIN_TIER = 'free'`, `canUseRealtimeConversation` tests | §13.1 — not run |
| 3 | Start/end a live session, hear Kota, continue or interrupt | controller tests (start → live → end, interruption events), edge `start`/`end` tests | §2 — not run |
| 4 | UI states + animation driven by session events | `realtimeSessionMachine` tests, `RealtimeOrb` tests | §3 — not run |
| 5 | Live transcript in order; saved in history | `transcriptAssembler` / `persistQueue` tests, edge `transcript` tests, history tests | §4 — not run |
| 6 | Voice picked before start; no mid-session change promised | `realtimeVoices` tests, picker lock tests | §5 — not run |
| 7 | Platform instructions, prohibited topics, allowed sources | shared prompt builder snapshots + addendum placement tests; KB not connected (NCLDD-54) | §6 — not run |
| 8 | AI Usage shows Conversation separately, per-session usage/cost/duration | `realtime_voice_admin_reads_proof.sql` ALL PASS, `AiUsageRealtime.test.tsx` | §7–§8 — not run |
| 9 | Unconfirmed usage after a drop is not $0 | `deriveUsageStatus` tests, sweep proof, `realtimeSessionCostLabel` tests, admin proof (`null` total) | §9 — not run |
| 10 | API key only on the server | edge tests (no `sk-`/`client_secret`/instructions in responses), bundle grep | §11 — not run |
| 11 | Mic not asked/denied/unavailable, network loss, connect error, end, retry | controller tests per `getUserMedia` error name, connect timeout, disconnect grace, offline, mic lost, retry | §10 — not run |
| 12 | Realtime API limits documented with workarounds | `docs/NCLDD-57-realtime-limitations.md` §5, §7 | — |

## Known gaps (accepted / follow-up)

- Knowledge base retrieval not connected (tool channel ready; NCLDD-54).
- Kota does not speak first.
- Usage is client-reported (no server sideband); unconfirmed sessions are shown as partial/unknown.
- Frontend with Conversation mode is not deployed to production hosting yet.

## Manual QA log

| Date | Device / browser | Tester | Sections | Result / notes |
|---|---|---|---|---|
| 2026-10-15 | Chrome (Claude browser pane, mic blocked) + DB/logs | Claude | §1.1, §1.4, §3.3, §3.4 (pre-start), §5.3, §7.1–7.3, §8 (partial), §10.1–10.2, §10.6, §11.2–11.3 | Partial pass, 1 defect (QA-1). Details below. No voice: §2, §4, §5.1–5.2, §6, §9, §10.3–10.5, §10.7, §12, §13 still open. |
| | Chrome desktop (real mic) | | | |
| | iOS Safari | | | |
| | Android Chrome | | | |

### 2026-10-15 run (no-voice subset)

Pass:
- §1.1 Voice messages is default and resumes the unfinished voice conversation (an empty one gets the
  usual greeting — pre-NCLDD-57 behaviour). §1.4 toggle: URL `?mode=conversation` ↔ dropped; Voice
  messages resumes the same conversation id.
- §10.1 Hint hidden because the pane reports mic permission `denied` (shown only for `prompt` — needs
  a real browser). §10.2 Start with mic blocked → "Microphone access is blocked…" + Try again, muted
  orb (§3.3), no `realtime-voice` request.
- §10.6 (emulated `navigator.onLine=false` + `offline` event) → Start disabled, "You're offline…";
  re-enabled on `online`.
- §5.3 Cedar remembered after reload (`localStorage unclouded.realtimeVoice=cedar`).
- §3.4 375 px: no horizontal scroll, Start in the footer; dark theme OK (pre-start only).
- §7.1 card "Voice: messages vs conversation" present; Conversation $0.10 / 1 session = ledger sum
  $0.104. §7.2 row for the 09:09 UTC session: tokens match the DB (text 41275/27392/274, audio
  143/0/411), events 3/3 · 3/3, "Ended by user". §7.3 plan filter Pro → empty.
- §8 (DB only, session `8cb48a73`): 3 `realtime_response` rows for 3 Kota replies, 3
  `realtime_transcription` rows for 3 user turns, `chatMessage` rows carry `realtimeItemId` in order;
  response `costUsd` recomputed from `aiModelPricing` exactly (e.g. 0.06666). OpenAI dashboard
  comparison not done.
- §11.2 production build (`vite build`) grepped for `sk-…`, `OPENAI_API_KEY`, `api.openai.com`,
  `client_secret` — no matches. §11.3 `realtime-voice` function logs (24 h): only
  `instructions above soft limit { promptTokens: 16132 }` and `realtime hangup failed 404` — no key,
  prompt text or OpenAI bodies.

Defects / notes:
- **QA-1 (defect, §8.2):** `aiModelPricing` has no `token_in_1m` for `gpt-4o-mini-transcribe`
  (migration `20261014130000`). OpenAI reports 1 text input token per transcription, so every
  `realtime_transcription` row has `pricingMissing = true`; admin shows "no price set" on the model
  and on the session total. Fix: migration `20261015142903_realtime_transcribe_text_input_price.sql`
  (price row + re-price earlier rows) — applied to production 2026-10-15: 4 price rows, 6/6 transcription rows re-priced, admin no longer shows "no price set".
- QA-2 (minor): Realtime sessions "Started" uses local time (`toLocaleString` without
  `timeZone: "UTC"`) while the page says "UTC dates" (12:09 PM shown for 09:09 UTC). Fixed: shown in
  UTC with a "UTC" suffix; checked in the browser (9:09 AM UTC).
- QA-3 (noise): `end` → OpenAI `hangup` returns 404 ~6 s after the session ended (call already
  closed by OpenAI after the peer connection closed). Harmless; consider treating 404 as success.
- QA-4 (observation): prompt ≈ 16k tokens (above soft limit) → ~13.7k input tokens per response;
  the first response cost $0.067. `startedAt` → `connectedAt` took 15 s on that session — check in
  the real-mic run.
- QA-5 (minor UI): unselected toggle option has low contrast in dark theme.
