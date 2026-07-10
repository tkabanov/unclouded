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
- Tier gate enforces Free tier limits via **`consume_chat_session` RPC** (atomic `FOR UPDATE` consume). Migration: `supabase/migrations/20260710130000_consume_chat_session_rpc.sql` — **PM review required before apply**.

## Pre-deploy PM review

1. Read `supabase/functions/chat/index.ts` — auth, crisis hard-stop, tier gate, profile bind.
2. Read `supabase/functions/chat/crisisDetect.ts` — keyword list + fixed 988/741741 response (full-thread scan).
3. Read `supabase/functions/chat/tierGate.ts` — calls `consume_chat_session` RPC (atomic session consume; migration PM-gated).
4. Read `supabase/migrations/20260710130000_consume_chat_session_rpc.sql` — SECURITY DEFINER + `auth.uid()` bind.
5. Read `supabase/functions/_shared/supabase-auth.ts` — JWT verification via `auth.getUser`.
6. Read `supabase/functions/chat/loadServerProfile.ts` and `loadServerLiveContext.ts` — identity/results and liveContext loaded server-side (T-008); client must not send `profileData`.
7. Confirm `supabase/config.toml` has `[functions.chat] verify_jwt = true`.

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

- Monthly usage is stored in `profiles.onboardingData.chat_ai_monthly_usage` via **`consume_chat_session` RPC** — migration **written, not applied** until PM accepts `20260710130000_consume_chat_session_rpc.sql`. Two-user proof script: `supabase/tests/consume_chat_session_two_user_proof.sql`.
- Server liveContext queries (`dailyCheckin`, `profiles`, `pathEnrollment`, `pathSession`, `chatConversation`, `pathResponse`) are RLS-scoped to `auth.uid()`. Two-user proof script: `supabase/tests/load_server_live_context_two_user_proof.sql`.
- Client must not send `profileData` or `liveContext` — edge loads identity and live signals server-side (T-008).
- Tier gate reads `profiles.subscribed` + `profiles.tier` inside **`consume_chat_session` RPC** (server truth). Entitlement columns are protected by trigger + billing RPCs — migration **written, not applied** until PM accepts `20260710140000_protect_subscription_entitlement.sql`. Two-user proof: `supabase/tests/subscription_entitlement_two_user_proof.sql`.
- Do not enable deploy in CI until T-005 is `accepted` and the user confirms go-live.
