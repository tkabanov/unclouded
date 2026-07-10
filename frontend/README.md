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

CI (`.github/workflows/frontend-ci.yml`) verifies lint/test/build only — **publish is manual**.

**Production URL:** https://uncloud360.vercel.app

See `../supabase/functions/chat/DEPLOY.md` § **Frontend production hosting** for Vercel publish steps and `VITE_*` env (`szkextipgpupqoppccoy`).
