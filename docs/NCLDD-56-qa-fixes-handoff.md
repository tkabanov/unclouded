# NCLDD-56 — QA follow-up: fixes handoff

**Source:** live QA run 2026-10-13…14 on the test environment (`https://uncloud360.vercel.app`, Supabase `szkextipgpupqoppccoy`, Stripe sandbox). Full results: `docs/NCLDD-56-test-report.md` → "Manual QA". Plan: `docs/NCLDD-56-test-plan.md`. Product rules: `docs/product-overrides.md` OVR-074 (read before changing behavior).

**State:** all test cases M-01…M-54 and A1–A8 pass. Three bugs were already fixed on `main` (do **not** redo):

| Id | Fixed in | What |
|---|---|---|
| B-1 | `d5d3c71` | referral / partner links built on `uncloud360.ai` (dead) → now `window.location.origin` |
| B-2 | `9d23119` | `stripe-webhook` lost referral payments for newer Stripe event shapes / `invoice.paid` before checkout → re-read invoice with pinned API version, user from synced subscription (deployed) |
| B-3 | `b3caaca` | 24h+ cancel without refund blamed the 24h rule → `lib/coach/coachBookingCancelMessage.ts` |

Below is what is still open. Each item is independent. Rules for the agent: code / comments / commits in English; commit straight to `main`; run `npm run lint`, `npm run test`, `npm run build`, `npx tsc --noEmit -p tsconfig.app.json` (error count must stay 182) in `frontend/`; any behavior change that contradicts OVR-074 needs a new `OVR-###` entry or an update of OVR-074.

---

## F-1 — Double period after localized dates (low, UI)

**Where:**
- `frontend/src/components/settings/admin/AdminReferralPartnerProgram.tsx:136` — `` ` since ${formatSubscriptionDate(...)}` `` followed by `.` in the sentence.
- `frontend/src/components/referrals/PartnerEarningsSummary.tsx:41` — `` `, from ${formatSubscriptionDate(...)}` `` followed by `.`.

**Repro:** browser locale `ru` → admin partner detail shows "Linked to … since 14 октября 2026 г.. This account…"; partner portal shows "Your terms: 20% of every payment, from 13 октября 2026 г..".

**Expected:** a single period. Either don't append `.` when the formatted date already ends with one, or restructure the sentence so the date is not followed by a period (e.g. put it in parentheses / separate line).

**Accept:** component tests for both strings with a date formatter that returns a trailing `.`; no visual change for `en` locales.

## F-2 — Status labels ignore full refunds (low, needs product confirmation)

**Where:**
- Partner portal client status: `supabase/migrations/20261013190000_referral_partner_portal.sql:179` (`WHEN payments > 0 THEN 'paying'`), label `frontend/src/lib/referrals/referralCopy.ts:77`.
- Invite-a-friend invitee status: `supabase/migrations/20261013180000_referral_overview_rpc.sql:160` (`WHEN reward."createdAt" IS NOT NULL THEN 'rewarded'`), label `referralCopy.ts:33`.

**Repro:** PCL-2 (`78bubbleteam+pcl2@gmail.com`) paid Pro and was fully refunded → still "Paying client" with "0 $" in PARTNER-1's portal. INV-5 (`78bubbleteam+inv5@gmail.com`) fully refunded → REF-A still sees "Credit earned" although the credit was reversed.

**Proposal (confirm with the developer first):** count a client as paying / rewarded only while at least one qualifying payment is not fully reversed (`refundedCents < amountPaidCents` and no held dispute); otherwise show e.g. "Refunded". This is a status-only change — totals and ledgers are already correct.

**Accept:** new migration (do not edit applied ones), proof SQL in `supabase/tests/` ending with `ALL PASS`, updated `referralCopy` + component tests, OVR-074 text updated.

## F-3 — Commit the A8 smoke script without a default password (chore)

**Where:** `scripts/referral_isolation_smoke.mjs` — local, uncommitted changes (defaults to the seeded `ncldd56-*` accounts and reads URL / publishable key from `frontend/.env.production`, accepts `{ ok: false, code: 'forbidden' }` from `admin_list_coaching_bookings`). The commit was blocked because the script defaults the password to `qwerty123`.

**Do:** require `SEED_PASSWORD` (exit with a clear message if missing) instead of a default, keep the other defaults, commit. Same for `scripts/seed_ncldd56_referral_test_users.mjs` (already on `main` with the default — make it required there too).

**Accept:** `node --check` passes; running without `SEED_PASSWORD` prints `Missing SEED_PASSWORD`.

## F-4 — 404s on `/admin/analytics` (investigate, likely pre-existing)

**Repro:** sign in as `ncldd56-admin@test.com`, open `/admin/analytics` → ~15–19 console errors "Failed to load resource: 404". The page renders and the "Referral sign-ups" table is correct.

**Do:** find which requests 404 (devtools Network, filter by status), decide if they are NCLDD-56 related (the RPCs called from the frontend all exist in `supabase/migrations/`). Fix if it is a missing table / function / edge function in this environment; otherwise document as out of scope in the test report.

## F-5 — Dates follow the browser locale (info, product decision)

`formatSubscriptionDate` (`frontend/src/lib/subscription/subscriptionFormat.ts:9`) uses `toLocaleDateString(undefined, …)`, so an English UI shows "13 октября 2026 г." for a Russian browser. App-wide, not NCLDD-56 specific. Only change if the developer decides on a fixed `en-US` locale; if so, update the tests that assert formatted dates.

---

## Ops (no code — for the developer)

1. **Stripe webhook events:** during the dispute test `charge.dispute.created` was not delivered (the credit was still reversed thanks to the charge re-read in `invoice.paid`). On the endpoint `…/functions/v1/stripe-webhook` enable `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed` — in the sandbox and later in live.
2. **Email confirmation is off** in the test project, so the "Awaiting email confirmation" invitee status (M-07) could not be seen live. Recheck once confirmation is on.
3. **Test data left in place:** `ncldd56-*@test.com`, `78bubbleteam+inv1…6 / pcl1, pcl1b, pcl2, pcl3@gmail.com`, QA Partner One (20%, now **unlinked** from PARTNER-1), Two (10% from 2026-10-14), Three (linked to `ncldd56-partner-3`), cancelled bookings with Coach QA Alpha on 2026-10-17. Clean up before go-live.

## Useful context

- QA accounts password: from the seed script (`SEED_PASSWORD`).
- Read-only SQL used during QA (payment trail per test user, ledgers, commissions) can be run with `npx supabase db query --linked -f <file>`; never write to the shared DB without the developer's OK.
- Webhook tests: `supabase/functions/stripe-webhook/index.test.ts` (runs in vitest, mocks Supabase + Stripe).
