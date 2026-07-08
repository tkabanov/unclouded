# Uncloud360 Onboarding

React + Vite prototype for Uncloud360 onboarding, dashboard, chat, and related flows.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Dev server runs at http://localhost:8080.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` — run Vitest
- `npm run lint` — ESLint

## Supabase

Migrations and edge functions live in `supabase/`. Copy env vars from the Supabase project dashboard into `.env`.
