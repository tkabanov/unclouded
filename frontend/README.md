# Uncloud360 Onboarding

React + Vite prototype for Uncloud360 onboarding, dashboard, chat, and related flows.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Dev server runs at http://localhost:3000.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run Vitest
- `npm run lint` — ESLint

## Supabase

Migrations and edge functions live in `../supabase/` at the repo root. Copy env vars from `frontend/.env.example` into `.env` (publishable key from the Supabase Dashboard).

Transactional email (US-606): branded Auth templates and ops guide in `../supabase/EMAIL_TEMPLATES.md`. App hooks in `src/lib/email/`.

## Production deploy

CI (`.github/workflows/frontend-ci.yml`) verifies lint/test/build on every push/PR.

### Option A — GitHub Actions → Vercel (recommended for this repo)

Project was created via CLI; production deploy runs on push to `main` when `.github/workflows/vercel-production.yml` is enabled.

1. Create a token: [Vercel → Account → Tokens](https://vercel.com/account/tokens)
2. Add GitHub repo secret **`VERCEL_TOKEN`** (Settings → Secrets and variables → Actions)
3. Push to `main` — workflow builds with `vercel.json` and publishes to https://uncloud360.vercel.app

`VITE_*` vars should live in Vercel → Project → Settings → Environment Variables (Production). `vercel pull` in CI loads them at build time.

### Option B — Native Vercel ↔ GitHub integration

One-time browser setup (preview deploys on PRs, production on `main`):

1. Install [Vercel GitHub App](https://github.com/apps/vercel) and grant access to `tkabanov/unclouded`
2. Open [uncloud360 → Settings → Git](https://vercel.com/fiudls-projects/uncloud360/settings/git)
3. Connect repository `tkabanov/unclouded`, production branch **`main`**, root directory **`./`** (uses root `vercel.json`)

If CLI `vercel git connect` fails, use the dashboard steps above.

### Manual CLI deploy (hotfix)

```bash
cd E:/unclouded
npx vercel deploy --prod --yes
```

**Production URL:** https://uncloud360.vercel.app

See `../supabase/functions/chat/DEPLOY.md` § **Frontend production hosting** for `VITE_*` env (`szkextipgpupqoppccoy`).
