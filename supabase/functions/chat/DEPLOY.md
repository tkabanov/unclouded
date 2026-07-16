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
4. (Free test user) After **7 new sessions** in the same UTC month → expect upsell (`402`, code `free_tier_session_limit`). Continuing an already-started conversation should still work.
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

---

## T-013 Go-live runbook (migrations → edge → push → smoke)

**Requires explicit user go** for production changes (migrations, edge deploy, `git push`). PM-approved SQL: T-007 + T-010.

### Pre-flight snapshot (2026-07-10)

| Check | Status |
| --- | --- |
| Local `main` | `3bd3884` — **12 commits ahead** of `origin/main` |
| Remote migrations | Through `20260709180000` — **T-007/T-010 not applied** |
| Remote `chat` edge | **v8** ACTIVE, `verify_jwt=false` (git expects `verify_jwt=true`) |
| Frontend gates | 137 tests pass, build pass |
| Edge secret | Confirm `OPENAI_API_KEY` in Dashboard → Edge Functions → Secrets |

Record rollback target before deploy: edge id `2b280ac2-6a45-4101-8623-e9c93743a7fe`, version **8**.

### Execution order (do not push first)

Pushing before migrations + edge deploy breaks chat (missing `consume_chat_session` RPC, old v8 handler vs new client lifecycle payloads).

```text
0. User explicit go + confirm OPENAI_API_KEY in Edge secrets
1. Apply T-007 migration (consume_chat_session RPC)
2. Apply T-010 migration (entitlement protection + billing RPCs)
3. [Optional] Run two-user proof scripts in supabase/tests/
4. Deploy chat edge (CLI — full bundle)
5. Verify remote: verify_jwt=true, new handler active
6. git push origin main
7. Wait for production frontend deploy (CI does not auto-publish)
8. Run post-deploy smoke (below); record results in T-013 finish summary
```

### Step 1–2: Apply PM-approved migrations

Via Supabase CLI (linked project) or MCP `apply_migration` with full SQL bodies:

- `supabase/migrations/20260710130000_consume_chat_session_rpc.sql`
- `supabase/migrations/20260710140000_protect_subscription_entitlement.sql`

**Order:** T-007 before T-010. T-010 must be live before new frontend (Settings uses `request_subscription_plan_change`).

Optional proofs (manual, service-role / JWT):

- `supabase/tests/consume_chat_session_two_user_proof.sql`
- `supabase/tests/subscription_entitlement_two_user_proof.sql`
- `supabase/tests/load_server_live_context_two_user_proof.sql`

### Step 4: Deploy chat edge

Prefer CLI (auto-bundles all imports):

```bash
cd supabase
supabase functions deploy chat --project-ref szkextipgpupqoppccoy
```

Post-deploy: confirm Dashboard shows `verify_jwt=true` and version > 8.

### Step 6: Push git

```bash
git push origin main
```

Only **committed** history is pushed (12 commits `30d4386`…`3bd3884`). Uncommitted working-tree changes stay local.

### Step 8: Post-deploy smoke (record pass/fail)

| # | Check | Pass criteria |
| --- | --- | --- |
| 1 | Auto opener | New Chat conversation receives opener (`session_open` lifecycle) |
| 2 | Streamed reply | Normal message returns streamed AI reply |
| 3 | No JWT | Unsigned request → `401 Unauthorized` |
| 4 | Free tier gate | 8th new session in UTC month → `402` + `free_tier_session_limit` |
| 5 | Crisis hard-stop | Crisis phrase → fixed 988/741741 JSON, no coaching continuation |

### Rollback

| Layer | Action |
| --- | --- |
| Edge | `supabase functions deploy chat --project-ref szkextipgpupqoppccoy --version <v8-id>` |
| Migrations | No down scripts — manual SQL revert if required (PM only) |
| Frontend | Revert git + redeploy hosting |

---

## Frontend production hosting (T-018)

CI (`.github/workflows/frontend-ci.yml`) runs **lint / test / build only** — publish is manual.

### Production URL

| Field | Value |
| --- | --- |
| **App URL** | https://uncloud360.vercel.app |
| **Supabase project** | `szkextipgpupqoppccoy` |
| **Chat edge** | `https://szkextipgpupqoppccoy.supabase.co/functions/v1/chat` (v9+, `verify_jwt=true`) |
| **Vercel project** | `fiudls-projects/uncloud360` |

Legacy interim (GitHub Pages): https://tkabanov.github.io/unclouded/ — superseded by Vercel.

Custom domain `uncloud360.ai` is ops-gated (T-014 redirect URLs).

### Build env (`frontend/.env` or Vercel Project → Settings → Environment Variables)

```bash
VITE_SUPABASE_URL=https://szkextipgpupqoppccoy.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key from Dashboard>
VITE_APP_URL=https://uncloud360.vercel.app
# VITE_BASE_PATH unset on Vercel (defaults to /)
```

### Manual publish (Vercel)

Deploy from **repo root** (monorepo: frontend imports shared `supabase/functions/chat` modules).

```bash
# one-time: vercel link --project uncloud360
npx vercel deploy --prod
```

Root `vercel.json` runs `npm ci` / `npm run build` in `frontend/` and serves `frontend/dist`.

Set `VITE_*` in Vercel → Settings → Environment Variables (Production), or pass `--build-env` on CLI.

### Manual publish (GitHub Pages, legacy)

```bash
cd frontend
npm ci
npm run build
cp dist/index.html dist/404.html   # SPA fallback for GitHub Pages
touch dist/.nojekyll               # skip Jekyll processing
npx gh-pages -d dist -m "production frontend deploy"
```

On Windows if `gh-pages` fails with `ENAMETOOLONG`, publish from a short path (example):

```powershell
$dst = 'C:\gdp'
Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $dst | Out-Null
Copy-Item frontend\dist\* $dst -Recurse -Force
New-Item -ItemType File -Path "$dst\.nojekyll" -Force | Out-Null
cd $dst; git init; git checkout -b gh-pages; git add -A
git commit -m "production frontend deploy"
git remote add origin https://github.com/tkabanov/unclouded.git
git push -u origin gh-pages --force
```

Repo settings: **Pages → Source: `gh-pages` branch → `/ (root)`**.

If the site returns 404 after the first push, open **Settings → Pages** and confirm the source branch is `gh-pages` (GitHub does not auto-enable Pages on first `gh-pages` push).

Include an empty `.nojekyll` at the deploy root so GitHub does not run Jekyll on the Vite bundle.

### Post-deploy smoke (frontend)

| # | Check | Pass criteria |
| --- | --- | --- |
| 1 | App loads | `GET /` returns 200 HTML shell |
| 2 | Chat edge live | Unsigned `POST /functions/v1/chat` → `401` (not 404/500) |
| 3 | Edge version | Supabase Dashboard → Edge Functions → `chat` ≥ v9 |


