# NCLDD-57 — Realtime Voice Conversation Mode: implementation plan

**Date:** 2026-10-14 · **Base:** `main` @ `b3caaca` · **Spec:** YouTrack NCLDD-57 · **Related:** NCLDD-54 (Knowledge Base, backlog), OVR-057 / OVR-068…073
**Estimate in ticket:** 1d 7h. Realistic estimate for this plan: **~3–4 dev days** (see §12).

---

## 0. TL;DR

- Add a **Voice messages | Conversation** toggle on `/coaching/voice`. Voice messages (Whisper → chat → TTS, OVR-057) stay as they are.
- Conversation = OpenAI Realtime API (GA), **browser ↔ OpenAI over WebRTC**. Our server sets up the call with the **unified interface** (`POST /v1/realtime/calls`): the browser sends its SDP offer to our edge function, and the server forwards it with the standard key and returns only the SDP answer. **The browser never receives any OpenAI key, not even an ephemeral one.**
- Session instructions are built **on the server** by the same `buildSystemPrompt` pipeline as text/voice chat (Safety → platform rules + prohibited topics → base prompt → user context → rules reminder → tone).
- Tools (knowledge base retrieval) run **only on the server**, through a new `tool` action with an allowlist. **There is no knowledge base in the repo yet** (NCLDD-54 is in backlog). This ticket ships the server tool channel plus its contract. The `search_knowledge_base` tool is added together with NCLDD-54.
- Usage: each `response.done` and each input-transcription `completed` event is reported **one by one** to the server. The server checks it, prices it from `aiModelPricing` and writes `aiUsageEvent` rows (mode `voice`, new sources `realtime_response` / `realtime_transcription`). Each session's state is stored in a new `realtimeVoiceSession` table, including `usageStatus = complete | partial | unknown`. A lost connection is never recorded as $0.
- AI Usage gets a separate **Voice messages vs Realtime Conversation** split and a **per-session table**.
- Access: open to every plan through a single helper `canUseRealtimeConversation(tier)` (min tier = `free`), mirrored on server and client. Gating later is a one-line change.

---

## 1. Findings from the codebase (what exists today)

| Area | Fact | Where |
|---|---|---|
| Voice page | `/coaching/voice` → `VoiceSession.tsx` → `VoiceSessionPanel`. Push-to-talk, `MediaRecorder`, Whisper `whisper-1`, reply via `chat` edge (`sessionType:"voice"`), TTS `tts-1` voice `nova` | `frontend/src/pages/VoiceSession.tsx`, `components/voice/VoiceSessionPanel.tsx`, `hooks/useVoiceSessionRecorder.ts`, `supabase/functions/chat/voice/voiceEdgeHandlers.ts` |
| Bootstrap | Opening the page **auto-resumes/creates** a `voice` conversation (OVR-057) | `VoiceSession.tsx:75-95` |
| Animations | None besides `animate-pulse`. `motion/react` is installed but unused for voice | — |
| Mic errors | No dedicated handling (raw browser message in a toast) | `useVoiceSessionRecorder.ts:200-203` |
| Prompt | `buildSystemPrompt(profile, context, promptLayers, platformSettings, lifecycle)`. Loading profile/liveContext/layers/settings is **inline in `chat/index.ts`** | `supabase/functions/chat/buildSystemPrompt.ts:331`, `chat/index.ts:183-481` |
| Platform settings | `platformAiSettings` singleton, `loadPlatformAiSettings` (60 s cache, service role) | `supabase/functions/_shared/platformAiSettings.ts` |
| Knowledge base | **Does not exist** (no tables, vector stores, retrieval) | — (NCLDD-54) |
| Crisis | Code-level hard-stop before the AI reply (full-thread scan) | `chat/crisisDetect.ts`, `chat/index.ts` |
| Usage | `aiUsageEvent` (mode `text/voice/other`, source CHECK, tokens, `audioSeconds`, `ttsChars`, `costUsd`). Prices in `aiModelPricing` (units `token_in_1m`, `token_cached_in_1m`, `token_out_1m`, `audio_minute`, `tts_1m_chars`). **No audio-token units, no session id, no usage status** | `20261008120000_ai_usage_ledger.sql`, `_shared/aiUsage.ts` |
| Limits | Monthly USD per plan × mode (`check_ai_budget`), fails open. Free: 7 sessions/month (`consume_chat_session`, per conversation id) | `20261008130000_ai_usage_limits.sql`, `chat/tierGate.ts` |
| History | `/chat` sidebar lists all conversations. `sessionType==="voice"` opens `VoiceSessionPanel`. No retention job for chat data | `ConversationPanelMount.tsx:72`, `ConversationThreadCell.tsx:42` |
| `sessionType` CHECKs | `chatConversation` and `coachingSessionArchive`: `text|voice|quick_checkin`. `aiInsightSessionFact` and `aiMessageFeedback`: `text|voice` | migrations `20260717190000`, `20260720190000`, `20261013120000`, `20261013130000` |
| Edge conventions | `authenticateRequest`, inline CORS, `jsonError`, `body.action` dispatch (in other functions), `consumeEdgeRateLimit` | `_shared/supabase-auth.ts`, `_shared/edgeRateLimit.ts` |
| Tests | Vitest, edge modules are imported from `frontend/src/lib/**` tests. SQL proofs in `supabase/tests/` | `frontend/vitest.config.ts` |

## 2. OpenAI Realtime constraints (checked against official docs, 2026-10-14)

- GA interface. Browser = **WebRTC**. Data channel `oai-events`. Unified interface `POST /v1/realtime/calls` (multipart `sdp` + `session`, standard key, server-side) **or** ephemeral `POST /v1/realtime/client_secrets`. The `Location` header returns `call_id` (`rtc_…`).
- Example model in the docs: `gpt-realtime-2.1`. **Verify in the spike** and keep it in env `OPENAI_REALTIME_MODEL`.
- Voices: `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar` (docs recommend `marin`/`cedar`). **Once the model has emitted audio, the voice cannot be changed in that session.**
- **Max session = 60 min.**
- VAD: `audio.input.turn_detection` (`semantic_vad` / `server_vad`), `interrupt_response`, `create_response`. With WebRTC, unplayed audio is **truncated automatically** on interruption.
- Transcripts: user = `conversation.item.input_audio_transcription.delta|completed` (`item_id`, `content_index`; **order across turns is not guaranteed**, match by `item_id`). Kota = `response.output_audio_transcript.delta|done`.
- Usage: `response.done.response.usage` → `input_tokens`, `output_tokens`, `input_token_details{text_tokens,audio_tokens,image_tokens,cached_tokens,cached_tokens_details}`, `output_token_details{text_tokens,audio_tokens}`. Input transcription is billed **separately** (its own model) with `usage` in `…input_audio_transcription.completed`.
- Each response re-sends the whole conversation, so input grows from turn to turn. Controls: `truncation` + `retention_ratio`, `token_limits.post_instructions`. Changing instructions or tools mid-session busts the cache.
- Tools: `session.tools` (function), call → `response.done.output[type=function_call]` (`call_id`, `name`, `arguments`) → `conversation.item.create {type:"function_call_output"}` → `response.create`.
- Sideband (server WebSocket `wss://api.openai.com/v1/realtime?call_id=…`) is possible, but a Supabase edge function **cannot hold a 60-minute connection**. Not used in this ticket (see §10).

## 3. Key decisions

| # | Decision | Why |
|---|---|---|
| D1 | **Unified interface** (`/v1/realtime/calls` from our edge) instead of an ephemeral key | The browser gets no key at all. The server gets the `call_id` for audit. The session config (instructions/tools) is set only by the server. Fallback is ephemeral `client_secrets` if the unified path fails in the spike (D1-fallback) |
| D2 | New `chatConversation.sessionType = 'voice_conversation'` | A separate type of interaction: not auto-resumed by OVR-057 (filter `='voice'`), not opened in the push-to-talk panel, read-only transcript in history |
| D3 | Usage mode = `voice`, sources `realtime_response` / `realtime_transcription` | Shares the voice monthly limit (no new limit tables). The split in AI Usage comes from `source`. A separate limit can be added later (see Q1) |
| D4 | Usage is reported by the client **per event** to the server, which prices it itself | No sideband in edge. Reporting per event means a disconnect loses at most one in-flight response, which is then marked `partial`/`unknown` |
| D5 | Server-side prompt via the shared pipeline, extracted from `chat/index.ts` into `chat/buildUserSystemPrompt.ts` | One source of truth for rules/prohibited topics/tone. Chat output must stay **byte-identical** (test) |
| D6 | Server tool registry with an allowlist. KB tool after NCLDD-54 | KB access rights are enforced only by the server under the user's JWT. The realtime model never sees the library directly |
| D7 | **Crisis check on each final user transcript** on the server | Realtime replies without our code-level hard-stop. This closes the safety gap (see §6.5) |
| D8 | Messages are written in **item order** (persistence queue) | `chatMessage` has no seq. Order is by `createdAt`. A user transcript may complete after Kota's reply starts |
| D9 | Voice choice is stored in `localStorage` (per device), validated by an allowlist on the server | No migration on protected `profiles`. Enough for "for the next session" |
| D10 | No close ritual in Conversation mode: **End** → disconnect → background `session_finalize` | A realtime dialogue ends on the button. The ritual belongs to push-to-talk (log as an OVR) |

## 4. Database (one migration, additive only)

`supabase/migrations/20261014120000_realtime_voice_conversation.sql` (header: `NCLDD-57 … Additive only`):

1. **`sessionType` CHECKs**: add `'voice_conversation'` in `chatConversation` and `coachingSessionArchive`. In `aiInsightSessionFact` / `aiMessageFeedback`, **do not widen**. The server maps `voice_conversation → 'voice'` when writing there, so insights and feedback show it as voice.
2. **`chatMessage."realtimeItemId" text NULL`** + `UNIQUE ("conversationId","realtimeItemId") WHERE "realtimeItemId" IS NOT NULL` makes transcript writes idempotent.
3. **Table `public."realtimeVoiceSession"`**:
   - `id uuid pk`, `"userId" uuid → auth.users ON DELETE CASCADE`, `"conversationId" uuid NULL → chatConversation ON DELETE SET NULL` (T-025: the call/cost record survives a deleted conversation)
   - `"openaiCallId" text`, `model text`, `voice text`, `"transcriptionModel" text`
   - `status text CHECK (connecting|active|ended|failed)`, `"endReason" text CHECK (user_ended|max_duration|idle_timeout|network_lost|connect_failed|mic_lost|budget_reached|crisis|error|abandoned)`
   - `"usageStatus" text CHECK (pending|complete|partial|unknown) DEFAULT 'pending'`
   - `"responsesSeen" int`, `"responsesReported" int`, `"transcriptionsSeen" int`, `"transcriptionsReported" int`
   - `"startedAt"`, `"connectedAt"`, `"lastHeartbeatAt"`, `"endedAt"`, `"expiresAt"` (start + 60 min), `"durationSeconds" numeric` (connectedAt → endedAt)
   - `"planTierAtStart" text`
   - RLS: `SELECT` own rows only (no sensitive columns). INSERT/UPDATE only via service role (edge). `REVOKE ALL FROM anon`, admin SELECT via `is_settings_admin()`.
4. **`aiUsageEvent`**: new columns `"realtimeSessionId" uuid NULL → realtimeVoiceSession`, `"externalEventId" text NULL` (`resp_…` / transcription `item_id`), `"audioInputTokens"`, `"audioOutputTokens"`, `"cachedAudioInputTokens"` int default 0. `UNIQUE ("realtimeSessionId","externalEventId")` gives idempotency. Widen the source CHECK with `realtime_response`, `realtime_transcription` (drop + add, same pattern as `20261013130000`).
5. **`aiModelPricing`**: widen the unit CHECK with `audio_token_in_1m`, `audio_token_cached_in_1m`, `audio_token_out_1m`. Seed rows for the realtime model and the transcription model **from the official pricing page at implementation time** (never invent numbers; if a price is missing, use the existing `pricingMissing` → "no price set").
6. **Sweeper**: `public.realtime_voice_sweep()` (service role) marks `active|connecting` sessions with `lastHeartbeatAt < now() - 3 min` or `expiresAt < now() - 5 min` as `ended/abandoned`, and sets `usageStatus` (see §7.3). pg_cron every 5 min (`realtime-voice-sweep`). It is also called lazily at the start of each new session.
7. **Admin RPCs** (SECURITY DEFINER, `set search_path = public`, guard `is_settings_admin()`):
   - `admin_ai_usage_overview`: add `byVoiceSurface` = `{voice_messages, realtime_conversation}` (cost, events, sessions, avg duration, number of sessions with unconfirmed usage). Keep the old output keys unchanged.
   - New `admin_ai_realtime_sessions(p_from, p_to, p_tier, p_status, p_limit, p_offset)` → per-session rows: user (name/email as in Users panel), startedAt, duration, model, voice, endReason, usageStatus, text/audio in/out/cached tokens, transcription cost, response cost, total cost, responsesSeen/Reported.
8. Proof file `supabase/tests/realtime_voice_session_proof.sql`: own row visible, another user sees 0, a client cannot write `realtimeVoiceSession`/`aiUsageEvent`, a non-admin gets 42501 on the admin RPCs, the unique constraint on `externalEventId` holds.

Then regenerate `frontend/src/integrations/supabase/types.ts` (watch UTF-8, see T-021).

## 5. Server

### 5.1 Refactor: shared prompt builder (separate commit, before the new function)
- Move the "auth user → profile + liveContext → prompt layers + platform settings → `buildSystemWithLifecycle`" sequence from `chat/index.ts` into `supabase/functions/chat/buildUserSystemPrompt.ts` (`buildUserSystemPrompt({userClient, serviceClient, userId, sessionType, lifecycle, conversationId})`).
- `chat/index.ts` calls the new function. **Test:** for fixed fixtures the system prompt is byte-identical before and after (snapshot in `buildSystemPrompt.test.ts`).
- `sessionType: 'voice_conversation'` in `chatContext.ts:306` and `sessionLifecycle.ts:315,332` is treated as voice (Block 3.36 voice adaptation). Add a short **Realtime addendum** to the voice block: short spoken answers, no markdown/lists/URLs, allow interruptions, don't say "I'll check the library" if there's no tool.
- `_shared/aiUsage.ts:126` `modeForSessionType`: `voice_conversation → voice`.

### 5.2 New edge function `supabase/functions/realtime-voice/`
`verify_jwt = true` in `supabase/config.toml`. Dispatch on `body.action` (like `prompt-library`). CORS/`jsonError` are copied in the house style. All actions go through `authenticateRequest` + `consumeEdgeRateLimit` (start: 6/min, others: 120/min per user).

| Action | Input | What it does | Output |
|---|---|---|---|
| `start` | `{ sdpOffer, voice, conversationId? }` | 1) `canUseRealtimeConversation(tier)` (today: always true). 2) Validate `voice` against the allowlist. 3) Sweep stale sessions of this user. Max **1 active** session per user (409 `realtime_session_active`, with an option to `end` the old one). 4) Conversation: create a `voice_conversation`, or reuse the passed one if it belongs to the user, has the same type and `finalizedAt IS NULL` (Retry). 5) `consume_chat_session` (Free 7/mo, counted per conversation, so Retry is not charged twice). 6) `check_ai_budget(voice)` → 402 `ai_monthly_limit_reached`. 7) `buildUserSystemPrompt(...)` + realtime addendum + opening instruction. 8) Build the session config (§5.3). 9) `POST /v1/realtime/calls` (multipart). 10) Insert `realtimeVoiceSession` (connecting, expiresAt). | `{ realtimeSessionId, conversationId, sdpAnswer, model, voice, expiresAt, heartbeatSec, idleTimeoutSec }`. **No keys, no instructions** |
| `connected` | `{ realtimeSessionId }` | `status=active`, `connectedAt=now()` | `{ ok }` |
| `heartbeat` | `{ realtimeSessionId, responsesSeen, transcriptionsSeen }` | Updates counters and `lastHeartbeatAt`. Checks budget: if spent → `{ stop:'budget_reached' }`. If past `expiresAt` → `{ stop:'max_duration' }` | `{ ok, stop? }` |
| `usage` | `{ realtimeSessionId, kind:'response'|'transcription', externalEventId, model, usage }` | Ownership + status (active or ended ≤ 10 min ago). Strict schema: non-negative integers, sane caps (e.g. ≤ 200k tokens per event), `externalEventId` format. The model is taken **from the session**, not the payload (except transcription model, also from the session). Cost from `aiModelPricing`. Insert `aiUsageEvent` (idempotent). `responsesReported++` | `{ ok, duplicate? }` |
| `transcript` | `{ realtimeSessionId, items:[{ itemId, role:'user'|'assistant', text, interrupted? }] }` (sent in item order) | For each `user` item, **crisis scan** (`crisisDetect` over the new text + recent context). Upsert `chatMessage` with the user's RLS client and `realtimeItemId`. If crisis: `hadCrisisEscalation=true`, end the session (`endReason=crisis`) | `{ ok, crisis?: { level, text } }` |
| `tool` | `{ realtimeSessionId, callId, name, arguments }` | Session belongs to the user and is active. `name` is in the **server allowlist** (registry), args are validated by schema. Runs with the **user's** client (RLS). Output is trimmed (≤ N chars) and contains no ids/names of private sources. Unknown tool → `{ error:'tool_not_available' }` (never 500) | `{ output: string }` |
| `end` | `{ realtimeSessionId, reason, responsesSeen, transcriptionsSeen }` | `status=ended`, `endedAt`, `durationSeconds`, `usageStatus` (§7.3). Idempotent | `{ ok, usageStatus }` |

Finalizing the conversation uses the existing `chat` `session_finalize` with `sessionType:'voice_conversation'` (session memory, archive, memory facts, insights by consent). Call it from the client after `end`. If it fails, the conversation stays unfinalized, as with voice today.

### 5.3 Session config (server)
```jsonc
{
  "type": "realtime",
  "model": "<OPENAI_REALTIME_MODEL>",
  "instructions": "<buildUserSystemPrompt + realtime addendum + opening>",
  "audio": {
    "input": {
      "turn_detection": { "type": "semantic_vad", "create_response": true, "interrupt_response": true },
      "transcription": { "model": "<OPENAI_REALTIME_TRANSCRIBE_MODEL>", "language": "en" }
    },
    "output": { "voice": "<allowlisted voice>" }
  },
  "truncation": { "type": "retention_ratio", "retention_ratio": 0.8 },
  "tools": [/* from registry; empty until NCLDD-54 */],
  "tool_choice": "auto"
}
```
The exact field names (especially `truncation`, `transcription.language`) are **verified in the spike** against the API reference. Secrets: `OPENAI_API_KEY` (already exists), new optional `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_TRANSCRIBE_MODEL`.

### 5.4 Tool registry (`realtime-voice/tools/registry.ts`)
- Contract: `{ name, description, parameters (JSON schema), handler(ctx:{userClient, userId, conversationId}, args) → string }`.
- **Today the registry is empty.** The session goes out without `tools`, and the instructions say there is no library access (so the model doesn't make up "sources").
- NCLDD-54 adds `search_knowledge_base({query})`, which calls the **same** retrieval service as text chat (only `active && useInAI` sources, private sources without title/link, public ones with a title for voice attribution, no URLs). This ticket does not build retrieval itself.
- Tests: the contract with a fake tool (allowlist, schema, ownership, trimming, an unknown name).

### 5.5 Access (gating later without rework)
- `chat/tierGateHelpers.ts`: `REALTIME_CONVERSATION_MIN_TIER = 'free'`, `canUseRealtimeConversation(tier)` via `tier_rank`. Used by `realtime-voice` `start`. 402 `realtime_conversation_tier_required` is already wired, but can't trigger today.
- Client: `frontend/src/lib/entitlements/realtimeConversationAccess.ts` imports the same helper (shared edge module, the existing pattern). When it's false, the toggle shows Conversation with a lock and the upsell (`LockedFeatureKey` is added when gating is switched on, after widening `requiredTier`).

## 6. Client

### 6.1 Pure modules `frontend/src/lib/realtime/` (fully unit-tested)
- `realtimeEvents.ts`: typed parsing of the needed server events (unknown events are ignored).
- `realtimeSessionMachine.ts`: reducer. States: `idle → requesting_mic → connecting → listening ⇄ user_speaking → thinking → speaking → … → ending → ended`, plus `error{kind}`. Transitions on events: `input_audio_buffer.speech_started/stopped`, `response.created`, `response.output_audio.delta`/`output_audio_transcript.delta` (or `output_audio_buffer.started` if present), `response.done`, `output_audio_buffer.stopped`, the RTC connection state.
- `transcriptAssembler.ts`: keeps item order from `conversation.item.added/created` (`previous_item_id`) and appends deltas by `item_id`. A user item finalizes on `…transcription.completed`, a Kota item on `output_audio_transcript.done`. If Kota was interrupted, the text is cut to what was heard (the `interrupted` flag). Out-of-order completion across turns is handled.
- `persistQueue.ts`: sends finalized items to `transcript` **strictly in item order**. A Kota item waits for the user item before it. If a user transcript doesn't arrive within N seconds (transcription failed), the item is skipped with a `[inaudible]` placeholder rather than blocking.
- `realtimeUsage.ts`: extracts `usage` from `response.done` and `…transcription.completed` into the `usage` action format. Retries with backoff, keyed by `externalEventId` (idempotent).
- `realtimeVoiceApi.ts`: `start/connected/heartbeat/usage/transcript/tool/end` calls to `functions/v1/realtime-voice` (Bearer, parses 402/409/429/5xx into typed errors, reusing `formatMonthlyAiLimitMessage("voice")`).
- `realtimeVoices.ts`: voice list + labels, default `marin`, `localStorage` with try/catch.

### 6.2 Hook `frontend/src/hooks/useRealtimeConversation.ts`
- `getUserMedia(VOICE_INPUT_MEDIA_CONSTRAINTS)` → `RTCPeerConnection` (+ addTrack) → `createDataChannel('oai-events')` → `createOffer` → `start` → `setRemoteDescription(answer)` → `connected`.
- Kota's audio: `ontrack` → `<audio autoplay>` (Start is a user gesture, so autoplay works; `play()` is called explicitly for iOS Safari).
- Levels for the animation: `AnalyserNode` on the mic and on the remote stream (rAF, smoothed).
- Function calls: `response.done.output[function_call]` → `tool` → `conversation.item.create(function_call_output)` → `response.create`.
- Timers: heartbeat every 30 s, warning at 55 min, cut at `expiresAt`, idle 10 min without speech → automatic end (`idle_timeout`).
- Cleanup: `end` → stop tracks, `pc.close()`. On `pagehide`/`beforeunload`, `navigator.sendBeacon`/`fetch(keepalive)` with `end{reason:'abandoned'}`. Leaving the page/switching mode always closes the session (like `stopKotaSpeech` in OVR-057).

### 6.3 UI
- `pages/VoiceSession.tsx`: `?mode=messages|conversation` (default `messages`). In `conversation` mode the OVR-057 bootstrap (auto-resume/create) **is not run**. The conversation is created only on Start.
- `components/voice/VoiceModeToggle.tsx`: segmented control **Voice messages | Conversation**. Disabled while a session is active (tooltip "End the conversation to switch").
- `components/voice/realtime/RealtimeConversationPanel.tsx`: pre-start (voice picker + **Start conversation**), active (orb, status, timer, transcript, **End conversation**), ended/error (message + **Start new conversation** / **Try again**).
- `RealtimeVoicePicker.tsx`: select with labels. Hidden/read-only during a session with the hint "Voice can be changed for the next conversation".
- `RealtimeOrb.tsx`: `motion/react`. Each state has its own animation (Connecting = slow rotation/dim, Listening = soft breathing, User speaking = scale from mic level, Thinking = shimmer/pulse, Speaking = scale from Kota's level, Error = static, muted color). `prefers-reduced-motion` → no scale, only color/label. `aria-live="polite"` status text.
- `RealtimeTranscript.tsx`: bubbles in order, live text with partial deltas, an "interrupted" mark, auto-scroll.
- History: `ConversationThreadCell` shows a **Conversation** badge for `voice_conversation`. `ConversationPanelMount` opens a **read-only transcript** (`ChatMessagesList`) with a "Start a new conversation" button → `/coaching/voice?mode=conversation`. 👍/👎 on Kota replies works as in voice (feedback sessionType = `voice`).

### 6.4 Error matrix (DoD)
| Situation | Detection | UI / action |
|---|---|---|
| Permission not asked yet | `navigator.permissions.query({name:'microphone'})` (where supported) | Hint before Start: "We'll ask for microphone access" |
| Permission denied | `NotAllowedError` / `SecurityError` | Instructions on how to allow the mic in the browser + **Try again** |
| No microphone | `NotFoundError` / `OverconstrainedError` | "No microphone found" + Try again |
| Mic busy | `NotReadableError` | "Microphone is used by another app" |
| Mic lost/revoked mid-session | `track.onended`, permission `change` | End the session (`mic_lost`), the transcript is kept |
| No network before start | `navigator.onLine === false` | Start disabled, "You're offline" |
| Network lost mid-session | `pc.connectionState` `disconnected` (10 s grace) → `failed`; `offline` | `network_lost`, end, Try again (new realtime session in the **same** conversation) |
| Setup failed | `start` 5xx/`realtime_unavailable`, `setRemoteDescription` error, ICE timeout 15 s | `connect_failed`, Try again |
| Limits | 402 `ai_monthly_limit_reached` / `free_tier_session_limit`, `heartbeat.stop='budget_reached'` | Same banner as voice messages, Start disabled |
| Second tab | 409 `realtime_session_active` | "A conversation is already running in another tab" + "End it and start here" (deferred in S5b: no API ends another tab's session; the UI shows the message + Start new conversation) |
| 60 min | `expiresAt` timer / server close | "This conversation reached the 60-minute limit" + Start new conversation |
| Server error event | `error` on the data channel | Fatal ones end the session; the rest are logged |
| Crisis | `transcript` → `crisis` | `response.cancel` + `output_audio_buffer.clear`, end, show the same crisis block as text chat |

### 6.5 Safety (crisis)
Text chat has a code-level hard-stop **before** the reply. In realtime the model starts answering by itself, so the order is: (1) Safety Boundaries + crisis protocol are in the instructions (as in voice). (2) On each final user transcript, the server scans it, and on a hit the client cancels the reply, ends the session and shows crisis resources. **Known limitation:** the transcript can arrive after Kota has started replying, so there may be a short window before cancel (document it in the OVR).

## 7. Usage accounting

### 7.1 What is written
- For each `response.done` (any `status`, including `cancelled`, which is also billed): one `aiUsageEvent` with `source='realtime_response'`, `mode='voice'`, `model=session.model`, `inputTokens`, `cachedInputTokens`, `outputTokens`, `audioInputTokens`, `cachedAudioInputTokens`, `audioOutputTokens`, `realtimeSessionId`, `conversationId`, `externalEventId=response.id`.
- For each `…input_audio_transcription.completed` with `usage`: `source='realtime_transcription'`, model = transcription model, tokens or `audioSeconds` (whichever the API returns). `externalEventId=item_id`.

### 7.2 Cost
Extend `computeCostUsd` in `_shared/aiUsage.ts`: text in/cached/out × `token_*`, audio in/cached/out × `audio_token_*`. If any used unit has no price → `pricingMissing=true` (existing behaviour, shown as "no price set", not $0). `costIsEstimated=true` (as in OVR-072: the cost is our estimate from real tokens).

### 7.3 `usageStatus` of a session
- `complete`: `end` arrived, `responsesReported ≥ responsesSeen` and `transcriptionsReported ≥ transcriptionsSeen`.
- `partial`: some events were recorded, but the counters show missing events, or the session ended as `abandoned/network_lost` with `responsesSeen > responsesReported`.
- `unknown`: no usage event recorded, but the session had connected (`connectedAt` not null).
- A session that never connected (`connect_failed` before `connectedAt`) has a real cost of 0. This is the **only** case where 0 is shown, with the label "not connected".
- AI Usage shows `partial/unknown` as "Usage not confirmed" (amber badge + tooltip), and the amount as "≥ $X" for partial or "—" for unknown. Never $0.
- `pending` → after the sweeper: `abandoned` + `partial/unknown`.

### 7.4 Limits
Realtime counts against the **voice** monthly limit (`check_ai_budget(voice)` at `start` and on each `heartbeat`). If the limit is reached mid-session, the session is ended softly (Kota is not cut off mid-sentence: the client waits for `output_audio_buffer.stopped` ≤ 5 s). Fails open, as today.

**S3 change (security review):** `heartbeat` now closes the session and hangs up the OpenAI call itself on `budget_reached` / `max_duration`, so a modified client cannot ignore the stop. The client's ≤ 5 s drain still runs, but the server may cut Kota's last sentence.

### 7.5 Admin UI
- `adminAiUsageApi.ts`: types/mapper for `byVoiceSurface`, `fetchAdminRealtimeSessions`.
- `AiUsageOverviewPanel.tsx`: a **Voice: messages vs conversation** card (cost, sessions, avg cost/session, avg duration, unconfirmed count).
- New `AiUsageRealtimeSessionsPanel.tsx` (4th tab **Realtime sessions** in `AdminAiUsageTab`): a table with filters (period, plan, usage status), columns as in §4.7, pagination.

## 8. Context and cost control
- `retention_ratio` truncation (0.8). Instructions and tools don't change during a session (cache).
- 60-min ceiling + 10-min idle auto-end + monthly voice budget.
- History is **not** loaded into a new session (only session memory / user context through the prompt, as in chat). Retry within the same conversation starts with a clean realtime context + a short "continuing the conversation" note.
- **Prompt size risk:** the admin base prompt can be up to 100k characters, and the realtime model's context is limited. In the spike, measure tokens of the real prompt. If it is too large: (a) `token_limits.post_instructions`, (b) a compact voice variant of the user-data/context blocks. Document it in the limitations.

## 9. Product overrides and docs
- **OVR-075** in `docs/product-overrides.md`: Conversation mode (D2, D9, D10), all plans (D-gating), shared voice limit, crisis window, usage statuses, no KB until NCLDD-54.
- `supabase/functions/realtime-voice/DEPLOY.md`: secrets, deploy order, smoke test.
- `docs/NCLDD-57-realtime-limitations.md`: technical limits and workarounds (60 min, voice is fixed, no sideband in edge → client-reported usage, crisis window, prompt size, iOS autoplay, out-of-order transcription).
- `docs/NCLDD-57-test-plan.md`: the QA checklist from the ticket, step by step.
- ai-control: register the task (`node .claude/tools/ai-control.mjs …`, T-024 NCLDD-57), then `sync`.

## 10. Security and known limitations
- The standard key is used only in `realtime-voice` (`Deno.env`). Tests: no response of any action contains `sk-`/`client_secret`/`instructions`. Grep the built bundle for `sk-`, `OPENAI`.
- **Client-reported usage:** the browser can understate its own usage (affects only its own budget/statistics). Mitigations: per-event caps, counters vs `responsesSeen`, `partial/unknown` statuses. The full fix is a sideband server worker (`wss …?call_id=`) outside Supabase edge. That is a separate task if the client needs audit-grade accounting.
- **The client can send `session.update`** over the data channel (change instructions). This affects only the user's own session. KB rights stay safe because tools run only through the server allowlist under the user's JWT, and unknown tools are rejected. Write this as a residual risk in the OVR.
- `realtimeVoiceSession` has no sensitive columns. Own-rows RLS + isolation proof.
- Rate limits on `start` (cost protection) and 1 active session per user (check at `start` + partial unique index, migration `20261015120000`).
- **S3 security review (T-027) mitigations:** stops enforced server-side (above); `start` hangs up the caller's swept (`abandoned`) calls younger than 65 min (the SQL sweeper can't hang up); Retry may reuse a conversation only after a recoverable end (`network_lost|connect_failed|mic_lost|error`) and at most 5 realtime sessions per conversation (bounds the Free per-conversation session count); self-reported `*Seen` counters are capped at connected seconds + 10. **Residual:** a client that never reports usage and never starts again keeps one call alive until OpenAI's 60-min cap; only server-side metering (sideband) closes that.

## 11. Tests
- **Unit (Vitest):** `realtimeSessionMachine`, `transcriptAssembler` (deltas, out-of-order completion, interruption, failed transcription), `persistQueue` (order, idempotency, timeout), `realtimeUsage` (all usage fields, no usage), `realtimeVoices`, `computeCostUsd` (audio units, pricingMissing), `usageStatus` derivation.
- **Edge handlers** (imported from `frontend/src/lib/realtime/*.test.ts`, as `voiceEdgeHandlers.test.ts` does): `start` (voice allowlist, tier helper, Free cap, 402 budget, 409 active session, OpenAI 4xx/5xx → `realtime_unavailable`, the response has no key/instructions), `usage` (ownership, schema/caps, idempotency, model from the session), `transcript` (ownership, order, crisis), `tool` (allowlist, unknown → error), `end` (statuses), `heartbeat` (stop on budget/max_duration).
- **Prompt:** byte-identical chat prompt after the refactor. `voice_conversation` gets the voice adaptation + realtime addendum + platform rules + tone.
- **Components:** `VoiceModeToggle`, `RealtimeConversationPanel` with a mocked hook (all states, error copy, picker locked during a session).
- **SQL proof:** §4.8.
- **Manual QA** with a real mic (Chrome desktop, Safari iOS, Android Chrome) following `NCLDD-57-test-plan.md`. Compare `aiUsageEvent` with OpenAI usage/logs for 2–3 sessions.
- Gates: lint / test / build / typecheck. Reviewers: `security-reviewer`, `security-web-reviewer`, `architecture-reviewer`, `fidelity-reviewer` (M/L slice, first-of-a-kind write path) → **ultracode** mode.

## 12. Slices (order and estimate)

| # | Slice | Contents | Estimate |
|---|---|---|---|
| S0 | **Spike** | Model and transcription model names; unified `/v1/realtime/calls` multipart from Deno; real event names/fields (`output_audio_buffer.*`, `transcription.completed.usage`, `truncation`); token size of our prompt; iOS Safari autoplay. Result: notes in `NCLDD-57-realtime-limitations.md` | 3 h |
| S1 | Migration + types | §4, proof SQL, regenerate types. **PM review of the SQL, apply only after a go** | 3 h |
| S2 | Prompt refactor | §5.1, snapshot test | 2 h |
| S3 | Edge `realtime-voice` | §5.2–5.5 + tests | 6 h |
| S4 | Client lib | §6.1 + tests | 4 h |
| S5 | Hook + UI | §6.2–6.4, toggle, orb, picker, transcript, errors | 7 h |
| S6 | History + finalize + crisis | §6.3 history, finalize, crisis flow | 3 h |
| S7 | AI Usage | §4.7 RPC, §7.5 UI + tests | 4 h |
| S8 | Docs + reviews + QA | OVR-075, DEPLOY, limitations, test plan, reviewers, manual QA | 4 h |

Total ≈ 36 h. Commits go straight to `main`, one per slice.

**Deploy order:** migration (after review + go) → `chat` (refactor + `voice_conversation`) → `realtime-voice` (secrets `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_TRANSCRIBE_MODEL`) → pg_cron sweeper → seed prices → frontend.

## 13. Open questions for the client (defaults so the work isn't blocked)

1. **Limit:** does Realtime share the monthly **voice** limit, or does it need its own? *Default: shares voice; the split is shown in AI Usage.*
2. **Knowledge base:** NCLDD-54 is in backlog. Do we ship Conversation now with the tool channel ready and connect KB retrieval with NCLDD-54? *Default: yes.*
3. **Free cap:** does a Conversation count toward the 7 Free sessions/month like voice messages? *Default: yes (Retry within the same conversation is not counted again).*
4. **Ending:** is the close ritual (goodbye + commitment) needed in Conversation mode? *Default: no, End ends immediately, then finalize.*
5. **Model:** full or mini realtime model (cost vs quality)? *Default: full, set by env, can be switched without a deploy.*
6. **Voices:** show all 10 or a curated set? *Default: all, `marin` by default.*
