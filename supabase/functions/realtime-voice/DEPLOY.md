# realtime-voice — deploy (NCLDD-57 S3)

Conversation mode on `/coaching/voice?mode=conversation`: the browser sends its WebRTC SDP offer
here; the function builds the coaching prompt (shared with `chat`), creates the OpenAI Realtime
call with the server key and returns only the SDP answer + session ids. Design:
`docs/NCLDD-57-implementation-plan.md` §5, facts: `docs/NCLDD-57-realtime-limitations.md`.

**Do not deploy without PM review + an explicit user go.**

## Prerequisites

1. Migrations applied, in order (all applied to production on 2026-10-15):
   - `20261014130000_realtime_voice_conversation.sql` — table `realtimeVoiceSession`, `aiUsageEvent`
     realtime columns/sources, pricing rows, `realtime_voice_sweep()` + cron.
   - `20261015071908_realtime_voice_feedback_session_type.sql` — 👍/👎 on Conversation replies stored as `voice`.
   - `20261015090144_realtime_voice_one_open_session.sql` — one open session per user (the 409 below relies on it).
   - `20261015094100_realtime_voice_admin_reads.sql` — AI Usage split + Realtime sessions tab.
   Check: `select to_regclass('public."realtimeVoiceSession"');`
2. `chat` is deployed from the same commit or later (S2 shared prompt builder, `voice_conversation`
   accepted by `session_finalize`).

## Secrets

| Name | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | yes | — | Already set for `chat`. Never returned to the client. |
| `OPENAI_REALTIME_MODEL` | no | `gpt-realtime-2.1` | `gpt-realtime-2.1-mini` is the cheaper option (priced in `aiModelPricing`). |
| `OPENAI_REALTIME_TRANSCRIBE_MODEL` | no | `gpt-4o-mini-transcribe` | Input transcription inside the session. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided by the platform.

## Deploy

```bash
supabase functions deploy realtime-voice --project-ref szkextipgpupqoppccoy
```

`supabase/config.toml` sets `verify_jwt = true`. The bundle includes code from `../chat/`
(prompt builder, crisis detector, tier gate) and `../_shared/`: the CLI picks them up; with the MCP
`deploy_edge_function` tool every imported file must be passed explicitly. Deploy order: migration → `chat` → `realtime-voice`
→ frontend.

## Smoke (after deploy)

1. Signed-in user, real browser with a microphone (the in-app preview blocks the mic):
   `/coaching/voice?mode=conversation` → Start conversation → say a sentence → Kota answers by voice.
2. Transcript rows appear in `chatMessage` with `realtimeItemId`; `realtimeVoiceSession` row goes
   `connecting → active`; `aiUsageEvent` rows with `source = realtime_response` /
   `realtime_transcription`, `mode = voice`.
3. End conversation → session `ended`, `usageStatus = complete`; the OpenAI call is hung up.
4. Logs (`supabase functions logs realtime-voice`) contain no API key, prompt text or OpenAI bodies.
5. Second tab Start while one runs → "A conversation is already running in another tab." (409).

## Known limits

- Kota does not speak first: semantic VAD starts the first response when the user speaks
  (an opening turn needs a client `response.create` — follow-up).
- Instructions cap for `gpt-realtime-2.1` is undocumented; above ~16k estimated tokens a warning is
  logged (`instructions above soft limit`), nothing is cut.
- The 60-min OpenAI limit is enforced by our own end at 58 min (`expiresAt`).
