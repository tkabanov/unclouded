# NCLDD-56 — B2C referral rewards and B2B partner portal: test report

**Date:** 2026-10-13 · **Build:** `main` (NCLDD-56 commits up to the link-visits change) · **Spec:** YouTrack NCLDD-56, `docs/product-overrides.md` OVR-074 · **Status:** code complete, **not deployed** — migrations await PM review.

## Summary

All six slices are on `main` (`d8f475d`, `b121c58`, `6709907`, `4c61dc1`, `6fe7bc6`, `4e84749`). Automated gates and all SQL proofs pass on a local Postgres (PGlite) harness. Nothing has been applied to the linked Supabase project, so no live / browser QA has been run yet — see [Live QA checklist](#live-qa-checklist-after-deploy).

## Automated results

| Check | Result |
|---|---|
| `npm run lint` | 0 errors (32 pre-existing warnings) |
| `npm run test` | 1155 / 1155 |
| `npm run build` | pass |
| `npx tsc --noEmit -p tsconfig.app.json` | 182 errors — all pre-existing (same count before NCLDD-56), none in NCLDD-56 files |
| `supabase/functions/_shared/referralPayments.test.ts` | 10 / 10 (runs in vitest) |

SQL proofs (each a single transaction ending in `ROLLBACK`, run on PGlite with a Supabase-like stub schema + the real `20260825200000_referral_partners.sql`): all **ALL PASS**.

| Proof | Covers |
|---|---|
| `supabase/tests/referral_attribution_protection_proof.sql` | attribution read-only, permanent code, partner/user code collisions, delete + recreate restore, FK cascades, admin RPC, self-referral, registry isolation |
| `supabase/tests/referral_rewards_ledgers_proof.sql` | one credit per referred user, redelivery idempotency, terms (lifetime / months / first payment, effective dates, history), refunds / disputes (proportional, stale snapshots, won dispute, spent credit), partner-wins, pre-program payers, isolation |
| `supabase/tests/one_on_one_referral_credit_proof.sql` | booking with referral credit on Free / before Premium credits, cancel 24h+ / late, forged booking INSERT denied, no credit laundering after dispute |
| `supabase/tests/referral_overview_proof.sql` | own data only, masked names (Unicode spaces, email-like names), partner-moved invitees hidden, anon denied |
| `supabase/tests/referral_partner_portal_proof.sql` | admin-only linking (confirmed email, audit), own partner only, net earnings, no earnings without terms, unlink, no emails / ids / amounts |
| `supabase/tests/referral_admin_analytics_proof.sql` | admin-only analytics, user stats, partner comparison, partner program, bookings payment source |
| `supabase/tests/referral_link_clicks_proof.sql` | anonymous link visits: dedupe per browser/day, unknown / inactive / own codes ignored, daily cap, counters for user / partner / admin, table not readable |

Reviews: security review per slice (all blocking findings fixed, re-reviewed), fidelity review of the whole ticket against the DoD (must-fixes applied in slice 6).

## Test-plan run (2026-10-13, `docs/NCLDD-56-test-plan.md`)

**§2.1 automated (pre-deploy):** lint 0 errors (32 pre-existing warnings) · `npm run test` 1209 / 1209 (188 files, incl. A1–A7) · build pass · typecheck 182 (unchanged, pre-existing) · 7 SQL proofs on PGlite: all `ALL PASS`.

**§2.2 gaps added (all green, no product bugs found):**

| # | File | Tests |
|---|---|---|
| A1, A2 | `supabase/functions/stripe-webhook/index.test.ts` (+ `frontend/src/test/stubs/npmStripe.ts`) | 9 — replayed event / same invoice under new event id → one payment + one credit; failed handling releases the event row; refund / dispute created / closed won+lost use the charge re-fetched from Stripe |
| A3 | `supabase/functions/_shared/kotaReadEligibility.test.ts` | 14 — Free + `referral_credit` upcoming booking allowed once (409 after brief exists); past / cancelled → 409; Free without credit or group session → 403; Pro/Premium unchanged. Eligibility extracted from `generate-kota-read/index.ts` into `_shared/kotaReadEligibility.ts` (same behavior) |
| A4 | `frontend/src/components/shell/SignupPopup.referral.test.tsx` | 7 — `?ref=` survives navigation, first code wins, cleared after signup, kept on failed signup, invalid / tampered code dropped silently |
| A5 | `frontend/src/components/AppSidebar.referrals.test.tsx` | 9 — Invite a friend for regular + enterprise users; Partner portal only when `is_my_referral_partner` is `true`; `/partner` redirects non-partners |
| A6 | `frontend/src/components/coach/BookCoachCard.test.tsx` | 7 — referral credit hint for 1:1 (also before Premium credits), Free with 0 credits → paywall, credit never unlocks group sessions, balance used only by the 1:1 booking card |
| A7 | `frontend/src/components/settings/admin/AdminReferralPartnersTab.test.tsx` | 8 — sort by sign-ups / paying / commission desc→asc; partner without terms shows "Terms not set" / "No terms", no amount |
| A8 | `scripts/referral_isolation_smoke.mjs` | written, **not run** — needs deployed migrations + test users |

**Notes from the run:**
- HR-only (employer-portal) users see only Settings in the sidebar, so no "Invite a friend" — existing sidebar design, product call whether the plan's "every user" includes them.
- UI wording for missing terms is "Terms not set" / "No terms" (plan says "not confirmed").
- Partner portal sidebar item appears after reload if an account is linked mid-session (per-load cache).
- Spend order (referral credit before Premium credits) is server-side (`confirm_one_on_one_booking`) — covered by `one_on_one_referral_credit_proof.sql`, not by A6.
- Pro/Premium can regenerate Kota's Read (and re-email the coach) — pre-existing behavior.

**Deploy (2026-10-13, `szkextipgpupqoppccoy`):** pre-checks 0 / 0 / 0 · migrations `20261013150000…200000` applied (by the developer) · `stripe-webhook` and `generate-kota-read` deployed (unsigned webhook POST → 400, Kota's Read without auth → 401) · `types.ts` regenerated (typecheck still 182, lint 0 errors, build pass) · frontend on https://uncloud360.vercel.app already ships the NCLDD-56 bundle (auto-deploy from `main`).

**SQL proofs on hosted Supabase:** all 7 `ALL PASS` (also re-run green on PGlite). Two harness differences were fixed in the proofs, not in the migrations:
- New private tables (`referralAttribution`, `billingInvoicePayment`, `referralCoachCreditLedger`, `referralPartnerTerms`, `referralPartnerCommission`, `referralLinkClick`) have **no `SELECT` grant for `authenticated`** on hosted Supabase (no default privileges), so direct reads give `42501` instead of 0 rows — stricter than designed. The proofs now accept either. Consequence: the "Settings admin selects …" RLS policies are inert; nothing uses them (admin UI reads through SECURITY DEFINER RPCs), so no functional impact.
- Hosted signup creates a `userSubscription` row, so the 1:1 proof upserts it.
- Function grants checked: payment RPCs (`referral_record_invoice_payment`, `referral_record_payment_reversal`) not executable by `anon` / `authenticated`; user RPCs not executable by `anon`; only `record_referral_link_click` is open to `anon` (by design).

**A8 (2026-10-13, production, seeded `ncldd56-*@test.com` accounts via `scripts/seed_ncldd56_referral_test_users.mjs`):** **ALL PASS** — M-48 own overview only, masked invitees, REF-B sees none of REF-A's invitees; M-49 / M-34 portal only for PARTNER-1, no emails / foreign ids, `null` for REF-A and USER-X; M-50 all admin referral RPCs `42501` for four non-admins (`admin_list_coaching_bookings` keeps its pre-NCLDD-56 `{ ok: false, code: 'forbidden' }` contract, no data); M-51 anon `42501`; M-52 direct select on all six private tables `42501`; M-53 direct `coachBooking` insert `42501`; admin analytics allowed for ADMIN.

## Manual QA (2026-10-13…14, test environment `uncloud360.vercel.app` + Stripe sandbox)

Sign-ins, sign-ups, Stripe payments / refunds / disputes by the developer; checks in the app and in SQL (read-only, QA accounts only) by Claude. Accounts: seeded `ncldd56-*@test.com`, invitees `78bubbleteam+inv1…6`, partner clients `78bubbleteam+pcl1, pcl1b, pcl2, pcl3`.

| Case | Result | Evidence |
|---|---|---|
| M-01, M-02 | Pass | sidebar item → `/invite`; link, code, copy, credits, history, invitees, rules |
| M-03 | Fail → fixed | copied link pointed at `uncloud360.ai` (does not serve the app) — **B-1**, fixed in `d5d3c71`; retest: `…vercel.app/signup?ref=QAREFA56` |
| M-04 | Pass | same code after reload / re-login |
| M-05, M-10, M-12, M-20, M-24 | Pass (SQL proofs on prod) | direct REST writes were not run from the browser; covered by `referral_attribution_protection_proof`, `referral_rewards_ledgers_proof`, `one_on_one_referral_credit_proof` |
| M-06 | Pass | USER-X: empty `/invite`, no errors |
| M-07 | Pass | INV-1 listed as "Testa L." (email confirmation is off in this env, so the "awaiting confirmation" status could not be seen) |
| M-08 | Pass | `?ref` survived /pricing → /login → /signup |
| M-09 | Pass | `john.doe@x.io` shown as "Friend"; no surname / email in DOM. Cyrillic names are rejected by onboarding validation (pre-existing, not NCLDD-56) |
| M-11 | Pass (A4) | invalid code dropped silently |
| M-13 | Fail → fixed | live `invoice.paid` had no `subscription`/`charge` (newer endpoint API version) and arrived before `checkout.session.completed` → no payment row, no credit — **B-2**, fixed in `9d23119` (re-read invoice with pinned API version, user from synced subscription). Retest INV-3: +1 credit. Only INV-1's two test invoices were affected |
| M-14 | Pass | Resend `evt_1UQ7rT6…` → still 1 credit, 1 payment row |
| M-15 | Pass | INV-3 Pro → Premium (`subscription_update`, 4873¢) → still 1 credit for INV-3 |
| M-16 | Pass | INV-4 Premium → total 2 |
| M-17 | Pass | INV-5 full refund → `reversal −1`, `refundedCents 2900` |
| M-18 | Pass | all credits spent, INV-4 refunded → `reversal 0`, balance 0 (not negative), bookings kept; first later cancel settled the reversal. Cancel toast blamed the 24h rule — **B-3**, fixed in `b3caaca` |
| M-19 | Pass | INV-6 card `…0259`: credit reversed on payment (charge state re-read in `invoice.paid`), restored on `charge.dispute.closed` (won) |
| M-21, M-22 | Pass | Free REF-A booked Coach QA Alpha with a referral credit: `paymentSource=referral_credit`, `redemption −1`, Kota's Read generated |
| M-23 | Pass | cancel 3 days ahead → "credits were returned", balance back |
| M-25, M-26 | Pass (A6 + SQL proof) / Pass | no referral credit offered in chat / voice; spend order is server-side |
| M-27 | Pass | Free with 0 credits → Premium upgrade dialog |
| M-28…M-30 | Pass | 1 visit; same browser and owner visits not counted |
| M-31 | Pass | visits shown separately from sign-ups (user profile, partner list) |
| M-32, M-33 | Pass | link by email → "Portal account linked"; unknown email → clear error |
| M-34 | Pass | portal item only for linked partners; USER-X / unlinked PARTNER-1 redirected from `/partner` |
| M-35 | Pass | PARTNER-1 portal: link, code, terms in words, 2 sign-ups / 2 paying, $5.80 net, per-client amounts, masked names |
| M-36 | Pass | PCL-1b Pro → commission 20% × $29 = $5.80 (`accrued`). PCL-1 signed up without the link (operator error) |
| M-37 | Pass (by M-14 + A1 + SQL proof) | same idempotency path; Stripe Resend for partner invoice not repeated |
| M-38 | Pass | PCL-2 full refund → `reversedCents 580` |
| M-39 | Pass | PARTNER-2: "not confirmed", "Not calculated", "1 payment … isn't counted" |
| M-40 | Pass | admin confirmed 10% lifetime from 2026-10-14 → history row, pending payment priced $2.90 |
| M-41 | Pass | unlink → PARTNER-1 loses the portal item, `/partner` redirects |
| M-42 | Pass (SQL proofs) | partner-wins covered by `referral_rewards_ledgers_proof` / `referral_overview_proof` |
| M-43 | Pass | REF-A Referral activity: invited 5, registered 5, paid 4, earned 4, taken back 2, available 2, visits 2 |
| M-44 | Pass | sort by sign-ups / paying / commission asc + desc |
| M-45, M-46, M-47 | Pass | partner detail (commissions by client, terms history, account); admin bookings show "Referral credit"; old dashboard / referred-users table work |
| M-48…M-53 | Pass (A8) | see above |
| M-54 | Pass | USER-X redirected from `/admin/referral-partners`, `/admin/bookings` |

**Fixed during QA:** B-1 referral links on a dead domain (`d5d3c71`), B-2 referral payments lost for newer Stripe event shapes (`9d23119`, webhook redeployed), B-3 misleading cancel toast (`b3caaca`); A6 test broken by regenerated types (`b3caaca`).

**Notes (not fixed, low):** dates follow the browser locale ("13 октября 2026 г.") while copy is English — app-wide; "since … г.." double period in admin / portal; a fully refunded partner client still shows "Paying client" and a refunded invitee "Credit earned"; console 404s on `/admin/analytics` (pre-existing requests, page works).

**Ops:** the Stripe endpoint did not deliver `charge.dispute.created` during M-19 — confirm `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed` are all enabled (test + live). Test data left in place: `ncldd56-*` accounts, `78bubbleteam+*` users, QA partners One / Two (10% terms) / Three (linked to partner-3), PARTNER-1 now unlinked.

## Deploy checklist

1. PM review, then run the read-only pre-checks in the headers of `20261013150000` and `20261013160000` (each must return 0).
2. Apply in order: `20261013150000` → `160000` → `170000` → `180000` → `190000` → `200000`.
3. Run the seven proofs above in the SQL editor (expect `… ALL PASS`).
4. Regenerate `frontend/src/integrations/supabase/types.ts` (UTF-8, see T-021), re-run typecheck.
5. Deploy `stripe-webhook` right after the migrations (a webhook deployed before them fails every `invoice.paid`), and `generate-kota-read` (it selects `coachBooking.paymentSource`).
6. Stripe endpoint (test + live): enable `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
7. Deploy the frontend.

## Live QA checklist (after deploy)

Mapped to the ticket's QA checklist. Not run yet.

- [ ] "Invite a friend" in the user sidebar → `/invite`; "Partner portal" only for a linked partner account → `/partner` (others redirected).
- [ ] Copy the user link, sign up a test invitee, confirm attribution (invitee listed as "First L.", status changes after email confirmation).
- [ ] Pay Pro (Stripe test) as the invitee → referrer gets exactly one credit; resend the `invoice.paid` event → no second credit. Repeat with Premium for another invitee.
- [ ] Book a 1:1 coach session with the referral credit on a Free account (Kota's Read is generated for the coach); cancel 24h+ → credit returns; credit is never offered for AI sessions.
- [ ] Open the referral link in a fresh browser → "link visits" grows by 1 (once per day); the owner's own visit doesn't count.
- [ ] Admin links a partner to a confirmed account; partner link signup + paid invoice → commission row; with terms confirmed the portal shows the amount, without terms it shows "not confirmed" / "Not calculated".
- [ ] Full refund in Stripe → commission reversed, B2C credit removed if unused.
- [ ] Direct requests: another user / partner gets only their own data (`get_my_referral_overview`, `get_my_referral_partner_portal`); admin RPCs return 42501 for non-admins.
- [ ] Admin user profile → Referral activity numbers; Referral Partners list sorting by sign-ups / paying / commission; existing partner CRUD, dashboard and referred-users table still work.
