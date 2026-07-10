# Chat edge function — deploy checklist (T-005)

The `chat` function is **written in git only** until PM reviews this file and the function body, then explicitly approves deploy.

## Prerequisites

- Supabase project linked (`supabase link` or CI secrets)
- Edge secrets set on the project:
  - `OPENAI_API_KEY` (required)
  - `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`)
- Platform env (automatic on Supabase Edge):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Tier gate reads/writes `profiles.onboardingData` via the **authenticated** Supabase client (RLS owner scope), not service role.

## Pre-deploy PM review

1. Read `supabase/functions/chat/index.ts` — auth, crisis hard-stop, tier gate, profile bind.
2. Read `supabase/functions/chat/crisisDetect.ts` — keyword list + fixed 988/741741 response (full-thread scan).
3. Read `supabase/functions/chat/tierGate.ts` — Free tier **3 sessions/month** tracked in `profiles.onboardingData.chat_ai_monthly_usage.sessionConversationIds`; first AI touch per new `conversationId` counts (not only `session_open`).
4. Read `supabase/functions/_shared/supabase-auth.ts` — JWT verification via `auth.getUser`.
5. Read `supabase/functions/chat/loadServerProfile.ts` — identity/results from DB; client may only supply `liveContext`.
6. Confirm `supabase/config.toml` has `[functions.chat] verify_jwt = true`.

## Deploy command (after PM accept + user go)

```bash
cd supabase
supabase functions deploy chat --project-ref szkextipgpupqoppccoy
```

Or via Supabase MCP: `deploy_edge_function` with the reviewed `index.ts` bundle.

## Post-deploy smoke test

1. Sign in on the app; open Chat; confirm a new conversation receives an auto opener.
2. Send a normal message; confirm streamed reply.
3. Sign out / call without JWT → expect `401 Unauthorized`.
4. (Free test user) After **3 new sessions** in the same UTC month → expect Build Brief §12 upsell (`402`, code `free_tier_session_limit`). Continuing an already-started conversation should still work.
5. Send a crisis trigger phrase (e.g. in a staging account) → fixed 988/741741 JSON response, no coaching continuation.

## Rollback

```bash
supabase functions deploy chat --project-ref szkextipgpupqoppccoy --version <previous-version-id>
```

Or redeploy the prior git commit’s function sources after PM review.

## Notes

- Monthly usage is stored in `profiles.onboardingData.chat_ai_monthly_usage` — **no migration applied** in T-005. Optional atomic RPC: `supabase/migrations/WRITTEN_NOT_APPLIED_chat_session_consume_rpc.sql`.
- Client `profileData` identity fields are ignored server-side; only `liveContext` is accepted from the client and labeled untrusted in the prompt.
- **Prototype limitation:** `profiles.subscribed` is owner-writable via RLS; tier gate reads it via the authenticated Supabase client but a malicious client could flip it until billing-backed entitlements ship.
- Do not enable deploy in CI until T-005 is `accepted` and the user confirms go-live.
