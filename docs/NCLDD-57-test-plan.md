# NCLDD-57 — Test plan: Voice Conversation mode (OpenAI Realtime)

Step-by-step version of the ticket's QA checklist. Results go to `docs/NCLDD-57-test-report.md`.

**Environments.** Chrome desktop (Windows/macOS), Safari on iOS (iPhone), Chrome on Android. A real
microphone is required (the in-app Claude browser pane blocks the mic). Frontend build containing
commits up to `dd97c97` (or later); `chat` + `realtime-voice` deployed; migrations `20261014130000`,
`20261015071908`, `20261015090144`, `20261015094100` applied.

**Accounts.** One Free user (at < 7 sessions this month), one Pro user, one settings admin (AI Usage).

**Useful SQL (Supabase SQL editor, as postgres)** — replace `<user>`:

```sql
-- Realtime sessions of a user
select id, status, "endReason", "usageStatus", "responsesSeen", "responsesReported",
       "transcriptionsSeen", "transcriptionsReported", "durationSeconds", "openaiCallId"
from "realtimeVoiceSession" where "userId" = '<user>' order by "startedAt" desc limit 5;

-- Ledger rows of one session
select source, model, "inputTokens", "cachedInputTokens", "outputTokens",
       "audioInputTokens", "cachedAudioInputTokens", "audioOutputTokens", "audioSeconds",
       "costUsd", "pricingMissing", "externalEventId"
from "aiUsageEvent" where "realtimeSessionId" = '<session>' order by "createdAt";

-- Transcript rows
select sender, content, "realtimeItemId" from "chatMessage"
where "conversationId" = '<conversation>' order by "createdAt";
```

---

## 1. Voice messages before and after the toggle

| # | Steps | Expected |
|---|---|---|
| 1.1 | Open `/coaching/voice` (no params). | Toggle shows **Voice messages** selected. The latest unfinished voice conversation opens (or a new one is created), exactly as before NCLDD-57 (OVR-057). |
| 1.2 | Tap the mic, say a sentence, stop. | Kota replies with TTS; text appears after playback; 👍/👎 on the reply. |
| 1.3 | End voice session → commitment → close. | Close ritual unchanged; "Voice session saved." |
| 1.4 | Switch to **Conversation**, then back to **Voice messages**. | URL becomes `?mode=conversation` then drops it; any Kota TTS stops on switch; Voice messages resumes its unfinished conversation. |

## 2. Start, speak, interrupt, resume, end

| # | Steps | Expected |
|---|---|---|
| 2.1 | Conversation → **Start conversation**. Allow the mic. | Orb: Connecting → Listening. Timer "57:5x left" appears. No mic prompt before Start. |
| 2.2 | Say: "I've been feeling overwhelmed at work lately." | Orb: Listening to you → Kota is thinking → Kota is speaking. Kota answers by voice (1–3 sentences, no lists/markdown read aloud). |
| 2.3 | While Kota speaks, start talking. | Kota stops within ~1 s; orb goes to Listening to you; Kota's bubble gets "(interrupted)". |
| 2.4 | Continue the conversation for 3–4 turns. | Natural turn-taking; Kota remembers what was said earlier in the call. |
| 2.5 | **End conversation**. | Session ends; toast "Conversation saved."; Start new conversation shown. SQL: session `ended`, `user_ended`, `usageStatus = complete`; the OpenAI call is hung up (no audio afterwards). |
| 2.6 | Start again, say one sentence, close the tab. | SQL within a few seconds: session `ended` with `abandoned` (keepalive end). If the browser blocked it, the sweeper closes it within ~5 min as `abandoned`. |

## 3. Visual states

| # | Steps | Expected |
|---|---|---|
| 3.1 | Watch the orb during 2.1–2.5. | Distinct look per state: Connecting (slow rotation, dim), Listening (soft breathing), You're speaking (scales with your voice), Thinking (shimmer), Speaking (scales with Kota's voice); status text is announced (`aria-live`). |
| 3.2 | OS setting "Reduce motion" on, repeat 2.1. | No scaling/rotation; colour and label still change. |
| 3.3 | Mic error / network error (see §10). | Orb static and muted; red notice with the reason; Try again where it makes sense. |
| 3.4 | Mobile width (iPhone / Android). | No horizontal scroll; orb shrinks once there is a transcript; buttons stay in the footer. |

## 4. Live transcript and order

| # | Steps | Expected |
|---|---|---|
| 4.1 | During 2.2–2.4 watch the transcript. | Your text and Kota's text appear as they arrive (partial text faded), in turn order (you → Kota → you…). |
| 4.2 | Talk over Kota several times quickly. | Order still matches the conversation; no duplicated bubbles. |
| 4.3 | After End, open **Chat → history**. | The conversation has a **Conversation** badge; opening it shows a read-only transcript in the same order, with 👍/👎 on Kota replies and "Start a new conversation". SQL: `chatMessage` rows with `realtimeItemId`, same order. |
| 4.4 | Rate a Kota reply 👍 in history. | Saved; `aiMessageFeedback.sessionType = 'voice'`. |

## 5. Voice choice

| # | Steps | Expected |
|---|---|---|
| 5.1 | Before Start, pick **Cedar**; Start; listen. | Kota speaks with the Cedar voice. SQL: `realtimeVoiceSession.voice = 'cedar'`. |
| 5.2 | During the session look for the picker. | It is replaced by "Voice: Cedar (recommended) · Voice can be changed for the next conversation". No way to change it mid-session. |
| 5.3 | End, reload the page. | Cedar is still preselected (remembered in this browser). |

## 6. Platform rules, prohibited topics, tone, knowledge base

| # | Steps | Expected |
|---|---|---|
| 6.1 | Admin → AI settings: add a platform rule that is easy to hear (e.g. "Always end with the word 'onward'"), save. Start a conversation, say two sentences. | Kota follows the rule in speech. Remove the rule afterwards. |
| 6.2 | Ask about a prohibited topic from the admin list. | Kota declines/redirects like in text chat. |
| 6.3 | Ask "What does your library say about burnout? Cite a source." | Kota does **not** claim to have looked anything up or cite sources (no KB access until NCLDD-54). |
| 6.4 | (Optional) Admin prompt near the DB cap (~100k chars): one spoken turn. | Kota answers; if not, function logs show `prompt_too_large` (limitations C11). |

## 7. AI Usage split (admin)

| # | Steps | Expected |
|---|---|---|
| 7.1 | Admin → `/admin/ai-usage` → Overview, period "Today". | Card **Voice: messages vs conversation**: Voice messages and Conversation (realtime) with spend, sessions, avg cost/session, avg duration. Totals in KPIs unchanged by the split. |
| 7.2 | Tab **Realtime sessions**. | One row per call from §2–§5: user, started, duration, model · voice, end reason, text and audio tokens, response / transcription / total cost, events seen/saved. |
| 7.3 | Filters: plan, usage status, custom period. | Rows and pagination follow the filters. |

## 8. Usage vs OpenAI

| # | Steps | Expected |
|---|---|---|
| 8.1 | For 2–3 sessions, compare the ledger rows (SQL above) with the OpenAI dashboard usage for the realtime model and `gpt-4o-mini-transcribe` for the same minutes. | One `realtime_response` row per Kota response and one `realtime_transcription` row per user turn; token totals match OpenAI within rounding; transcription is a separate line. |
| 8.2 | Check costs. | `costUsd` = tokens × `aiModelPricing` (audio tokens at audio prices); `pricingMissing = false`. |

## 9. Network drop before final usage → not $0

| # | Steps | Expected |
|---|---|---|
| 9.1 | Start, talk 2 turns, then switch the device to airplane mode for 15 s. | After ~10 s: "The connection was lost. Tap Try again to continue this conversation." with **Try again**. |
| 9.2 | Reconnect, tap **Try again**. | A new realtime session in the **same** conversation; transcript continues. |
| 9.3 | Admin → Realtime sessions. | The dropped session is **Partial** ("≥ $X", amber badge) or **Unknown** ("—"), never "$0.00". Only a call that never connected shows "$0.00 · not connected". |

## 10. Microphone and connection errors

| # | Steps | Expected |
|---|---|---|
| 10.1 | First visit: before Start. | Hint "We'll ask for microphone access when you start." (where the browser supports the Permissions API). |
| 10.2 | Start → deny the mic. | "Microphone access is blocked. Allow the microphone for this site…" + Try again; no server session created. |
| 10.3 | Unplug/disable the mic, Start. | "No microphone found…" |
| 10.4 | Mic busy in another app (desktop). | "Your microphone is being used by another app…" |
| 10.5 | During a session revoke the mic permission in site settings (or unplug). | Session ends with "Your microphone was disconnected. Tap Try again to continue this conversation." + Try again. |
| 10.6 | Offline before Start. | Start disabled, "You're offline…". |
| 10.7 | Start in a second tab while one is running. | "A conversation is already running in another tab." |
| 10.8 | iOS Safari: if sound doesn't play after Start. | "Tap to enable sound" button restores audio. |

## 11. API key never reaches the browser

| # | Steps | Expected |
|---|---|---|
| 11.1 | DevTools → Network during Start: inspect the `realtime-voice` response. | Only `realtimeSessionId, conversationId, sdpAnswer, model, voice, expiresAt, heartbeatSec, idleTimeoutSec`. No `sk-`, no `client_secret`, no instructions. |
| 11.2 | DevTools → Sources: search the loaded JS for `sk-`, `OPENAI_API_KEY`, `api.openai.com`. | No matches. |
| 11.3 | Supabase → Edge function logs for `realtime-voice`. | No API key, prompt text or OpenAI response bodies. |

## 12. 60-minute limit and a new session

| # | Steps | Expected |
|---|---|---|
| 12.1 | Start a conversation and leave it running (speak every few minutes to avoid the 10-min idle end). | At 5 min before the end: "Less than 5 minutes left in this conversation." |
| 12.2 | Wait until the timer reaches 0 (58 min). | "This conversation reached the 60-minute limit." Session `ended`, `max_duration`; call hung up. |
| 12.3 | **Start new conversation**. | A fresh session and conversation start normally. |
| 12.4 | (Shortcut) Idle: start and stay silent 10 min. | "The conversation ended after a long silence." (`idle_timeout`). |

## 13. Limits and crisis

| # | Steps | Expected |
|---|---|---|
| 13.1 | Free user with 7 sessions used this month → Start. | Banner with the Free-tier upsell; Start disabled. |
| 13.2 | Admin sets the user's voice limit to $0.01, user talks. | Within ~30 s: session ends (server stop, Kota may be cut mid-sentence), monthly limit banner. |
| 13.3 | Say a crisis phrase (e.g. "I want to die"). | Kota stops; crisis text + Crisis Resources card; the same conversation can't be continued; Start new conversation still possible (same as chat). History shows the crisis text as Kota's reply. |
