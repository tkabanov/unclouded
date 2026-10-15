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
| | Chrome desktop | | | |
| | iOS Safari | | | |
| | Android Chrome | | | |
