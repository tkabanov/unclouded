# NCLDD-57 — Realtime Voice Conversation: subtasks

> Agent briefs for YouTrack **NCLDD-57**. Each subtask is registered in ai-control (`.ai/control/tasks.json`, view `.ai/tasks.md`) under the ID shown below.
> **Read first:** `docs/NCLDD-57-implementation-plan.md` (design, decisions D1–D10, sections §N referenced below), `docs/product-overrides.md`, `.ai/PROJECT.md`.
> Rules for every subtask: code/comments/commits in English; commit straight to `main`, one commit per subtask (or per logical step); gates lint / test / build / typecheck from `frontend/`; **never apply a migration or deploy an edge function without PM review and an explicit user go**; do not touch the existing Voice messages flow (OVR-057) beyond what a subtask says.

## Dependency graph

```
T-024 S0 Spike ──┬──> T-025 S1 DB schema ──┬──> T-027 S3 Edge realtime-voice ──┬──> T-031 S6 History/finalize/crisis ──> T-033 S8 Docs+QA
                 │                         └──> T-032 S7 AI Usage admin ───────┤
                 ├──> T-026 S2 Prompt refactor ──> T-027                         │
                 └──> T-028 S4 Client lib ──> T-029 S5a Hook ──> T-030 S5b UI ───┘
```
Parallel-safe after S0: {S1, S2, S4}. After S1: {S3 (needs S2 too), S7}. S5a can mock the S3 API contract.

| ID | Slice | Mode | Depends on | Est. |
|---|---|---|---|---|
| T-024 | S0 Spike: verify Realtime API facts | max | — | 3 h |
| T-025 | S1 DB schema migration + types | ultracode | T-024 | 3 h |
| T-026 | S2 Shared server prompt builder + `voice_conversation` | max | T-024 | 2 h |
| T-027 | S3 Edge function `realtime-voice` | ultracode | T-025, T-026 | 6 h |
| T-028 | S4 Client pure realtime lib | max | T-024 | 4 h |
| T-029 | S5a Hook `useRealtimeConversation` | max | T-028 (T-027 contract) | 3 h |
| T-030 | S5b Conversation UI on `/coaching/voice` | max | T-029 | 4 h |
| T-031 | S6 History, finalize, crisis flow | ultracode | T-027, T-030 | 3 h |
| T-032 | S7 AI Usage: realtime split + sessions tab | ultracode | T-025 | 4 h |
| T-033 | S8 Docs, OVR-075, test plan, reviews, QA | max | all | 4 h |

---

## T-024 · S0 — Spike: verify Realtime API facts

**Goal.** Remove the unknowns before writing production code. Output is a document, not product code.

**Do**
1. Read the current official docs (Realtime, Realtime conversations, WebRTC, server controls, latency/cost, API reference for `session` object and server events).
2. Confirm and record:
   - current GA speech-to-speech model id(s) (docs example: `gpt-realtime-2.1`) and the mini variant; context window size;
   - input transcription model ids usable **inside** a realtime session and the exact config path (`session.audio.input.transcription`: `model`, `language` vs `languages`);
   - exact unified-interface request: `POST https://api.openai.com/v1/realtime/calls` multipart (`sdp`, `session`), response = SDP answer, `Location` header → `call_id`; confirm it works from Deno (`FormData` + `fetch`) with a throwaway script run **locally** (key from local env, never committed);
   - exact event names/fields: `input_audio_buffer.speech_started|stopped`, `conversation.item.added|created` (`previous_item_id`), `conversation.item.input_audio_transcription.delta|completed|failed` (+ `usage` shape), `response.created`, `response.output_audio_transcript.delta|done`, `output_audio_buffer.started|stopped|cleared` (WebRTC), `response.done.response.usage`, `error`; how session end at 60 min is signalled;
   - truncation config field names (`truncation`, `retention_ratio`, `token_limits.post_instructions`) and turn detection (`semantic_vad`, `create_response`, `interrupt_response`);
   - voice list and the "voice cannot change after first audio" rule;
   - official prices per 1M tokens (text in/cached/out, audio in/cached/out) for the chosen realtime model and the transcription model.
3. Measure the token size of the real system prompt that `buildSystemPrompt` produces for a voice session with the current production `platformAiSettings` (use `chat` prompt-test fixtures or a local script; do not call production endpoints with user data). Compare with the model context.
4. Note iOS Safari/Android Chrome autoplay requirements for remote WebRTC audio.

**Deliverable.** `docs/NCLDD-57-realtime-limitations.md` (sections: confirmed API facts with doc links, prices table, prompt-size measurement + recommendation, browser quirks, deviations from the plan). If any fact contradicts `NCLDD-57-implementation-plan.md`, add a "Plan corrections" section listing the affected subtasks.

**Acceptance.** Every "verify in spike" item in plan §2/§5.3/§8 has a confirmed answer or an explicit "not documented → workaround". No product code changed. No keys in git.

---

## T-025 · S1 — DB schema migration + types

**Goal.** All schema for NCLDD-57 except the admin read RPCs (those are in T-032).

**Files.** `supabase/migrations/20261014130000_realtime_voice_conversation.sql` (`20261014120000` was taken), `supabase/tests/realtime_voice_session_proof.sql`, `frontend/src/integrations/supabase/types.ts` (regenerated).

**Do** (plan §4.1–4.6, §4.8)
1. Header comment `-- NCLDD-57 realtime voice conversation. Additive only.`
2. `chatConversation` + `coachingSessionArchive` `sessionType` CHECK: add `'voice_conversation'` (drop + re-add constraint by its existing name). Do **not** widen `aiInsightSessionFact` / `aiMessageFeedback` (server maps to `'voice'`).
3. `chatMessage."realtimeItemId" text NULL` + partial unique index `("conversationId","realtimeItemId") WHERE "realtimeItemId" IS NOT NULL`.
4. Table `public."realtimeVoiceSession"` exactly as plan §4.3 (columns, CHECKs, FKs (`userId` CASCADE; `conversationId` nullable, SET NULL — see T-027 schema notes), indexes on `("userId","startedAt")`, `(status,"lastHeartbeatAt")`). RLS: own-row SELECT for `authenticated`; admin SELECT via `public.is_settings_admin()`; no client INSERT/UPDATE/DELETE; `REVOKE ALL … FROM anon`; `GRANT ALL … TO service_role`.
5. `aiUsageEvent`: add `"realtimeSessionId" uuid NULL REFERENCES "realtimeVoiceSession"(id) ON DELETE SET NULL`, `"externalEventId" text NULL`, `"audioInputTokens" int NOT NULL DEFAULT 0`, `"cachedAudioInputTokens" int NOT NULL DEFAULT 0`, `"audioOutputTokens" int NOT NULL DEFAULT 0`; unique `("realtimeSessionId","externalEventId")` where both not null; widen `"aiUsageEvent_source_check"` with `realtime_response`, `realtime_transcription` (same pattern as `20261013130000_ai_message_feedback.sql:112-120`).
6. `aiModelPricing` unit CHECK: add `audio_token_in_1m`, `audio_token_cached_in_1m`, `audio_token_out_1m`. Seed price rows **only with numbers recorded in T-024's doc** (cite the source in a comment). If prices are not confirmed, leave them out (UI shows "no price set").
7. `public.realtime_voice_sweep()` SECURITY DEFINER, `set search_path = public`, service_role only: mark stale `connecting|active` sessions (`lastHeartbeatAt < now()-interval '3 min'` or `expiresAt < now()-interval '5 min'`) as `status='ended', "endReason"='abandoned'`, set `endedAt`, `durationSeconds`, and `usageStatus` by the rules in plan §7.3. Schedule pg_cron job `realtime-voice-sweep` every 5 min (guard with `IF EXISTS` on the cron extension like other jobs in the repo).
8. Proof SQL: own session visible, other user sees 0, `authenticated` cannot insert/update `realtimeVoiceSession` or `aiUsageEvent`, unique `externalEventId` rejects duplicates, sweep sets `partial`/`unknown` correctly, `sessionType='voice_conversation'` accepted.
9. Regenerate `types.ts` (keep UTF-8; see T-021).

**Acceptance.** Migration is additive only; proof SQL passes on a branch/local DB; types compile; gates pass. **Stop before apply:** hand the SQL to PM for review; apply via Supabase MCP only after the user says go.

**Out of scope.** Admin RPCs (T-032), any edge/UI code.

---

## T-026 · S2 — Shared server prompt builder + `voice_conversation`

**Goal.** One prompt pipeline for chat and realtime; teach the server the new session type.

**Files.** `supabase/functions/chat/buildUserSystemPrompt.ts` (new), `supabase/functions/chat/index.ts`, `chat/prompt/chatContext.ts`, `chat/prompt/sessionLifecycle.ts`, `chat/prompt/generalRulesPrompts.ts` (or a new `chat/prompt/realtimeVoicePrompts.ts`), `chat/parseChatRequestBody.ts`, `_shared/aiUsage.ts`, tests in `frontend/src/lib/chat/`.

**Do** (plan §5.1)
1. Extract from `chat/index.ts` the sequence: load server profile + liveContext → resolve prompt library layers + `loadPlatformAiSettings` → `buildSystemWithLifecycle`. New `buildUserSystemPrompt({ userClient, serviceClient, userId, sessionType, lifecycle, conversationId, context?, voiceEmotionDetected? })` returns `{ system, profile, tier }`. `chat/index.ts` calls it; behaviour unchanged.
2. Snapshot test: for fixed fixtures (text, voice, session_open, with and without platform settings) the system prompt string is **byte-identical** before/after the extraction.
3. `voice_conversation`:
   - `parseChatRequestBody` accepts `sessionType: "voice_conversation"`;
   - `chatContext.ts:306` and `sessionLifecycle.ts:315,332`: treat as voice (Block 3.36);
   - add `REALTIME_VOICE_ADDENDUM` (short spoken answers, no markdown/lists/URLs, natural interruptions, never claim access to a library or sources unless a tool returned them), appended only for `voice_conversation`, placed **before** the platform-rules reminder and tone (keep OVR-070/071 order);
   - `_shared/aiUsage.ts` `modeForSessionType`: `voice_conversation → voice`;
   - insights/feedback writers: map `voice_conversation → 'voice'` where `aiInsightSessionFact` / `aiMessageFeedback` are written.
4. Add `REALTIME_CONVERSATION_MIN_TIER = 'free'` and `canUseRealtimeConversation(tier)` to `chat/tierGateHelpers.ts` (plan §5.5) + unit test (all tiers allowed today; helper honours a higher min tier when the constant changes).

**Acceptance.** Byte-identical snapshot passes; existing chat/voice tests green; new tests for addendum placement and mode mapping; gates pass. No migration, no deploy.

---

## T-027 · S3 — Edge function `realtime-voice`

**Goal.** Server side of the Conversation mode: session setup through the unified interface, usage/transcript/tool/heartbeat/end actions.

**Files.** `supabase/functions/realtime-voice/index.ts`, `…/handlers/*.ts`, `…/sessionConfig.ts`, `…/tools/registry.ts`, `…/usage.ts`, `supabase/config.toml` (`[functions.realtime-voice] verify_jwt = true`), `_shared/aiUsage.ts` (audio token units in `computeCostUsd`, `normalizeRealtimeUsage`), tests in `frontend/src/lib/realtime/edge/*.test.ts`.

**Do** (plan §5.2–5.5, §7.1–7.4)
1. Skeleton: OPTIONS/CORS inline (house style), `authenticateRequest`, `getServiceClient`, `jsonError`, dispatch on `body.action`, `consumeEdgeRateLimit` (start 6/min, others 120/min per user).
2. `start`: steps 1–10 from plan §5.2 table. Session config per plan §5.3 using names confirmed in T-024. Voice allowlist from T-024. Env: `OPENAI_API_KEY`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_TRANSCRIBE_MODEL` (defaults from T-024). OpenAI failure → 502 `{ code: 'realtime_unavailable' }` (log upstream status, not the body). Response contains **only** `{ realtimeSessionId, conversationId, sdpAnswer, model, voice, expiresAt, heartbeatSec, idleTimeoutSec }`.
3. `connected`, `heartbeat` (budget + max-duration `stop`), `end` (idempotent; computes `usageStatus` per plan §7.3).
4. `usage`: ownership + status window (active or ended ≤ 10 min), strict schema and caps, model taken from the session row, cost via extended `computeCostUsd` (text + audio units, `pricingMissing`), idempotent insert into `aiUsageEvent` (`source` `realtime_response|realtime_transcription`, mode `voice`, `realtimeSessionId`, `externalEventId`), bump reported counters. Record in background via existing `scheduleEdgeBackgroundWork` only if it keeps idempotency; otherwise inline.
5. `transcript`: ownership; items in order; crisis scan of each `user` item with existing `crisisDetect` (include last few saved turns as context); upsert `chatMessage` through the **user** client with `realtimeItemId` (`sender`/`isFromUser` as existing voice rows); on crisis set `chatConversation.hadCrisisEscalation=true`, end session `endReason='crisis'`, return `{ crisis: { level, text } }` with the same crisis text as chat.
6. `tool`: registry contract (plan §5.4); registry ships **empty**; unknown name → 200 `{ error: 'tool_not_available' }`; output trimmed. Session config includes `tools` only when the registry is non-empty.
7. Tests (mock OpenAI fetch + fake Supabase clients like `voiceBudgetGate.test.ts`): every action's happy path and auth/ownership failures; voice allowlist; Free cap; 402 budget; 409 active session; `realtime_unavailable`; no response body ever contains `sk-`, `client_secret`, or the instructions; usage idempotency/caps/model-from-session; transcript order + crisis; tool allowlist with a fake registered tool; `usageStatus` derivation; `computeCostUsd` audio units.
8. `supabase/functions/realtime-voice/DEPLOY.md`: secrets, deploy command (`supabase functions deploy realtime-voice --project-ref szkextipgpupqoppccoy`), deploy order, smoke steps.

**Schema notes from T-025 (security review).**
- `realtimeVoiceSession."conversationId"` is nullable, `ON DELETE SET NULL` (call/cost record survives a deleted conversation). Handle a session whose conversation is gone (`transcript` → 409/410, no write).
- No DB link between `userId` and `conversationId`: `start` must verify the conversation belongs to the caller; `transcript` must write only into the `conversationId` from the session row, never from the request body.
- `usage` / `heartbeat` / `end` / `tool` / `transcript`: always load the session by `id AND "userId" = caller` (otherwise a user could book events on, or pre-claim `externalEventId`s of, another user's session).
- `heartbeat` / `end` updates must include `WHERE status IN ('connecting','active')` so a session closed by `realtime_voice_sweep()` is not revived. The sweep is global (all users), cheap to call lazily at `start`.
- Idempotent writes: `chatMessage` upsert `onConflict: "conversationId,realtimeItemId"`; `aiUsageEvent` insert `onConflict: "realtimeSessionId,externalEventId"`, ignoreDuplicates.
- A user can change `sessionType` of their own conversation (owner UPDATE policy), so "same type" is not proof the conversation was created by the realtime flow.

**Acceptance.** Tests + gates pass; `security-reviewer` + `security-web-reviewer` + `architecture-reviewer` run on the slice with findings fixed. **Do not deploy** without PM review + user go.

---

## T-028 · S4 — Client pure realtime lib

**Goal.** All event/state logic as pure, fully tested TypeScript, no DOM/WebRTC.

**Files.** `frontend/src/lib/realtime/realtimeEvents.ts`, `realtimeSessionMachine.ts`, `transcriptAssembler.ts`, `persistQueue.ts`, `realtimeUsage.ts`, `realtimeVoiceApi.ts`, `realtimeVoices.ts`, `realtimeErrors.ts` + `*.test.ts`.

**Do** (plan §6.1, §6.4 detection column)
1. `realtimeEvents`: discriminated union for the server events confirmed in T-024; unknown events → `null`.
2. `realtimeSessionMachine`: reducer `(state, event) → state` with states `idle, requesting_mic, connecting, listening, user_speaking, thinking, speaking, ending, ended, error{kind}`; inputs are server events + local events (`mic_granted`, `mic_error{name}`, `rtc_state`, `start_failed{code}`, `user_end`, `max_duration`, `idle_timeout`, `crisis`, `budget_stop`).
3. `transcriptAssembler`: ordering by `previous_item_id`, delta accumulation by `item_id`/`content_index`, finalization rules, `interrupted` flag, out-of-order completion, failed transcription.
4. `persistQueue`: emits finalized items strictly in item order; Kota item waits for the preceding user item; timeout (configurable, default 8 s) → user item persisted as `[inaudible]`; dedupe by `itemId`.
5. `realtimeUsage`: map `response.done` / `transcription.completed` to the `usage` action payload; retry queue with backoff, dedupe by `externalEventId`; counters `responsesSeen/transcriptionsSeen`.
6. `realtimeVoiceApi`: typed wrappers for all `realtime-voice` actions; error parsing (402 → `formatMonthlyAiLimitMessage("voice")` / free-tier copy reuse from `chatSessionLimit.ts`, 409, 429, 502) into `RealtimeApiError{code}`; `end` also exposes a `keepalive` variant for `pagehide`.
7. `realtimeVoices`: voice list + display labels, default `marin`, `localStorage` read/write in try/catch.
8. `realtimeErrors`: map `getUserMedia` error names and API codes to user copy (plan §6.4).

**Acceptance.** ≥ 90% branch coverage on these modules; gates pass. No UI changes.

---

## T-029 · S5a — Hook `useRealtimeConversation`

**Goal.** Wire WebRTC + mic + data channel to the S4 lib.

**Files.** `frontend/src/hooks/useRealtimeConversation.ts` (+ small helpers under `frontend/src/lib/realtime/rtc/` if needed), tests with mocked `RTCPeerConnection`/`getUserMedia`.

**Do** (plan §6.2)
1. `start(voice, conversationId?)`: `getUserMedia(VOICE_INPUT_MEDIA_CONSTRAINTS)` → `RTCPeerConnection` + track → data channel `oai-events` → offer → `realtimeVoiceApi.start` → `setRemoteDescription` → `connected`; ICE/connect timeout 15 s.
2. Remote audio via `ontrack` → hidden `<audio autoplay>` + explicit `play()`; mic/remote `AnalyserNode` levels exposed as a smoothed 0..1 value (rAF, stop when idle).
3. Feed every data-channel message to `realtimeEvents` → machine, assembler, usage; flush `persistQueue` to `transcript`; react to `crisis` (send `response.cancel`, `output_audio_buffer.clear`, end).
4. Function calls: `response.done.output[type=function_call]` → `tool` → `conversation.item.create(function_call_output)` → `response.create`.
5. Timers: heartbeat (`heartbeatSec`), warning at expiresAt − 5 min, end at `expiresAt`, idle auto-end (`idleTimeoutSec`); handle `heartbeat.stop`.
6. Failure detection: `track.onended`, permission `change`, `pc.connectionState` (10 s grace on `disconnected`), `online/offline`, data-channel `error/close`.
7. `end(reason)`: wait ≤ 5 s for `output_audio_buffer.stopped` when reason is `budget_reached`; stop tracks, close pc, call `end`, then flush pending usage. `pagehide` → keepalive `end{reason:'abandoned'}`. Unmount always cleans up.
8. Returns `{ state, transcript, level, remainingMs, error, start, end, retry }`; `retry` reuses the same `conversationId` if not finalized.

**Acceptance.** Hook tests for start success, mic errors (each `name`), connect timeout, network loss, max duration, idle, crisis, cleanup on unmount; gates pass.

---

## T-030 · S5b — Conversation UI on `/coaching/voice`

**Goal.** Toggle + Conversation panel; Voice messages untouched.

**Files.** `frontend/src/pages/VoiceSession.tsx`, `frontend/src/components/voice/VoiceModeToggle.tsx`, `frontend/src/components/voice/realtime/{RealtimeConversationPanel,RealtimeOrb,RealtimeVoicePicker,RealtimeTranscript,RealtimeErrorNotice}.tsx` + tests.

**Do** (plan §6.3, §6.4)
1. `?mode=messages|conversation` (default `messages`); in `conversation` mode skip the OVR-057 bootstrap (no auto-resume/create). Switching modes stops any TTS (`stopKotaSpeech`) / ends a realtime session.
2. `VoiceModeToggle`: segmented **Voice messages | Conversation**, disabled during an active session (tooltip), respects `canUseRealtimeConversation` (lock + upsell hook point, unused today).
3. Panel states: pre-start (voice picker, **Start conversation**, offline/permission hints), active (orb, status label, remaining time, transcript, **End conversation**), ended/error (copy from `realtimeErrors`, **Start new conversation** / **Try again**, limit banner reuse from voice messages).
4. `RealtimeOrb` with `motion/react`: distinct visuals for Connecting, Listening, User speaking (mic level), Thinking, Speaking (Kota level), Error/Disconnected; `prefers-reduced-motion` fallback; `aria-live` status.
5. `RealtimeVoicePicker`: locked during a session with the hint "Voice can be changed for the next conversation".
6. `RealtimeTranscript`: ordered bubbles, live partial text, "interrupted" mark, auto-scroll.
7. Tests with a mocked hook: toggle behaviour, each state's copy and controls, picker lock, error notices, Voice messages panel still renders in `messages` mode.
8. Verify in the browser preview (desktop + mobile width, light/dark) and attach screenshots to the task checkpoint.

**Acceptance.** Old Voice messages flow works unchanged (manual smoke); gates pass; `fidelity-reviewer` run.

---

## T-031 · S6 — History, finalize, crisis flow

**Goal.** Finished conversations live in history like other sessions; safety parity with chat.

**Files.** `frontend/src/components/chat/ConversationThreadCell.tsx`, `ConversationPanelMount.tsx`, new `components/voice/realtime/RealtimeTranscriptReadOnly.tsx`, `frontend/src/lib/chat/chatSessionLifecycleApi.ts`, `chatConversationsApi.ts`, `useRealtimeConversation` (finalize call), crisis UI reuse, `supabase/migrations/20261015071908_realtime_voice_feedback_session_type.sql` (applied 2026-10-15 as `20261015071908`), `supabase/tests/realtime_voice_feedback_proof.sql`.

**Do** (plan §5.2 finalize note, §6.3 history, §6.5)
1. After `end`, call existing `session_finalize` with `sessionType: 'voice_conversation'` and the persisted transcript (session memory, `coachingSessionArchive`, memory facts, insights under consent). Toast "Conversation saved." Failure leaves the conversation unfinalized (same as voice).
2. `fetchLatestUnfinishedVoiceConversation` must keep filtering `sessionType='voice'` only (regression test).
3. History: badge **Conversation** for `voice_conversation`; panel mount opens a read-only transcript with "Start a new conversation" → `/coaching/voice?mode=conversation`; 👍/👎 on Kota messages works.
4. Crisis: when `transcript` returns `crisis`, show the same crisis block/resources as text chat, disable restart for the rest of the page session the same way chat does (follow existing chat behaviour; do not invent a new policy).
5. Tests: history badge/mount, finalize payload, crisis rendering, unfinished-voice filter.
6. Feedback session type (found in T-026): `public.set_ai_message_feedback` (`20261013130000_ai_message_feedback.sql:63`) maps `chatConversation."sessionType"` with `CASE WHEN … = 'voice' THEN 'voice' ELSE 'text' END`, so 👍/👎 on a `voice_conversation` reply is stored as `'text'`. New migration: `CREATE OR REPLACE` the function with the same signature, grants and body, only the CASE changed to `IN ('voice','voice_conversation')`. `aiMessageFeedback` CHECK stays `('text','voice')` (T-025 decision). Proof SQL: feedback on a `voice_conversation` message is stored as `'voice'`, on `text`/`voice` unchanged.

**Acceptance.** Gates pass; `security-reviewer` checks the crisis path and transcript write path (user RLS, idempotency). Feedback migration SQL to PM review before apply; apply only after the user says go.

---

## T-032 · S7 — AI Usage: realtime split + sessions tab

**Goal.** Admins see Realtime Conversation separately, per session, with honest unconfirmed usage.

**Files.** `supabase/migrations/20261014140000_realtime_voice_admin_reads.sql` (`20261014130000` is S1), `supabase/tests/realtime_voice_admin_reads_proof.sql`, `frontend/src/lib/settings/admin/adminAiUsageApi.ts`, `components/settings/admin/aiUsage/{AiUsageOverviewPanel,AdminAiUsageTab}.tsx`, new `AiUsageRealtimeSessionsPanel.tsx` + tests.

**Do** (plan §4.7, §7.3, §7.5)
1. `admin_ai_usage_overview`: add `byVoiceSurface: { voice_messages, realtime_conversation }` with cost, events, sessions, avg cost/session, avg duration, unconfirmed sessions count. Existing output keys unchanged (`CREATE OR REPLACE`, same signature).
2. New `admin_ai_realtime_sessions(p_from, p_to, p_tier, p_status, p_limit, p_offset)`: per-session rows per plan §4.7; SECURITY DEFINER, `set search_path = public`, `is_settings_admin()` guard (42501), `REVOKE … FROM PUBLIC, anon`, `GRANT EXECUTE … TO authenticated`.
3. Proof SQL: non-admin denied; admin sees rows; totals match `aiUsageEvent` sums; `partial/unknown` never reported as 0 cost.
4. UI: overview card "Voice: messages vs conversation"; 4th tab **Realtime sessions** with filters (period, plan, usage status), columns, pagination; unconfirmed usage = amber badge + tooltip, amount "≥ $X" (partial) or "—" (unknown); "not connected" sessions show $0 with that label.
5. Tests: mapper, panel rendering for each `usageStatus`, filters.

**Acceptance.** Gates pass; migration SQL to PM review before apply; `security-reviewer` (admin data exposure).

---

## T-033 · S8 — Docs, OVR-075, test plan, reviews, QA

**Goal.** Close the ticket with docs and evidence.

**Do**
1. `docs/product-overrides.md`: append **OVR-075** (Conversation mode: `voice_conversation`, no OVR-057 auto-resume, no close ritual, voice per device, all plans with gating helper, shared voice limit, usage statuses, crisis window, client `session.update` residual risk, KB pending NCLDD-54, deploy order). Update the examples list in `.claude/rules/product-overrides.md` only if needed.
2. Finalize `docs/NCLDD-57-realtime-limitations.md` (DoD: documented constraints + workarounds).
3. `docs/NCLDD-57-test-plan.md`: ticket QA checklist expanded into steps with expected results (old voice messages before/after, start/speak/interrupt/resume/end, visual states, transcript order, voice choice, rules/prohibited topics, KB note, AI Usage split, usage vs OpenAI logs incl. transcription, network drop → not $0, mic deny/revoke, key not in client/network, 60-min limit).
4. Run full reviewer set on the combined diff (security, security-web, architecture, fidelity); fix findings.
5. Manual QA in Chrome desktop + iOS Safari + Android Chrome; record results in `docs/NCLDD-57-test-report.md`.
6. Deploy runbook (only on user go): migrations → `chat` → `realtime-voice` + secrets → cron → frontend.

**Acceptance.** All DoD items in NCLDD-57 map to evidence in the test report; gates green; ai-control tasks finished/accepted.
