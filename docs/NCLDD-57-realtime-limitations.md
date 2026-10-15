# NCLDD-57 — Realtime API: confirmed facts, limits and workarounds (spike T-024)

**Date:** 2026-10-14 · **Scope:** spike S0 for `docs/NCLDD-57-implementation-plan.md` · **No product code changed.**
`platform.openai.com/docs` now 301-redirects to `developers.openai.com/api/docs`; links below are the redirect targets.

Status legend: **CONFIRMED** (official docs), **NOT DOCUMENTED → workaround**, **PROBED** (verified by the live probe, §6).

---

## 1. Confirmed API facts

### 1.1 Models
| Fact | Value | Status | Source |
|---|---|---|---|
| GA speech-to-speech model | `gpt-realtime-2.1` (reasoning, tools, text/audio/image in, text/audio out) | CONFIRMED | [model card](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) |
| Mini variant | `gpt-realtime-2.1-mini` | CONFIRMED | [model card](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini) |
| Context / max output | 128,000 / 32,000 tokens (both). Session-level `max_output_tokens` = 1–4096 or `"inf"` (default `"inf"`), includes tool calls | CONFIRMED | model cards, [client events](https://developers.openai.com/api/reference/resources/realtime/client-events) |
| Endpoint | `v1/realtime` only | CONFIRMED | model card |
| Deprecated (do not use) | `gpt-realtime`, `gpt-realtime-mini`, `gpt-4o-*-realtime` — shut down **2027-01-20** | CONFIRMED | [deprecations](https://developers.openai.com/api/docs/deprecations) |

Env default: `OPENAI_REALTIME_MODEL=gpt-realtime-2.1` (switchable to `-mini` without code changes).

### 1.2 Input transcription inside a realtime session
- Path: `session.audio.input.transcription = { model, language?, languages?, prompt?, keywords?, delay? }`; `null` disables it. — CONFIRMED ([client events](https://developers.openai.com/api/reference/resources/realtime/client-events)).
- `language` = single ISO-639-1 string. `languages` (array) only for `gpt-transcribe` / `gpt-live-transcribe`, whose model cards **do not** list `v1/realtime` (docs inconsistent) → do not use.
- **Chosen model: `gpt-4o-mini-transcribe`** (default snapshot `2025-12-15`): its card lists `v1/realtime`, not on the deprecation list. — CONFIRMED ([model card](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe)).
- `whisper-1` and `gpt-4o-transcribe` shut down **2027-02-26** → not used here.

Env default: `OPENAI_REALTIME_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe`, config `{ model, language: "en" }`.

### 1.3 Unified interface (D1)
- `POST https://api.openai.com/v1/realtime/calls`, `multipart/form-data` with fields `sdp` (offer) and `session` (JSON), `Authorization: Bearer <standard key>`. Body of the response = SDP answer (text). Optional `OpenAI-Safety-Identifier` header. — CONFIRMED ([WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)).
- `Location: /v1/realtime/calls/rtc_…` → `call_id` = last path segment. — CONFIRMED ([server controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)).
- HTTP status and `Content-Type` are not documented; **PROBED:** `201`, `text/plain; charset=utf-8`. Still accept any 2xx and read `await res.text()`; non-2xx → `realtime_unavailable`.
- Call control: `POST /v1/realtime/calls/{id}/hangup` (no body), also `/accept`, `/reject`, `/refer`. — CONFIRMED ([calls reference](https://developers.openai.com/api/reference/resources/realtime/subresources/calls)). **Use `hangup` from the server** on `end`/crisis/budget stop — a server-side kill switch that doesn't rely on the client.
- Fallback (D1-fallback): `POST /v1/realtime/client_secrets` `{ expires_after?: {anchor:"created_at", seconds 10–7200}, session }` → `{ value:"ek_…", expires_at, session }`. — CONFIRMED ([client_secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets)). Not needed unless the probe fails.
- Sideband `wss://api.openai.com/v1/realtime?call_id=rtc_…` exists (standard key). Still not used: an edge function can't hold it for 60 min (plan §10 unchanged).
- Deno: the call uses only WHATWG `fetch` + `FormData`, identical in Deno and Node 24. **PROBED** from Node 24 (§6); Deno itself is checked on the first edge deploy (T-027).

### 1.4 Server events (data channel `oai-events`)
Source: [server events](https://developers.openai.com/api/reference/resources/realtime/server-events). All CONFIRMED unless noted.

| Event | Key fields |
|---|---|
| `session.created` / `session.updated` | `session` (first event / after update) |
| `input_audio_buffer.speech_started` / `speech_stopped` | `item_id`, `audio_start_ms` / `audio_end_ms` |
| `input_audio_buffer.committed` | `item_id`, `previous_item_id` (nullable) |
| `input_audio_buffer.timeout_triggered` | idle timeout (server_vad only) |
| `conversation.item.added` / `conversation.item.done` | `item`, `previous_item_id` (nullable) — GA lifecycle |
| `conversation.item.created` | still documented, `previous_item_id` — **docs inconsistent** which one fires → handle all three, dedupe by `item.id` |
| `conversation.item.input_audio_transcription.delta` | `item_id`, `content_index`, `delta` |
| `….completed` | `item_id`, `content_index`, `transcript`, `usage` |
| `….failed` | `item_id`, `content_index`, `error{code,message,type,param}` |
| `response.created` / `response.done` | `response` (`id`, `status`, `status_details`, `output[]`, `usage`) |
| `response.output_audio_transcript.delta` / `.done` | `response_id`, `item_id`, `output_index`, `content_index`, `delta` / `transcript` |
| `response.function_call_arguments.done` | `call_id`, `name`, `arguments` |
| `output_audio_buffer.started` / `stopped` / `cleared` | `response_id` (WebRTC/SIP only; `cleared` on interruption) |
| `rate_limits.updated` | — |
| `error` | `error{type, code?, message, param?, event_id?}` |

- Transcription `usage` is a union: `{type:"tokens", input_tokens, output_tokens, total_tokens, input_token_details{audio_tokens,text_tokens}}` **or** `{type:"duration", seconds}` → `realtimeUsage` must handle both (tokens → token columns, duration → `audioSeconds`).
- `response.usage`: `input_tokens, output_tokens, total_tokens, input_token_details{text_tokens, audio_tokens, image_tokens, cached_tokens, cached_tokens_details{text_tokens,audio_tokens,image_tokens}}, output_token_details{text_tokens,audio_tokens}`. Note: cached tokens are split per modality in `cached_tokens_details` — use it for `cachedInputTokens` vs `cachedAudioInputTokens`.
- `response.status`: `completed | cancelled | failed | incomplete | in_progress`; `status_details.reason`: `turn_detected | client_cancelled | max_output_tokens | content_filter`.

### 1.5 Session limits and end signal
- Max session **60 min** — CONFIRMED ([conversations guide](https://developers.openai.com/api/docs/guides/realtime-conversations)).
- How the end is signalled — **NOT DOCUMENTED → workaround:** (1) treat `error.code === "session_expired"` as graceful end (community reports from beta); (2) treat data-channel / peer-connection close as end; (3) client timer ends softly at ~58 min (`expiresAt` from our `start`); (4) server `hangup` on `max_duration` heartbeat stop.

### 1.6 Truncation and turn detection
- `session.truncation`: `"auto"` (default) | `"disabled"` (errors on overflow) | `{ type:"retention_ratio", retention_ratio: 0–1, token_limits?: { post_instructions: N } }`. `post_instructions` caps input tokens **excluding** instructions. OpenAI suggests 0.8 to bust the cache less often. — CONFIRMED ([costs guide](https://developers.openai.com/api/docs/guides/realtime-costs)). Plan §5.3 shape is correct.
- `session.audio.input.turn_detection`: `{ type:"semantic_vad", eagerness: low|medium|high|auto, create_response, interrupt_response }` or `server_vad` (`threshold`, `prefix_padding_ms`, `silence_duration_ms`, `idle_timeout_ms`). `null` disables. — CONFIRMED ([VAD guide](https://developers.openai.com/api/docs/guides/realtime-vad)).
- `idle_timeout_ms` is **server_vad only** → our 10-min idle auto-end stays client/server-side (heartbeat), not via VAD.

### 1.7 Voices
- `alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar`; recommended `marin` / `cedar`. Custom voice `{id:"voice_…"}` exists (not used). — CONFIRMED.
- Voice cannot change after first audio; the reference also says `voice` and `model` can't be changed via `session.update` at all → **fixed at `start`** (matches D9).
- Default voice: `marin`.

### 1.8 Interruptions and tools
- WebRTC: server tracks playback and auto-truncates unplayed audio on interruption; no `conversation.item.truncate` needed; don't set `audio.format`, don't send `input_audio_buffer.append`. — CONFIRMED.
- Tools: `session.tools` `[{type:"function", name, description, parameters}]`, `tool_choice: "none"|"auto"|"required"|{type:"function",name}`; call arrives as `function_call` item in `response.done.response.output[]` (`call_id`, `name`, `arguments` JSON string); reply `conversation.item.create {type:"function_call_output", call_id, output}` then `response.create`. — CONFIRMED. Plan §2/§5.4 correct.
- Caching: automatic, prefix-based; changing instructions/tools mid-session lowers the cache rate; truncation busts cache from that point. — CONFIRMED.

---

## 2. Prices (per 1M tokens, [pricing](https://developers.openai.com/api/docs/pricing), 2026-10-14)

| Model | Text in | Cached text in | Text out | Audio in | Cached audio in | Audio out |
|---|---|---|---|---|---|---|
| `gpt-realtime-2.1` | $4.00 | $0.40 | $24.00 | $32.00 | $0.40 | $64.00 |
| `gpt-realtime-2.1-mini` | $0.60 | $0.06 | $2.40 | $10.00 | $0.30 | $20.00 |
| `gpt-4o-mini-transcribe` | $1.25 | — | $5.00 | $1.25 | — | — |

- Transcription is billed separately on its own rate card (≈ $0.003/min for `gpt-4o-mini-transcribe`).
- Audio tokens: user audio ≈ 1 token / 100 ms, assistant audio ≈ 1 token / 50 ms ([costs guide](https://developers.openai.com/api/docs/guides/realtime-costs)).
- `aiModelPricing` needs rows for both realtime models with units `token_in_1m`, `token_cached_in_1m`, `token_out_1m`, **`audio_token_in_1m`, `audio_token_cached_in_1m`, `audio_token_out_1m`** (new units, S1), and `gpt-4o-mini-transcribe` with `audio_token_in_1m` + `token_out_1m` (+ `audio_minute` for `{type:"duration"}` usage) + `token_in_1m` (the transcription usage reports a few text input tokens; added in `20261015120000` after manual QA).

**Rough cost (own estimate, not from docs):** a 10-min session, ~20 turns, half the time each side speaks, ~13k-token prompt mostly cached → `gpt-realtime-2.1` ≈ **$0.6–0.9**, `-mini` ≈ **$0.2–0.3**. Assistant audio output dominates. Feeds client question Q1 (limits).

---

## 3. Prompt size measurement

Method: throwaway Vitest run of the real `buildSystemPrompt` + `buildSessionLifecycleInstruction` with prompt-test fixtures (`voice-001`, plus a "rich" variant: 12 sessions, 5 session memories, 15 memory facts, prior crisis, `session_open`), platform settings from the 2026-10-07 backup of `platformAiSettings` (`tmp-platform-ai-settings-backup.json`, no user data). Tokenizer: `o200k_base` (`gpt-tokenizer`). The file was deleted after the run.

| Case | Chars | Tokens |
|---|---|---|
| Voice, minimal profile, current admin base prompt | 56,890 | 12,234 |
| Voice, rich profile, `session_open` | 60,709 | 13,118 |
| Admin `globalSystemPrompt` alone (current) | 46,141 | 9,857 |
| Worst case: admin prompt at DB cap 100,000 chars + rich profile | ~115,000 | **~26,600** |

Ratio ≈ 4.6 chars/token (the repo's `estimatePromptTokens` uses 4 → overestimates by ~15%, which is the safe direction).

**Findings**
- Context is not a problem: 13k (today) – 27k (worst case) of 128k. Each turn re-sends instructions, but cached at $0.40/M → ≈ $0.005/turn today.
- Instructions length limit for 2.1 is **NOT DOCUMENTED**. The older GA post gave 16,384 tokens for instructions + tools on the 32k `gpt-realtime`. Today's prompt (13.1k) fits even that cap; the worst case (26.6k) does not.

**Recommendation**
1. Ship the full shared prompt as-is (D5); no compact variant needed now.
2. In `start`, compute the estimate (`estimatePromptTokens`). If above `REALTIME_INSTRUCTIONS_SOFT_LIMIT` (default 16,000), log a warning; if OpenAI rejects the call with a 4xx about instructions length, return `realtime_unavailable` and log `prompt_too_large` (no silent cut of safety/platform rules).
3. The probe (§6) accepted ~26.6k tokens at session setup. If a real turn ever fails on a long prompt, add the compact voice variant of user-data blocks (plan §8 option b) as a follow-up, not in this ticket.
4. `token_limits.post_instructions` controls conversation history only — it does **not** help with instructions size. Keep `retention_ratio: 0.8`, no `post_instructions` for now.

---

## 4. Browser quirks (remote WebRTC audio)

- OpenAI guidance: request mic from a user action, HTTPS/localhost, `audioEl.autoplay = true`, show a play control if `play()` is blocked ([WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc)). Nothing mobile-specific.
- iOS Safari: media with sound needs a user gesture; `play()` rejects with `NotAllowedError` ([WebKit](https://webkit.org/blog/6784/new-video-policies-for-ios/)). MediaStream-backed media autoplays if the page is already capturing (active `getUserMedia`) ([WebKit WebRTC](https://webkit.org/blog/7763/a-closer-look-into-webrtc/)). `playsinline` required.
- Android Chrome: audible autoplay needs prior user interaction ([MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)).

**Rule for S5a/S5b:** in the **Start tap handler** synchronously create/unlock the `<audio autoplay playsinline>` element (call `play()` on it), then `getUserMedia`, then the offer. On `NotAllowedError` show "Tap to enable sound". Mic errors (`NotAllowedError` / `NotFoundError` / `NotReadableError`) map to the §6.4 error matrix.

---

## 5. Plan corrections

| # | Correction | Affected subtasks |
|---|---|---|
| C1 | Realtime model default `gpt-realtime-2.1`; cheaper option is **`gpt-realtime-2.1-mini`** (not `gpt-realtime-mini`, deprecated 2027-01-20). Seed `aiModelPricing` for both. | T-025, T-027, T-032 |
| C2 | Transcription model default **`gpt-4o-mini-transcribe`** with `language: "en"` (string). Not `whisper-1` / `gpt-4o-transcribe` (deprecated 2027-02-26), not `languages`. | T-027 |
| C3 | Transcription `usage` can be `{type:"tokens",…}` **or** `{type:"duration", seconds}` → `realtimeUsage` + `usage` action schema must accept both. | T-028, T-027 |
| C4 | Cached input is split per modality in `input_token_details.cached_tokens_details{text_tokens,audio_tokens}` → map `cachedInputTokens` / `cachedAudioInputTokens` from there (fallback: all `cached_tokens` as text when details are missing). | T-028, T-027, T-025 (units) |
| C5 | Item events: handle `conversation.item.added`, `.done` **and** `.created` (docs disagree), dedupe by item id; order via `previous_item_id`. | T-028 |
| C6 | 60-min end signal not documented → handle `error.code="session_expired"`, channel/PC close, own timer at ~58 min. | T-028, T-029 |
| C7 | Server-side kill switch: `POST /v1/realtime/calls/{call_id}/hangup` on `end`, crisis, `budget_reached`, `max_duration`, stale sweep. Store `callId` (from `Location`) in `realtimeVoiceSession`. | T-025 (column), T-027, T-031 |
| C8 | `idle_timeout_ms` is server_vad only → idle auto-end stays in our heartbeat logic (plan already does this; do not put it into `semantic_vad`). | T-027 |
| C9 | Voice can't be changed via `session.update` at all → voice fixed at `start` (matches D9; UI must say "applies to the next conversation"). | T-030 |
| C10 | `/v1/realtime/calls` returns `201` + `text/plain` (probed; not documented) → accept any 2xx and read text. `call_id` prefix is `rtc_u2_…` → take the last `Location` segment, validate only the `rtc_` prefix. | T-027 |
| C11 | Instructions cap for 2.1 not documented; ~26.6k tokens accepted at setup (§6) → soft-limit warning + `prompt_too_large` logging (§3), one long-prompt turn in QA. | T-027, T-033 |
| C12 | New `aiModelPricing` audio-token units (`audio_token_in_1m`, `audio_token_cached_in_1m`, `audio_token_out_1m`) for the S1 migration and `computeCostUsd`. | T-025, T-027, T-032 |

FYI (no plan change): OpenAI now also offers **GPT-Live** (`gpt-live-1`, separate `/v1/live/sessions` endpoint, $0.05/min). Out of scope for this ticket; could be an alternative later if per-minute pricing suits the client better.

---

## 6. Live probe (run 2026-10-14)

A throwaway Node 24 probe (kept outside the repo, not committed; WHATWG `fetch` + `FormData` only, same API as Deno) posted the real voice prompt + the §5.3 config (`gpt-realtime-2.1`, `semantic_vad`, `gpt-4o-mini-transcribe` + `language:"en"`, voice `marin`, `truncation: {type:"retention_ratio", retention_ratio:0.8}`, `tool_choice:"auto"`) with a browser-generated SDP offer to `/v1/realtime/calls`, then called `hangup`. No audio was exchanged.

| Run | Instructions | Status | Content-Type | `Location` | Hangup |
|---|---|---|---|---|---|
| Default | 60,709 chars / 13.1k tokens | **201** (2.4 s) | `text/plain; charset=utf-8` | `/v1/realtime/calls/rtc_u2_…` | 200 |
| `PROBE_PAD=1` | 114,710 chars / 26.6k tokens | **201** (1.5 s) | `text/plain; charset=utf-8` | `/v1/realtime/calls/rtc_u2_…` | 200 |

**Confirmed by the probe**
- D1 works: multipart `sdp` + `session` with the standard key → `201`, body = SDP answer (`v=0…`), `call_id` = last segment of `Location` (`rtc_u2_…`, so don't assume the `rtc_u1_` prefix from the docs).
- All §5.3 field names were accepted (an invalid session config would have been rejected at this step).
- `POST /v1/realtime/calls/{call_id}/hangup` → `200` (C7 is viable).
- A ~26.6k-token prompt is accepted at call creation → no 16k instructions cap at session setup.

**Caveat.** No response was generated (no audio), so a cap enforced only at response time can't be ruled out. Keep the soft-limit warning from §3 and check one real spoken turn with a long admin prompt during T-030/T-033 QA.

---

## 7. Final: constraints and how the shipped code handles them (T-033)

| Constraint | Status | Workaround in the code |
|---|---|---|
| Standard API key must stay on the server | Done | Unified interface (D1): `realtime-voice` posts the SDP offer with the key; the browser receives only the SDP answer + session ids (no ephemeral `client_secret`). Tests assert no `sk-` / `client_secret` / instructions in responses; the production bundle contains no key or `api.openai.com`. |
| 60-min session limit, end signal not documented (C6) | Done | Our session ends at 58 min (`expiresAt`): client timer + server `heartbeat` closes the session and hangs up; `error.code = session_expired` and a data-channel close near expiry end as `max_duration`; 5-min warning in the UI; "Start new conversation" afterwards. |
| Voice can't change mid-session (C9) | Done | Voice picked before Start, locked during the session with "Voice can be changed for the next conversation". |
| Item events inconsistent (`added`/`created`/`done`), out-of-order transcription (C5) | Done | `transcriptAssembler` dedupes by item id and orders by `previous_item_id`; `persistQueue` saves in order, a user turn whose transcript never arrives is saved as `[inaudible]` after 8 s. |
| Interruptions over WebRTC | Done (approximate) | Server truncates unplayed audio; the client marks Kota's reply `interrupted`. The saved text is what the transcript contained when it stopped, which can be slightly more than was heard. |
| Transcription usage is tokens **or** duration (C3); cached tokens split per modality (C4) | Done | `realtimeUsage` maps both; `computeCostUsd` prices `audio_token_*` units (C12); transcription is its own ledger row (`realtime_transcription`). |
| No server-side usage stream in Supabase Edge (sideband needs a long-lived socket) | Residual | Usage is client-reported with strict caps, idempotency, model from the session row, counters vs `*Seen`; unconfirmed sessions are `partial` ("≥ $X") / `unknown` ("—"), never $0. The server enforces budget/time stops and hangs up swept calls at the next start. A client that goes silent and never starts again keeps one call until OpenAI's 60-min cap. Full fix: a sideband worker outside Edge. |
| OpenAI sends `session.created` / `session.updated` (with the full `instructions`: admin global prompt, platform rules, prohibited topics) to the browser over the data channel | Residual — needs a product decision | Not removable: the server sets the config, OpenAI echoes it to the peer. The client ignores the event, but a user inspecting the `RTCDataChannel` can read the coaching prompt. Admin prompt text must be treated as visible to Conversation users (no secrets in it). Found in the final security review (T-033). |
| Budget only sees reported usage | Residual (follow-up) | `check_ai_budget` sums `aiUsageEvent`; a client that never reports usage isn't stopped by the budget (one call at a time, ≤ 58 min, Retry ≤ 5 per conversation). Cheaper follow-up: charge a minimum estimate from `durationSeconds` of `partial`/`unknown` sessions in the budget check. |
| Client can send `session.update` over the data channel | Residual | Affects only the caller's own session; tools run only through the server allowlist with the user's RLS client (registry empty today). |
| Crisis detection runs on the user transcript, which can arrive after Kota starts answering | Residual | On a hit: `response.cancel` + `output_audio_buffer.clear`, call hung up, chat crisis text + resources, conversation closed for good. A short window where Kota is already speaking remains. |
| Instructions size cap undocumented (C11) | Done | Full shared prompt is sent (13k tokens today; 26.6k accepted at setup); above ~16k estimated tokens a warning is logged, OpenAI 4xx is logged as `prompt_too_large`; nothing is cut. |
| `idle_timeout_ms` only with server VAD (C8) | Done | Our own idle end (10 min without speech) in the client, `idleTimeoutSec` from `start`. |
| Autoplay on iOS/Android | Done | Audio element created and unlocked in the Start tap handler; `NotAllowedError` → "Tap to enable sound". |
| Kota speaking first | Not done | semantic VAD starts the first response when the user speaks; an opening turn would need a client `response.create` (follow-up). |
| Knowledge base retrieval | Not done | Tool channel ready (server registry, allowlist, argument validation, trimming); registry empty until NCLDD-54; the realtime addendum forbids claiming lookups or sources unless a tool returned them. |
