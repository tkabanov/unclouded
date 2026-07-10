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

Migrations and edge functions live in `../supabase/` at the repo root. Copy env vars from the Supabase project dashboard into `.env`.

Transactional email (US-606): branded Auth templates and ops guide in `../supabase/EMAIL_TEMPLATES.md`. App hooks in `src/lib/email/`.
