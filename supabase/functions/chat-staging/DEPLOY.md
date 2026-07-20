# REQ-13 — Prompt test staging (`chat-staging`)

Admin prompt tests must **not** call the live `chat` edge function. This project uses a second deployment slot on the **same** Supabase project (branching requires Pro):

| Function | Purpose |
| --- | --- |
| `chat` | Production coaching sessions |
| `chat-staging` | Draft prompt library — deploy here first, run REQ-13 tests, then promote to `chat` |

## Frontend env (Vercel + local)

Set in Vercel → Project → Environment Variables (Production) and `frontend/.env.local`:

```bash
VITE_PROMPT_TEST_SUPABASE_URL=https://szkextipgpupqoppccoy.supabase.co
VITE_PROMPT_TEST_SUPABASE_PUBLISHABLE_KEY=<same publishable key as production>
VITE_PROMPT_TEST_CHAT_FUNCTION=chat-staging
```

Live coaching continues to use `VITE_SUPABASE_URL` → `/functions/v1/chat` only.

## Deploy draft edge

After prompt library edits, deploy staging first:

```bash
npx supabase functions deploy chat-staging --project-ref szkextipgpupqoppccoy
```

Run admin **Prompt Tests** in Settings. When satisfied, promote:

```bash
npx supabase functions deploy chat --project-ref szkextipgpupqoppccoy
```

## Auth

Uses the same JWT as production login (`auth.getUser` on the shared project). Admin `roleType` must be `admin` on `profiles`.

## Optional: Supabase branch (Pro)

If the org upgrades to Pro, you can point `VITE_PROMPT_TEST_SUPABASE_URL` at a branch URL instead and keep `VITE_PROMPT_TEST_CHAT_FUNCTION=chat`.
